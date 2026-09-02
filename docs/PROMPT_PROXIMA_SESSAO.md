# Prompt para a próxima sessão — Data Hub Portal

Continue a frente **Data Hub no portal Dácora** a partir do estado de produção de 2026-09-02.

## Antes de agir

1. Carregue o runtime atual do Codex Ninja.
2. Selecione o workspace `@projects/SITE DACORA LP/repo`.
3. Leia por inteiro `AGENTS.md` e `CLAUDE.md`, depois `docs/DATA_HUB_ESTADO_ATUAL.md`.
4. Rode `git fetch origin --prune`, confirme branch/HEAD/status/worktrees e preserve qualquer trabalho preexistente.
5. Não desenvolva diretamente em `main`; se houver mudança de código/docs, crie branch temática a partir de `origin/main` sincronizada.
6. O portal serve outras aplicações além do Data Hub. Não toque em RA, Supabase, relatórios, envio ou outras frentes sem escopo explícito.

## Estado confirmado

- Portal Data Hub publicado em Vercel Production; commit funcional da frente `fa244dc`.
- Merges documentais também geram deployment Vercel; consulte `vercel inspect https://www.dacora.com.br` para o deployment corrente.
- Backend publicado: `dacora-data-hub-00028-t4n`, imagem `runtime:83ca649`, 100% do tráfego.
- Commit backend em produção: `83ca64920a60fd2833e9d05214f3dc414040341e`.
- Rollback backend: `dacora-data-hub-00040-cil`, tag `prehubrec`.
- Scheduler continua `PAUSED`.
- O criador não possui seletor manual de nível. O grão é consequência dos campos selecionados.
- Definições novas usam `selectedFields`; definições legadas preservam o grão materializando a identidade correspondente antes da migração.
- O CRUD `selectedFields` foi provado em produção e a definição temporária daquele smoke foi removida.
- Um smoke Meta real com `selectedFields = [date, campaign_name, spend]` comprovou retorno da Hub Data API e reconciliação independente de `spend=228.21` em `2026-09-01`.
- Esse primeiro run revelou que o caminho Hub não materializava `reconciliation`; a correção entrou na PR backend `#79` e já está em produção na revisão `00028-t4n`.
- O gate E2E completo **ainda não está fechado**: falta run pós-correção até BigQuery + Sheets/read-back.
- Google OAuth do ator retornou `reauthorization_required`; não inventar workaround nem trocar escopos.
- Duas definições temporárias de smoke permanecem no backend/Firestore e devem ser removidas somente com GO explícito.
- Grants temporários de TokenCreator usados na sessão foram revogados; nenhuma chave persistente foi criada.
- O norte continua sendo expansão progressiva rumo às **611 capacidades úteis** do benchmark Stract.

## Próximo objetivo

O próximo gate real é concluir **dados reais pós-correção**:

1. com GO operacional, limpar as duas definições temporárias de smoke no backend;
2. reautorizar a conexão Google existente se necessário;
3. executar uma extração field-centric com work unit inédita e janela curta;
4. confirmar `sync_runs=success/reconciled` e persistência no BigQuery;
5. reconciliar o mesmo período por fonte independente;
6. confirmar export/read-back no Sheets;
7. validar ordem de `selectedFields`, zero versus ausência e ausência de campos não escolhidos;
8. só depois avançar actions em colunas, enriquecimento criativo e matriz 611 × Hub.

## Gates

- Não confundir CRUD de definição nem resposta isolada da Hub Data API com prova E2E completa.
- Merge/push/deploy/produção continuam sujeitos às regras vigentes do projeto e à autorização do PO.
- Não invente contas, IDs, catálogo, payloads ou resultados. Diferencie IMPLEMENTADO, INTEGRADO e PRODUÇÃO.
- Não reduza o catálogo do portal para contornar lacuna do backend; a direção é expandir a fonte canônica do Hub.
- Não tocar nos worktrees/branches de RA ou outras frentes apenas porque aparecem na listagem.

## Arquivos centrais do Data Hub no portal

- `src/pages/DataHub.tsx`
- `src/pages/data-hub-extracoes.tsx`
- `src/pages/data-hub-catalogo.ts`
- `src/pages/data-hub.css`
- `scripts/verifica-painel-data-hub-casca.mts`
- `docs/DATA_HUB_ESTADO_ATUAL.md`

Siga ENTENDER → LOCALIZAR → LER → EXECUTAR → TESTAR → VALIDAR → ENTREGAR. Se Git/produção divergirem deste prompt, Git + respostas reais + documentação canônica prevalecem e o documento deve ser atualizado na mesma sessão.
