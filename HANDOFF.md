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

Ainda não houve subagente da PWI0 neste checkpoint. Cada delegação deve registrar aqui: nome, escopo, arquivos inspecionados/alterados, achados, validação, o que foi incorporado e o que foi rejeitado pelo agente principal.

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
