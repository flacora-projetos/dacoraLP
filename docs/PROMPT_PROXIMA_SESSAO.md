# Prompt para a próxima sessão — Data Hub Portal

Continue a frente **Data Hub no portal Dácora** a partir do estado auditado em 2026-09-06 e documentado em 2026-09-07.

## Antes de agir

1. Carregue o runtime atual do Codex Ninja.
2. Selecione o workspace `@projects/SITE DACORA LP/repo`.
3. Leia por inteiro `AGENTS.md` e `CLAUDE.md`, depois `docs/DATA_HUB_ESTADO_ATUAL.md`.
4. Rode `git fetch origin --prune`, confirme branch/HEAD/status/worktrees e preserve qualquer trabalho preexistente.
5. Não desenvolva diretamente em `main`.
6. O portal serve outras aplicações além do Data Hub. Não toque em RA, Supabase, relatórios, envio ou outras frentes sem escopo explícito.

## Estado confirmado

- Portal Data Hub publicado em Vercel Production; commit funcional da frente `fa244dc`.
- Backend publicado: commit `54576ef`, revisão Cloud Run `dacora-data-hub-00060-zip`, pronta e com 100% do tráfego na auditoria.
- Hub Data API Meta no backend Saldos: commit `04d1865`; use o health `https://api-wviue4ksza-uc.a.run.app/api/health`, não o host do MCP.
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
- Actions selecionadas em colunas, enriquecimento criativo e conflito por revisão já foram provados; não os trate como frentes ainda inexistentes.
- O Stract atual expôs **1.010 campos brutos**, normalizados em **676 capacidades úteis**: 32 `supported`, 11 `partial` e 633 `not_implemented`.
- A matriz de 676 capacidades ainda aguarda sanitização, evidência por linha, revisão e integração na `main` do repositório `Dacora Data Hub`.
- Esta fotografia não representa deploy novo em nenhum dos três repositórios.

## Próximo objetivo

O próximo trabalho é transformar o inventário amplo em cobertura verificável e segura:

1. remover IDs e nomes reais do snapshot e dos JSON/CSV gerados;
2. registrar teste, probe ou smoke rastreável para cada linha marcada `supported` ou `partial`;
3. revisar e integrar a matriz de **676 capacidades**;
4. expandir hierarquia e Insights por lotes, preservando grão, granularidade, `null`, zero e campo ausente;
5. completar as variações de `count`, `value` e `cost` das actions;
6. obter decisão de produto antes de incluir `business.*` ou billing;
7. manter a UI derivada do catálogo canônico;
8. só depois fechar PAR5/piloto e reavaliar ativação do Scheduler.

## Gates

- Não reabrir seletor manual de nível.
- Não reduzir o catálogo do portal para esconder lacunas do backend.
- Não criar workaround de OAuth nem chave de service account.
- Não ampliar IAM permanente sem necessidade explícita.
- Não tocar nos worktrees/branches de RA ou outras frentes.
- Diferenciar IMPLEMENTADO, INTEGRADO e PRODUÇÃO.

Siga ENTENDER → LOCALIZAR → LER → EXECUTAR → TESTAR → VALIDAR → ENTREGAR. Se Git/produção divergirem deste prompt, Git + respostas reais + documentação canônica prevalecem.
