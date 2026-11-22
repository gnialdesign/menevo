import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: 'Método não permitido.' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const authorization = request.headers.get('Authorization');
  if (!supabaseUrl || !anonKey || !serviceRoleKey) return json({ error: 'Serviço ainda não configurado.' }, 503);
  if (!authorization) return json({ error: 'Entre na sua conta para continuar.' }, 401);

  const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authorization } }, auth: { persistSession: false, autoRefreshToken: false } });
  const { data: userResult, error: authError } = await userClient.auth.getUser();
  const user = userResult.user;
  if (authError || !user) return json({ error: 'Sessão inválida. Entre novamente.' }, 401);

  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const photoPaths: string[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data: photos, error: listError } = await admin.storage.from('analysis-photos').list(user.id, { limit: 1000, offset });
    if (listError) return json({ error: 'Não foi possível revisar os arquivos da conta.' }, 500);
    photoPaths.push(...(photos ?? []).map((photo) => `${user.id}/${photo.name}`));
    if ((photos ?? []).length < 1000) break;
  }

  for (let offset = 0; offset < photoPaths.length; offset += 100) {
    const { error: removeError } = await admin.storage.from('analysis-photos').remove(photoPaths.slice(offset, offset + 100));
    if (removeError) return json({ error: 'Não foi possível remover todos os arquivos privados.' }, 500);
  }

  const deletionResults = await Promise.all([
    admin.from('appearance_analyses').delete().eq('user_id', user.id),
    admin.from('daily_progress').delete().eq('user_id', user.id),
    admin.from('profiles').delete().eq('user_id', user.id),
  ]);
  if (deletionResults.some(({ error }) => error)) {
    console.error('Synced data deletion was incomplete for user:', user.id);
    return json({ error: 'Não foi possível remover todos os dados sincronizados.' }, 500);
  }

  return json({ ok: true, account_kept: true, local_data_kept: true });
});
