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
- Backend publicado: `dacora-data-hub-00031-fzv`, imagem `runtime:f13b028`, 100% do tráfego.
- Digest backend: `sha256:ca3db7f5fdc53e01bcfa118bfe5eaa750d7b5ae65278a08686f6689d59ec9c5a`.
- Rollback backend: `dacora-data-hub-00030-8ms`, tag `preselectedsheets`.
- Scheduler continua `PAUSED`.
- O criador não possui seletor manual de nível; novas definições usam `selectedFields`.
- O golden slice field-centric está fechado de ponta a ponta em produção.
- Meta→BigQuery: `selectedFields = [date, campaign_name, spend]`, grão `campaign`, `success/reconciled`, valor reconciliado com fonte independente.
- Google Sheets: export `succeeded`, `1×3`, range `'Página1'!A1:C2`.
- Read-back final: `Data`, `Nome da campanha`, `Investimento`, nessa ordem; linha `2026-08-27 | MENSAGENS (WhatsApp) - PEC. CORTE | 195,48`.
- PR backend `#79` corrigiu reconciliação Hub.
- PR backend `#82` corrigiu o upsert projetado BigQuery para `require_partition_filter`.
- PR backend `#84` fez `selectedFields` ser autoritativo também no Sheets, preservando layout legado para definições antigas.
- Backend validado no Node 22.22.0: **489/489**; focados Sheets **30/30**; lint/diff-check OK.
- Artefatos temporários de smoke foram removidos do Firestore e as planilhas de teste foram movidas para a lixeira do Drive.
- Todos os grants temporários TokenCreator foram revogados; nenhuma chave persistente foi criada.
- O norte continua sendo expansão progressiva rumo às **611 capacidades úteis** do benchmark Stract.

## Próximo objetivo

O próximo trabalho deixa de ser fechamento do golden slice e passa a ser expansão funcional:

1. projetar actions/conversions selecionadas como colunas;
2. fechar enriquecimento criativo;
3. construir a matriz **611 × Hub** sem `unknown`;
4. classificar cada capacidade como `supported`, `unsupported_upstream` ou `not_applicable`;
5. expandir catálogo/backend por lotes preservando grão, granularidade e compatibilidades reais;
6. manter a UI derivada do catálogo canônico;
7. só depois fechar PAR5/piloto e reavaliar ativação do Scheduler.

## Gates

- Não reabrir seletor manual de nível.
- Não reduzir o catálogo do portal para esconder lacunas do backend.
- Não criar workaround de OAuth nem chave de service account.
- Não ampliar IAM permanente sem necessidade explícita.
- Não tocar nos worktrees/branches de RA ou outras frentes.
- Diferenciar IMPLEMENTADO, INTEGRADO e PRODUÇÃO.

Siga ENTENDER → LOCALIZAR → LER → EXECUTAR → TESTAR → VALIDAR → ENTREGAR. Se Git/produção divergirem deste prompt, Git + respostas reais + documentação canônica prevalecem.
