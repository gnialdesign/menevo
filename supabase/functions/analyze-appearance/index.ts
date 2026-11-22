import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const maxPhotoBytes = 8 * 1024 * 1024;
const analysisSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    headline: { type: 'string' },
    observations: { type: 'array', items: { type: 'string' }, minItems: 2, maxItems: 3 },
    suggestions: {
      type: 'array',
      minItems: 3,
      maxItems: 3,
      items: {
        type: 'object',
        additionalProperties: false,
        properties: { title: { type: 'string' }, detail: { type: 'string' } },
        required: ['title', 'detail'],
      },
    },
    reminder: { type: 'string' },
  },
  required: ['headline', 'observations', 'suggestions', 'reminder'],
};

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

function toBase64(bytes: Uint8Array) {
  let binary = '';
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, Math.min(offset + chunkSize, bytes.length)));
  }
  return btoa(binary);
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: 'Método não permitido.' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const openAiKey = Deno.env.get('OPENAI_API_KEY');
  const authorization = request.headers.get('Authorization');
  if (!supabaseUrl || !anonKey || !serviceRoleKey || !openAiKey) return json({ error: 'Serviço ainda não configurado.' }, 503);
  if (!authorization) return json({ error: 'Entre na sua conta para continuar.' }, 401);

  const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authorization } }, auth: { persistSession: false, autoRefreshToken: false } });
  const { data: userResult, error: authError } = await userClient.auth.getUser();
  const user = userResult.user;
  if (authError || !user) return json({ error: 'Sessão inválida. Entre novamente.' }, 401);

  let body: { analysis_id?: unknown };
  try { body = await request.json(); } catch { return json({ error: 'Solicitação inválida.' }, 400); }
  const analysisId = typeof body.analysis_id === 'string' ? body.analysis_id : '';
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(analysisId)) return json({ error: 'Identificador inválido.' }, 400);

  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: record, error: recordError } = await admin.from('appearance_analyses').select('id,user_id,status,consent_at').eq('id', analysisId).maybeSingle();
  if (recordError) return json({ error: 'Não foi possível abrir esta análise.' }, 500);
  if (!record || record.user_id !== user.id || !record.consent_at) return json({ error: 'Análise não encontrada.' }, 404);
  if (record.status !== 'pending') return json({ error: 'Esta análise já foi processada.' }, 409);

  const photoPath = `${user.id}/${analysisId}.jpg`;
  try {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count, error: countError } = await admin.from('appearance_analyses').select('id', { count: 'exact', head: true }).eq('user_id', user.id).in('status', ['pending', 'completed']).gte('created_at', since);
    if (countError) throw new Error('Não foi possível validar o limite de uso.');
    if ((count ?? 0) > 3) {
      await admin.from('appearance_analyses').update({ status: 'failed' }).eq('id', analysisId);
      return json({ error: 'Você já fez três leituras nas últimas 24 horas. Tente novamente amanhã.' }, 429);
    }

    const { data: photo, error: photoError } = await admin.storage.from('analysis-photos').download(photoPath);
    if (photoError || !photo) throw new Error('Não foi possível acessar a foto temporária.');
    if (photo.size > maxPhotoBytes) throw new Error('A foto ultrapassou o limite permitido.');
    const bytes = new Uint8Array(await photo.arrayBuffer());
    const imageUrl = `data:image/jpeg;base64,${toBase64(bytes)}`;

    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { Authorization: `Bearer ${openAiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        store: false,
        max_output_tokens: 700,
        input: [{
          role: 'user',
          content: [
            { type: 'input_text', text: 'Responda em português brasileiro. Faça uma leitura respeitosa de apresentação pessoal baseada somente no que está visível: combinação de roupa, cabelo/barba quando visíveis, enquadramento, pose e iluminação. Nunca identifique a pessoa, infira identidade, idade, etnia, personalidade, saúde ou condição médica. Não dê nota de beleza, não critique o corpo e não faça diagnóstico dermatológico. Se algo não estiver visível, diga isso com naturalidade e adapte a sugestão. Dê 2 ou 3 observações concretas e exatamente 3 experiências simples, opcionais e de baixo custo; não pressione compras. Cada sugestão deve ter um título curto e um detalhe prático. A resposta deve soar humana, positiva sem exagero e útil.' },
            { type: 'input_image', image_url: imageUrl, detail: 'high' },
          ],
        }],
        text: { format: { type: 'json_schema', name: 'appearance_advice', strict: true, schema: analysisSchema } },
      }),
      signal: AbortSignal.timeout(55_000),
    });
    if (!response.ok) throw new Error(`Serviço de análise respondeu ${response.status}.`);
    const payload = await response.json();
    const outputText = (payload.output ?? []).flatMap((item: { content?: { type?: string; text?: string }[] }) => item.content ?? []).filter((item: { type?: string }) => item.type === 'output_text').map((item: { text?: string }) => item.text ?? '').join('');
    if (!outputText) throw new Error('A resposta da análise veio vazia.');
    const result = JSON.parse(outputText) as Record<string, unknown>;
    const { error: saveError } = await admin.from('appearance_analyses').update({ status: 'completed', result, completed_at: new Date().toISOString() }).eq('id', analysisId).eq('user_id', user.id);
    if (saveError) throw new Error('Não foi possível salvar o resultado.');
    return json({ ok: true });
  } catch (error) {
    await admin.from('appearance_analyses').update({ status: 'failed' }).eq('id', analysisId).eq('user_id', user.id);
    console.error('Appearance analysis failed:', error instanceof Error ? error.message : 'unknown error');
    return json({ error: 'Não foi possível concluir a leitura. Confira a foto e tente novamente.' }, 502);
  } finally {
    const { error } = await admin.storage.from('analysis-photos').remove([photoPath]);
    if (error) console.error('Temporary analysis photo cleanup failed.');
  }
});
