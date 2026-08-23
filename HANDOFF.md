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
5. Backend não terá store de replay de produção nesta etapa; ausência dele fora de teste responde `503 replay_store_unavailable`.

## Próximos passos exatos

1. Delegar inventários read-only e delimitados: padrão de API/autorização/testes do portal; opções de WIF/OIDC compatíveis com Vercel; contrato mínimo do endpoint/replay no Data Hub.
2. Revisar os inventários no agente principal e fechar a arquitetura local sem provisionar recursos.
3. Implementar primeiro o endpoint sintético e testes no Data Hub em branch própria.
4. Implementar helper server-side e BFF agregado no portal, com testes de sessão, allowlist, payload, ausência de efeitos e sanitização.
5. Incluir `/data-hub` na regressão da casca privada sem criar UI conectada.
6. Rodar testes focados, typecheck e build dos dois repositórios.
7. Atualizar este arquivo após cada bloco e antes de qualquer troca de branch, commit, push, Preview ou deploy.

## Gates externos ainda fechados

- Criar/alterar WIF pool/provider, service account ou IAM.
- Configurar variáveis Preview.
- Publicar Preview, fazer merge ou produção.
- Ativar Scheduler, escrever em Sheets ou criar schedule real.

O GO vigente autoriza avançar sem interrupções até surgir uma escolha de produto/identidade/credencial que não possa ser inferida com segurança. Mesmo com esse GO, local, push, merge, Preview e produção devem continuar registrados como estados distintos.
