# Prompt para a próxima sessão — Data Hub Portal / Query Engine V2

> **Leia primeiro [`DATA_HUB_DIRETRIZ_QUERY_FIRST.md`](DATA_HUB_DIRETRIZ_QUERY_FIRST.md).** O motor schema-first/wide é LEGADO para expansão e não pode voltar como próximo passo.

Continue a frente **Data Hub no portal Dácora** a partir do estado de 07/09/2026.

## Bootstrap obrigatório

1. carregue o runtime atual do Codex Ninja;
2. selecione `@projects/SITE DACORA LP/repo`;
3. leia `AGENTS.md` e `CLAUDE.md` integralmente;
4. leia `docs/DATA_HUB_DIRETRIZ_QUERY_FIRST.md` e `docs/DATA_HUB_ESTADO_ATUAL.md`;
5. se o workspace Hub estiver disponível, leia `docs/DIRETRIZ_QUERY_FIRST_FIELD_CENTRIC.md` e `docs/LEGADO_MOTOR_SCHEMA_FIRST.md` do Hub;
6. confirme branch/HEAD/status/worktrees e preserve alterações preexistentes;
7. nunca desenvolva diretamente em `main`.

O portal serve outras aplicações. Não toque em RA, Supabase, relatórios, envio ou outras frentes sem escopo explícito.

## Estado confirmado

- Portal `/data-hub` já usa `selectedFields` e não exige seletor manual de nível para novas definições.
- Hub runtime publicado: `2a034551d0ca301f12286208052084567ff513b0`.
- Cloud Run Hub: `dacora-data-hub-00035-5qn`, Ready, 100% do tráfego.
- Build Hub: `663446cb-d964-4bc5-a99f-44dacf75e01f`.
- Digest Hub: `sha256:3347b10b579f9bee552f38e981d3f8872f22928f4aaca295c55893ec38fdc975`.
- Rollbacks: `dacora-data-hub-00060-zip` (`pre-core-expansion`) e `dacora-data-hub-00031-fzv` (`pre-meta-expansion`).
- Saldos: `eed756a` / `api-00090-yok`.
- Scheduler: `PAUSED`.
- IAM temporário TokenCreator do usuário foi removido na última revalidação documentada.
- Benchmark atual: **676 capabilities-base**; motor 1.x classificado em **51 supported / 4 partial / 621 not_implemented**.
- Esses 621 gaps **não são 621 tarefas independentes e não são backlog de UI**.
- O smoke field-centric histórico `[date, campaign_name, spend]` chegou a BigQuery + Sheets/read-back e continua evidência da compatibilidade 1.x.
- O **novo** smoke representativo do Query Engine V2 até Sheets/read-back ainda não existe; não declarará conclusão sem read-back real.

## Norte arquitetural — não reabrir

O produto é **query-first / field-centric**:

```text
conta(s)
+ selectedFields[]
+ período / granularidade
+ filtros / attribution / opções
        ↓
Query Planner V2 no Hub
        ↓
resultado tabular dinâmico e esparso
```

Para o usuário, dimensão, métrica, action, breakdown, atributo estrutural e campo contextual são **campos**. A classificação técnica pertence ao planner.

Campo sem valor naquela linha pode permanecer blank/null/ausente conforme o contrato. Zero continua zero. Erro upstream real continua erro. Nunca substituir vazio por zero sem opção explícita de apresentação.

## Motor antigo — LEGADO

Não retomar:

```text
capability
→ registry
→ FACT_METRIC_COLUMNS / FACT_COLUMNS
→ ALTER TABLE
→ views
→ próximo lote
```

As tabelas/views 1.x continuam compatibilidade e não devem ser removidas de passagem. O proibido é usá-las como mecanismo para destravar cobertura nova.

Também não retomar como plano:

- “expandir 98 métricas”;
- “completar 160 actions”;
- “reduzir 621 not_implemented por lotes wide”.

Esses números podem orientar probes/famílias do planner, não colunas físicas nem componentes do Portal.

## Próximo gate real

1. o Hub inventaria allowlists/gates físicos do motor 1.x;
2. o Hub implementa catálogo base + discovery contextual;
3. o Hub implementa planner por adaptadores e row builder dinâmico/esparso;
4. prova Meta → Hub → BigQuery → Sheets → read-back sem migration global por campo;
5. o Portal consome o catálogo/resultados desse motor sem duplicar regras analíticas;
6. só depois a matriz é recalculada/promovida por famílias do planner.

## Regras do Portal

- UI deriva catálogo e compatibilidades do backend;
- não criar lista manual paralela de capabilities;
- não esconder campos por limitação do schema wide atual;
- não reintroduzir seletor manual de nível;
- preservar edição/leitura das definições 1.x durante a transição;
- não tocar em IAM, OAuth ou service-account como workaround;
- `business.*` permanece fora até contrato/fonte próprios;
- não reativar Scheduler nesta frente.

Siga ENTENDER → LOCALIZAR → LER → EXECUTAR → TESTAR → VALIDAR → ENTREGAR. Git, respostas reais e documentos canônicos vencem qualquer fotografia antiga.
