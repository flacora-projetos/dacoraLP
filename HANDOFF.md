# HANDOFF — Data Hub no portal Dácora (PWI0)

Atualizado: 2026-08-23

## Objetivo

Implementar a PWI0 do Dácora Data Hub no portal: contrato e spike local do canal de confiança `browser autenticado → BFF Vercel → Cloud Run privado`, com ator derivado exclusivamente da sessão server-side, envelope sanitizado, audiência exata e proteção contra replay. Esta fase não cria UI conectada, não escreve em Sheets, não altera relatórios/RA e não torna o Cloud Run público.

## Estado Git e workspaces

- Repositório do portal: `C:\Users\Flávio Corá\Documents\PROJETOS PARTICULARES\SITE DACORA LP\repo`.
- Branch desta frente: `feat/data-hub-pwi0`, criada de `main/4c2d7ba`.
- No bootstrap, `main` estava limpa e sincronizada com `origin/main`; havia um único worktree registrado.
- Repositório do backend: `C:\Users\Flávio Corá\Documents\PROJETOS PARTICULARES\Dacora Data Hub`.
- Backend fechado até `main/3696d38`; Cloud Run em `dacora-data-hub-00008-fw8`, Scheduler intencionalmente `PAUSED`.
- Não tocar na frente RA, em decisões/envios de relatórios, no Supabase remoto ou em workspaces de outros agentes.

## Fontes canônicas lidas

- `AGENTS.md` e `CLAUDE.md` do portal, integralmente.
- `docs/PAINEL_PROGRESSO.md`: consultado no bootstrap; a frente Data Hub não deve alterar contratos do painel de relatórios.
- `Dacora Data Hub/docs/PLANO_PORTAL_WEB_INTERNO.md`, integralmente, especialmente a especificação executável da PWI0.
- `Dacora Data Hub/HANDOFF.md`: Fase 5 concluída; PWI0 é a próxima frente.

## Progresso atual

1. Bootstrap do portal confirmado: branch, HEAD, status, remoto e worktrees.
2. PWI0 separada das responsabilidades do painel/RA.
3. Inventário inicial encontrou o helper canônico `api/_painel-autorizacao.ts`, APIs Vercel em `api/`, casca privada em `dist/app.html` e verificadores estruturais em `scripts/`.
4. Nenhum recurso externo, IAM, WIF, Preview, deploy ou chamada ao Data Hub foi realizado nesta frente.

## Contrato e limites da PWI0

- `POST /api/data-hub-spike` aceita apenas JSON vazio ou schema versionado estreito.
- Sessão Supabase + allowlist são validadas antes de qualquer token ou chamada downstream.
- Ator, request ID e nonce são gerados/derivados no servidor; valores equivalentes do browser não são confiáveis.
- O BFF obtém credencial curta via WIF e solicita ID token Google com audiência exata do Cloud Run.
- A resposta pública contém somente estado, código estável e request ID.
- O endpoint sintético do Data Hub deve ter store de replay injetável; memória serve somente para teste local. Preview exige persistência com read-back.
- Sem chave JSON, bearer do Saldos MCP no portal, Cloud Run público ou segredo no bundle.
- CORS restrito, payload limitado e logs sem token, cookie ou link completo de planilha.

## O que funcionou até aqui

- A reutilização de `conferirAcesso` é o caminho existente para sessão Google via Supabase e allowlist server-side.
- O portal já possui padrão de verificadores `tsx` que dublam somente dependências externas e contam efeitos downstream.
- A casca privada e o teto de funções serverless já possuem regressões; `/data-hub` deverá entrar sem criar uma nova função por tela.

## O que não deve ser repetido

- Não inferir que WIF, sozinho, produz ID token aceito pelo Cloud Run; o spike deve provar a troca completa.
- Não usar Preview ou produção como substituto de testes locais.
- Não alterar o Saldos MCP para viabilizar o portal.
- Não reutilizar ou modificar contratos de decisão, aprovação, recusa, envio ou RA.

## Registro de subagentes

### `pwi0_portal_inventory` — concluído, somente leitura

- Escopo: autorização, padrões de API/teste, casca privada e teto de funções.
- Achados incorporados: reutilizar `conferirAcesso`; import relativo `.js`; dublar apenas `fetch`; `Cache-Control: no-store`; incluir `/data-hub` na casca privada; rodar `verifica:av4` para preservar o teto.
- Achado crítico: já existem 12 funções públicas e a 13ª falhou em deploy anteriormente. Criar literalmente `api/data-hub-spike.ts` quebraria a proteção atual.
- Decisão principal: manter a URL pública `/api/data-hub-spike`, mas reescrevê-la para um modo explícito da função `painel-sessao`, com lógica isolada em helper `_data-hub-spike.ts`. Assim o contrato externo é preservado sem criar a 13ª função.
- Nenhum arquivo foi alterado pelo subagente.

### `pwi0_wif_research` — concluído, somente leitura

- Escopo: documentação oficial Vercel e Google sobre OIDC → STS/WIF → IAM Credentials → Cloud Run.
- Achados incorporados: token runtime vem de `@vercel/oidc`; STS usa `PROJECT_NUMBER` e audience completa do provider; `generateIdToken` usa `projects/-/serviceAccounts/...`; audiência final é a URL `run.app`; Preview e Production precisam identidades/condições separadas.
- Dependências candidatas: `@vercel/oidc` e `google-auth-library` 7.0.2+, sempre server-side. A versão será fixada pelo lockfile antes do teste.
- Limite confirmado: o exemplo Vercel gera access token para APIs Google, mas o spike ainda precisa provar explicitamente `generateIdToken` e a aceitação pelo Cloud Run.
- Nenhuma chamada externa mutante foi feita.

### `pwi0_backend_inventory` — concluído, somente leitura

- Escopo: rota sintética, OIDC por rota, replay, CORS e encaixe sem efeitos analíticos.
- Achados incorporados: nova rota `POST /internal/v1/portal/pwi0`; policy OIDC `portal`; ator somente dos claims; `X-Request-Id`; payload `{}` ou `{schemaVersion:"1.0.0"}`; digest canônico; replay store injetável; envelope estável; nenhum acesso a BigQuery, Firestore, Tasks ou Saldos.
- Ajuste da revisão principal: chamadas BFF servidor-servidor sem `Origin` serão aceitas. `Origin` presente e desconhecida será recusada; preflight só responderá a origens configuradas. Exigir `Origin` do BFF seria confiar num header sintetizado e desnecessário. OIDC continua obrigatório em todas as chamadas efetivas.
- Store em memória será somente de teste; Preview deve falhar fechado até existir store persistente com read-back.
- Nenhum arquivo foi alterado pelo subagente.

## Decisões fechadas antes da implementação

1. Dois commits/branches separados por repositório; backend primeiro, portal depois.
2. Nenhum provisionamento, Preview ou deploy enquanto o gate local não estiver verde e documentado.
3. Portal mantém 12 funções: rewrite exato `/api/data-hub-spike` → modo PWI0 de `painel-sessao`.
4. O helper WIF será puro/injetável nos testes; nenhum token real será obtido no gate local.
5. Backend agora possui store transacional de replay na coleção isolada `portal_replay_claims`; sua efetividade externa ainda exige deploy, principal OIDC configurado e read-back em Preview.

## Checkpoint de implementação local — 2026-08-23

- Dependências oficiais adicionadas: `@vercel/oidc` e `google-auth-library`; lockfile atualizado. O alerta transitivo de `nanoid` foi corrigido para `3.3.18` e `npm audit --audit-level=high` retornou zero vulnerabilidades.
- `api/_data-hub-spike.ts` implementa Vercel OIDC → STS/WIF → IAM Credentials `generateIdToken` → Cloud Run, sempre server-side, com request ID UUID gerado no servidor e resposta sanitizada.
- `api/painel-sessao.ts` ganhou modo isolado `data-hub-spike`, mantendo o contrato normal de sessão e validando sessão/allowlist antes do helper.
- `vercel.json` preserva o teto de 12 funções: `/api/data-hub-spike` reescreve para `painel-sessao`; `/data-hub` usa a casca privada, `noindex`, `no-referrer` e `no-store`.
- `scripts/verifica-data-hub-spike.mts` prova localmente zero downstream sem sessão, rejeição de payload forjado, usuário allowlisted, cadeia de tokens injetável, audience exata e ausência de token/ator na resposta.
- `scripts/verifica-casca-privada.mjs` agora inclui `/data-hub` na regressão estrutural.
- Nenhum token real foi obtido, nenhum IAM/WIF foi criado, nenhuma variável externa foi alterada e nenhum Preview/deploy foi executado.

Validações executadas: `npm run verifica:data-hub-spike`, `npm run lint`, `npm run verifica:painel`, `npm run verifica:av4`, `git diff --check` e `npm run build`; todas aprovadas. O build gerou a casca privada e confirmou o roteamento de `/data-hub` sem rastreadores.

## Checkpoint remoto — 2026-08-23

- PR portal `#8` mesclado em `main/edaf47f` com checks Vercel aprovados.
- O merge produziu deployment Production `Ready`; depois da configuração WIF, novas publicações explícitas foram feitas para carregar as variáveis:
  - Preview `dacora-34nnvjiqn-flavio-coras-projects.vercel.app`, `Ready`;
  - Production `dacora-6qqt5mm2m-flavio-coras-projects.vercel.app`, `Ready`, com aliases do projeto.
- Seis variáveis não secretas do canal foram configuradas separadamente para Preview e Production: project number, pool, provider, service account, Cloud Run audience e endpoint. Nenhuma chave JSON ou bearer foi criado ou copiado.
- O projeto local foi vinculado pelo CLI da Vercel; `.vercel/` foi adicionado ao `.gitignore` e deve permanecer fora do Git.
- Smoke sem sessão em Preview e em `www.dacora.com.br/api/data-hub-spike`: HTTP `401`, código `sem_sessao`, `Cache-Control: no-store`; portanto o helper WIF não é alcançado sem autenticação.
- Inspeção de `/data-hub` em Preview confirmou casca privada sem conteúdo institucional; como a UI não pertence à PWI0, o router registra `No routes matched location /data-hub` e a tela fica vazia. Isso é pendência explícita da Fase 6, não regressão silenciosa.
- O smoke autenticado não foi concluído: o navegador isolado não tinha sessão e a única aba conectada do Chrome era a conversa do usuário; ela não foi reutilizada nem inspecionada. Não houve acesso a cookie, localStorage ou token.

Próximo passo único: o usuário abre `https://www.dacora.com.br/painel-de-relatorios` no Chrome conectado, confirma que está autenticado com um e-mail allowlisted e avisa. O agente então executa uma chamada sintética ao endpoint, lê a resposta pública, confirma uma claim em `portal_replay_claims` pelo request ID e repete o mesmo ID no backend para provar `409`, sem criar schedule ou escrever dados analíticos.

### Retomada do smoke autenticado — 2026-08-23

O usuário abriu o painel no Chrome e a sessão allowlisted `flacora@gmail.com` foi confirmada visualmente, sem leitura de cookies, `localStorage` ou token. Como a PWI0 não possuía UI para disparar o endpoint e o agente não deve extrair a credencial do navegador, foi iniciada a branch `feat/data-hub-connection-screen` para criar a primeira tela mínima de `/data-hub`:

- reutiliza exatamente `PainelAuthProvider` e `Portao`;
- envia o bearer Supabase diretamente do frontend para o BFF do mesmo portal;
- body permanece `{}`; request ID, ator, WIF e audience continuam server-side;
- exibe somente sucesso/request ID ou erro sanitizado;
- deixa explícito que o teste não consulta contas, não cria planilha e não agenda atualização.

Atividade delegada `data_hub_ui_test_inventory`: revisão read-only confirmou o padrão de proteção, rewrite agregado, casca privada e os testes estruturais mínimos. A implementação foi feita e revisada pelo agente principal; o subagente não alterou arquivos.

Próximo gate: validar a nova tela localmente, integrar/publicar, pedir confirmação imediatamente antes do clique que transmitirá a sessão ao endpoint e então fazer o read-back Firestore.

## Próximos passos exatos

1. Integrar os commits locais de backend e portal separadamente, preservando os estados remoto/produção distintos.
2. Fazer inventário read-only do IAM/WIF atual com conta e projeto explícitos.
3. Criar somente os vínculos mínimos ausentes: provider condicionado ao projeto/ambiente Vercel, service account invocadora e permissão de geração de ID token.
4. Configurar variáveis somente em Preview e publicar Preview.
5. Executar smoke autenticado com read-back da claim Firestore e replay `409`; confirmar que o Cloud Run permaneceu privado.
6. Só depois decidir merge/produção; nenhuma UI conectada entra na PWI0.

## Gates externos ainda fechados

- Criar/alterar WIF pool/provider, service account ou IAM.
- Configurar variáveis Preview.
- Publicar Preview, fazer merge ou produção.
- Ativar Scheduler, escrever em Sheets ou criar schedule real.

O GO vigente autoriza avançar sem interrupções até surgir uma escolha de produto/identidade/credencial que não possa ser inferida com segurança. Mesmo com esse GO, local, push, merge, Preview e produção devem continuar registrados como estados distintos.
