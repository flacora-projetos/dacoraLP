# Prompt para a próxima sessão — Data Hub Portal

Continue a frente **Data Hub no portal Dácora** a partir do estado de produção de 2026-09-02.

## Antes de agir

1. Carregue o runtime atual do Codex Ninja.
2. Selecione o workspace `@projects/SITE DACORA LP/repo`.
3. Leia por inteiro `AGENTS.md` e `CLAUDE.md`, depois `docs/DATA_HUB_ESTADO_ATUAL.md`.
4. Rode `git fetch origin --prune`, confirme branch/HEAD/status/worktrees e preserve qualquer trabalho preexistente.
5. Não desenvolva diretamente em `main`.
6. O portal serve outras aplicações além do Data Hub. Não toque em RA, Supabase, relatórios, envio ou outras frentes sem escopo explícito.

## Estado confirmado

- Portal Data Hub publicado em Vercel Production; commit funcional da frente `fa244dc`.
- Backend publicado: `dacora-data-hub-00030-8ms`, imagem `runtime:d54c50e`, 100% do tráfego.
- Digest backend: `sha256:9f29d69086a571830eb75b2b0fa41ab358936a154007dccaa5abb6f4e32e89f4`.
- Rollback backend: `dacora-data-hub-00029-f5b`, tag `preupsert`.
- Scheduler continua `PAUSED`.
- O criador não possui seletor manual de nível; novas definições usam `selectedFields`.
- O CRUD field-centric foi provado em produção.
- O gate Meta real até BigQuery foi fechado em produção com `selectedFields = [date, campaign_name, spend]`, grão `campaign`, período `2026-08-28`.
- `sync_run_id = 501547d2-5ec3-42f2-9dd8-dbfcb3072bd6` terminou `success/reconciled`.
- BigQuery devolveu `spend = 166.14`, igual à fonte independente; `impressions` e `clicks` permaneceram `NULL`.
- PR backend `#79` corrigiu a reconciliação do caminho Hub.
- PR backend `#82` corrigiu definitivamente o upsert projetado para `require_partition_filter` substituindo o MERGE problemático por DMLs transacionais particionáveis.
- As definições e `sheets_exports` temporários dos smokes foram removidos; `sync_runs`/BigQuery permanecem como evidência.
- Todos os grants temporários TokenCreator foram revogados; nenhuma chave persistente foi criada.
- O único gate operacional aberto do smoke é Google Sheets/read-back.
- O export pós-BigQuery terminou `dead` com `reauthorization_required`.
- O fluxo oficial de reautorização Google foi aberto no navegador local; a conclusão depende de consentimento humano na conta Google.
- O norte continua sendo expansão progressiva rumo às **611 capacidades úteis** do benchmark Stract.

## Próximo objetivo

Fechar somente o gate Google Sheets/read-back:

1. confirmar que o consentimento Google foi concluído;
2. repetir um smoke curto com `selectedFields = [date, campaign_name, spend]` e janela inédita;
3. confirmar `sync_runs=success/reconciled` e BigQuery como regressão;
4. confirmar `sheets_exports=succeeded`;
5. fazer read-back do Sheets;
6. validar ordem de `selectedFields`, zero versus ausência e ausência de campos não escolhidos;
7. limpar os artefatos temporários do smoke;
8. atualizar a documentação canônica.

Depois disso, seguir para ordem integral de `selectedFields`, actions/conversions em colunas, enriquecimento criativo e matriz 611 × Hub.

## Gates

- Não inventar workaround de OAuth nem criar chave de service account.
- Não ampliar IAM permanente para contornar reautorização Google.
- Não tocar nos worktrees/branches de RA ou outras frentes.
- Diferenciar IMPLEMENTADO, INTEGRADO e PRODUÇÃO.
- Não reduzir o catálogo do portal para esconder lacunas do backend.

Siga ENTENDER → LOCALIZAR → LER → EXECUTAR → TESTAR → VALIDAR → ENTREGAR. Se Git/produção divergirem deste prompt, Git + respostas reais + documentação canônica prevalecem.
