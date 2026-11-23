# Men's Evolution — especificação do MVP

## Produto

Aplicativo para apoiar homens na apresentação pessoal, cuidados, hábitos e acompanhamento da própria evolução. A experiência deve ser respeitosa, prática e sem notas absolutas de beleza ou promessas médicas.

## Decisões já definidas

- Plataformas: Android e iOS, com uma versão web útil para prévia.
- Acesso: freemium, com limites ajustáveis e sem preço definido antes de medir custos.
- IA: OpenAI, chamada somente pelo servidor.
- Idiomas planejados: português brasileiro, inglês e espanhol.
- Primeira entrega: MVP para uso pessoal e futura oferta comercial.

## MVP de produto

1. Cadastro e perfil: nome e foco inicial são coletados na primeira entrada e podem ser alterados no perfil. Perfil e progresso funcionam localmente; cadastro por e-mail e senha e sincronização com Supabase estão conectados.
2. Análise visual: fotografia enviada com consentimento, observações visíveis e sugestões práticas.
3. Rotina: cuidados de pele, cabelo e barba, tarefas diárias e conclusão de hábitos.
4. Descoberta diária: uma edição junta imagem e missão correspondente entre 30 combinações de autocuidado, estilo, movimento, hidratação, ambiente e reflexão. A ordem é embaralhada deterministicamente por mês, cada edição permanece estável durante o dia e cada mês percorre as 30 sem repetição; em meses de 31 dias, a primeira edição reaparece no último dia. Tem revelação animada e opção de marcar como feita, sem alterar os hábitos fixos.
5. Evolução: metas, histórico, progresso de hábitos e uma árvore de fases; comparação visual opcional e autorizada.

## Comunidade — ideia para validar depois do MVP

- Começar com um desafio coletivo semanal e participação opcional.
- Mostrar o progresso agregado do grupo, sem ranking público nem fotos públicas.
- Testar primeiro com um grupo pequeno, depois de validar a rotina e as missões diárias.
- Definir regras, denúncia e moderação antes de abrir a participação para todos.
- A comunidade não faz parte da primeira entrega do MVP.

## Arquitetura planejada

- Aplicativo: React Native + Expo + TypeScript.
- Identidade e dados: Supabase Auth, PostgreSQL e Storage privado.
- IA: função de servidor/Edge Function que valida a sessão, aplica limites do plano e chama a OpenAI.
- Privacidade: Row Level Security por usuário, consentimento explícito, coleta mínima, exclusão de fotos e resultados sob solicitação.
- Internacionalização: catálogos de mensagens por idioma; datas, unidades e moeda adaptadas à região.

## Modelo inicial de dados

- `profiles`: preferências, objetivos e dados de perfil.
- `analyses`: solicitações e resultados, vinculados ao usuário.
- `routines` e `routine_tasks`: planos e hábitos.
- `progress_logs`: registros de conclusão e marcos.
- `subscriptions`: plano e limites de uso.
- `user_consents`: consentimentos e respectivas datas.

Todas as tabelas com dados pessoais devem restringir leitura e escrita ao usuário autenticado. Fotografias devem ficar em armazenamento privado e usar links temporários quando necessário.

## Freemium inicial

| Recurso | Gratuito | Premium futuro |
| --- | --- | --- |
| Perfil e rotina básica | Incluído | Incluído |
| Análise visual | Uma análise inicial | Análises adicionais |
| Histórico | Últimos 30 dias | Completo (futuro) |
| Assistente de IA | Uso limitado | Limite ampliado |

Os limites, preços e custos por análise ainda precisam ser medidos. Pagamentos não fazem parte desta primeira entrega.

## Próximas etapas

1. Validar identidade visual, animações e fluxo com o usuário.
2. Concluído em parte: onboarding, edição de perfil, autenticação por e-mail/senha e sincronização do perfil e do histórico recente com Supabase, protegidos por RLS.
3. Adicionar tradução real para português, inglês e espanhol.
4. Concluído em parte: tabelas `profiles`, `daily_progress` e `appearance_analyses`, políticas RLS e bucket privado de fotos temporárias estão aplicados no Supabase conectado.
5. Implementado no app e no servidor: análise visual com consentimento, limite de uso, função Supabase, armazenamento privado e remoção da foto temporária. Falta configurar `OPENAI_API_KEY` como segredo e publicar a função `analyze-appearance`.
6. Concluído em parte: perfil, hábitos, missão e histórico recente ficam salvos localmente e sincronizados quando há conta. A aba Evolução exibe registros dos últimos 30 dias corridos no plano gratuito; a conta busca até 90 dias para sincronizar entre aparelhos. O Perfil permite apagar os dados sincronizados; a função de exclusão está publicada e pausa a sincronização neste aparelho.
7. Medir custo real antes de definir limites Premium e pagamentos.
