# Men's Evolution — MVP navegável

Protótipo mobile em React Native + Expo para Android, iOS e web. Esta primeira entrega demonstra a navegação, painel diário, rotina com hábitos marcáveis, visão de progresso e perfil.

## Executar

1. Instale Node.js LTS e Expo Go no celular, ou configure um emulador.
2. Nesta pasta, execute `npm install`.
3. Execute `npm run start` e abra o QR code com Expo Go.
4. Para visualizar no navegador, execute `npm run web`.

## Conta e sincronização

O app continua funcionando sem conta e mantém perfil e progresso localmente. Para ativar cadastro, entrada e sincronização:

1. Crie um projeto Supabase e copie a URL do projeto e a chave **publishable** (nunca use a `service_role` no app).
2. Duplique `.env.example` como `.env` e preencha `EXPO_PUBLIC_SUPABASE_URL` e `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
3. No painel do Supabase, abra o SQL Editor e execute `supabase/migrations/20261122000100_account_sync.sql`.
4. Reinicie o Expo para carregar as variáveis. No Perfil, toque em **Preparar conta** para criar uma conta ou entrar.

O login sincroniza o perfil e até 90 dias de progresso recente. A aba Evolução mostra os registros dentro dos últimos 30 dias corridos no plano gratuito; o histórico completo fica reservado para um Premium futuro. As políticas RLS limitam cada conta aos próprios registros. O progresso continua salvo no aparelho e disponível offline.

## Análise visual

A tela **Análise** exige uma conta conectada, consentimento explícito e uma foto JPEG de até 8 MB. Ela envia a imagem ao bucket privado `analysis-photos`, chama a função `analyze-appearance` no Supabase e apaga o arquivo temporário após o processamento. O histórico guarda apenas o resultado; cada resultado pode ser apagado pelo próprio usuário. Há um limite inicial de três solicitações em 24 horas.

Para ativar a análise visual no projeto Supabase:

1. A migração `supabase/migrations/20261122000200_appearance_analysis.sql` já foi aplicada no projeto Supabase conectado.
2. Em **Project Settings → Edge Functions → Secrets**, adicione `OPENAI_API_KEY`. Use uma chave da API da OpenAI; não a coloque no `.env` do app nem no repositório.
3. Autentique o Supabase CLI, vincule-o ao projeto e publique `analyze-appearance` com `npx supabase functions deploy analyze-appearance`. A função `erase-synced-data` já está publicada.
4. Reinicie o Expo. A leitura usa a Responses API com `gpt-4o-mini`; a chamada acontece somente na função do servidor.

O app não envia a foto sem a caixa de consentimento marcada. O resultado oferece observações e ideias de apresentação pessoal; não pontua aparência nem faz diagnósticos.

No Perfil, **Apagar dados da nuvem** remove perfil sincronizado, progresso, resultados de análise e arquivos temporários privados, sem excluir a conta nem os dados locais. A função já está publicada no projeto conectado. Após a remoção, a sincronização fica pausada neste aparelho; o usuário pode retomá-la manualmente. Outros aparelhos podem manter dados locais e reenviá-los quando sincronizarem.

## Escopo desta entrega

- Interface demonstrativa editorial e experimental: retrato de campanha, recortes orgânicos, tipografia condensada, verde e laranja, sem conjunto de ícones genérico.
- Navegação entre Início, Rotina, Evolução e Perfil.
- Primeira entrada com nome e foco escolhido; o perfil pode ser ajustado depois e fica salvo localmente no aparelho.
- Hábitos e missão concluída ficam salvos localmente por dia e continuam marcados ao reabrir o app.
- A edição diária combina uma imagem autoral e uma missão correspondente. Há 30 combinações; a ordem é embaralhada por mês, fica estável durante o dia e percorre as 30 sem repetição antes de recomeçar. No dia 31, a primeira combinação do ciclo volta.
- A revelação da missão tem entrada animada; a evolução mostra uma árvore de fases tocável.
- Conta por e-mail e senha e sincronização de perfil/progresso recente estão implementadas; exigem as variáveis do Supabase e a migração SQL acima.
- O Perfil permite escolher português brasileiro, inglês ou espanhol. A escolha fica salva neste aparelho; datas, semana, interface, missões e novas leituras visuais acompanham o idioma selecionado.
- Em **Perfil → Preferências → Lembretes**, a pessoa pode ativar um aviso diário para beber água, escolher entre quatro horários e desligá-lo quando quiser. É uma notificação local, salva no aparelho e solicitada somente após tocar em ativar.
- A aba Evolução exibe até 30 dias do histórico local e sincronizado.
- Pagamentos e chamadas de IA para outras funções ainda não estão conectados.
- Os números exibidos são demonstrativos.
