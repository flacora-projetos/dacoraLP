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

- Portal Data Hub publicado na Vercel Production `dpl_3QC4mpLZstghYAy1qY4ndAA7CSR3`.
- Commit funcional do portal: `fa244dc`.
- Backend publicado: `dacora-data-hub-00040-cil`, imagem `runtime:b77456f`, 100% do tráfego.
- Rollback backend: `dacora-data-hub-00038-top`, tag `rollback-pre-selected`.
- Scheduler continua `PAUSED`.
- O criador não possui seletor manual de nível. O grão é consequência dos campos selecionados.
- Definições novas usam `selectedFields`; definições legadas preservam o grão materializando a identidade correspondente antes da migração.
- O contrato `selectedFields` foi provado em produção por CRUD reversível: create 201 → read 200 → `entityLevel=campaign` → delete 204 → read 404.
- A definição temporária de smoke foi removida e nenhuma extração Meta foi executada.
- A permissão temporária usada para gerar ID token foi revogada; nenhuma chave/credencial persistente foi criada.
- Validação pré-release do portal: `verifica:data-hub-casca` OK, `verifica:data-hub-spike` OK, TypeScript com heap ampliado exit 0, build completo OK, diff-check e secret scan verdes.
- O norte de produto é a expansão progressiva rumo às **611 capacidades úteis** do benchmark Stract, preservando semântica, grão, granularidade e compatibilidades.

## Próximo objetivo

O próximo gate real não é mais provar o CRUD da definição. É provar **dados reais**:

1. executar uma extração field-centric controlada;
2. reconciliar Hub Data API → normalização → BigQuery → Sheets/read-back;
3. confirmar ordem de `selectedFields` na saída;
4. depois avançar actions em colunas, enriquecimento criativo e matriz 611 × Hub.

## Gates

- Não confundir CRUD de definição com prova de números Meta.
- Merge/push/deploy/produção continuam sujeitos às regras vigentes do projeto e à autorização do PO.
- Não invente contas, IDs, catálogo, payloads ou resultados. Diferencie IMPLEMENTADO, INTEGRADO e PRODUÇÃO.
- Não reduza o catálogo do portal para contornar lacuna do backend; a direção é expandir a fonte canônica do Hub.

## Arquivos centrais do Data Hub no portal

- `src/pages/DataHub.tsx`
- `src/pages/data-hub-extracoes.tsx`
- `src/pages/data-hub-catalogo.ts`
- `src/pages/data-hub.css`
- `scripts/verifica-painel-data-hub-casca.mts`
- `docs/DATA_HUB_ESTADO_ATUAL.md`

Siga ENTENDER → LOCALIZAR → LER → EXECUTAR → TESTAR → VALIDAR → ENTREGAR. Se Git/produção divergirem deste prompt, Git + respostas reais + documentação canônica prevalecem e o documento deve ser atualizado na mesma sessão.
