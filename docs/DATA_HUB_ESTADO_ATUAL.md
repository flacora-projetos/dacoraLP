# Data Hub no portal Dácora — estado atual

**Atualizado em 2026-09-02.** Este documento trata somente da rota `/data-hub`, seus módulos e o BFF correspondente. O portal também serve outras aplicações; trabalho de Data Hub não autoriza alterações nelas.

## Papel do portal

O Data Hub é uma funcionalidade do portal Dácora. A arquitetura vigente é:

`Portal /data-hub → BFF privado Vercel /api/data-hub/* → Cloud Run Dácora Data Hub → Hub Data API Meta → BigQuery → Google Sheets/read-back`

O portal é a superfície de escolha e operação; o repositório `Dacora Data Hub` é o backend/serviço de dados. Não duplicar lógica analítica ampla no frontend.

## Produção agora

| Componente | Estado |
| --- | --- |
| Portal | Vercel Production automático a cada merge em `main`; commit funcional Data Hub `fa244dc` |
| Commit funcional do portal | `fa244dc` |
| URL | `https://www.dacora.com.br/data-hub` |
| Backend | Cloud Run `dacora-data-hub-00040-cil`, 100% do tráfego |
| Imagem backend | `runtime:b77456f` |
| Rollback backend | `dacora-data-hub-00038-top`, tag `rollback-pre-selected` |
| Scheduler | `PAUSED` |

O deployment funcional publicado ficou `Ready` e os aliases `www.dacora.com.br`, `dacora.com.br` e `dacora-lp.vercel.app` apontam para o deployment Production corrente. Como merges documentais em `main` também geram novo deployment Vercel, **não fixe ID de deployment como estado canônico**; consulte `vercel inspect https://www.dacora.com.br` para o ID atual.

Smoke anônimo pós-release:

- `/data-hub` → HTTP 200;
- `Cache-Control` privado/no-store;
- `X-Robots-Tag: noindex`;
- `Referrer-Policy: no-referrer`;
- `/api/data-hub/catalog` sem sessão → HTTP 401.

## Contrato field-centric

O portal publicado segue o modelo por campos:

- não pergunta nível/grão manualmente;
- emite `selectedFields` em novas definições;
- remove do payload novo `entityLevel`, `fields`, `creativeFields` e `breakdowns`;
- mostra o grão apenas como consequência da seleção;
- mantém leitura/edição de definições legadas.

A correção integrada no PR `#30` também garante que:

- `nivelResolvidoDoRascunho` não usa mais `rascunho.nivel` legado como entrada para uma definição field-centric nova;
- todos os breakdowns atuais publicados pelo Hub participam da dedução de grão;
- ao migrar definição legada sem `selectedFields`, o portal materializa o campo de identidade do grão (`account_id`, `campaign_id`, `adset_id` ou `ad_id`) antes de eliminar `entityLevel`;
- definições que já possuem `selectedFields` não recebem campo artificial.

Arquivos funcionais tocados nessa frente ficaram restritos ao Data Hub:

- `src/pages/DataHub.tsx`;
- `src/pages/data-hub-catalogo.ts`;
- `scripts/verifica-painel-data-hub-casca.mts`.

Nenhum módulo de relatórios/RA, Supabase, envio ou outra aplicação do portal foi alterado.

## Validação antes da publicação

- `npm run verifica:data-hub-casca`: OK;
- `npm run verifica:data-hub-spike`: OK;
- `npx tsc --noEmit` com `NODE_OPTIONS=--max-old-space-size=8192`: exit 0;
- build completo Vite: OK;
- `git diff --check`: exit 0;
- secret scan do diff: sem achado.

A primeira execução redundante de TypeScript sem heap ampliado morreu por OOM do processo Node; a execução canônica com heap ampliado passou. Não há evidência de erro TypeScript introduzido por esta frente.

## Contrato portal ↔ backend provado em produção

Depois da promoção do backend para `dacora-data-hub-00040-cil`, foi executado um CRUD reversível usando a identidade real da service account do portal, sem executar extração Meta:

1. `GET /readyz` → 200;
2. `GET /internal/v1/portal/catalog` → 200;
3. catálogo retornou 56 contas, sendo 51 `isQueryable=true`, 10 fields, 8 creativeFields, 8 breakdowns e 7 templates;
4. criação de definição com `selectedFields = [date, campaign_name, spend]` → 201;
5. backend deduziu `entityLevel = campaign`;
6. read-back da definição → 200 com os mesmos `selectedFields`;
7. exclusão → 204;
8. leitura após exclusão → 404, confirmando cleanup.

Esse smoke prova autenticação BFF/Cloud Run e o contrato de definição field-centric. Ele **não prova os números da Meta**, porque não houve execução da extração nem escrita em BigQuery/Sheets.

A impersonação usada no smoke foi temporária, sem criação de chave. A role temporária de token foi removida no mesmo fluxo e o read-back final confirmou ausência.

## Norte de cobertura

O objetivo do Data Hub não é limitar o portal ao catálogo pequeno atual. O alvo funcional é se aproximar ao máximo do benchmark Stract documentado no backend: **611 capacidades úteis deduplicadas**, com semântica, grão, granularidade e compatibilidades reais.

O portal deve ser uma projeção da fonte canônica do backend. Não manter manualmente uma segunda lista de centenas de capacidades se o backend puder fornecê-las no catálogo. Não esconder uma capacidade suportada apenas para simplificar a UI; incompatibilidades reais devem ser explicadas e bloqueadas pelo contrato.

Fonte canônica do placar: repositório `Dacora Data Hub`, `docs/COBERTURA_STRACT_META.md`.

## Próximos gates

1. executar uma extração field-centric real e reconciliar **Hub Data API → normalização → BigQuery → Sheets/read-back**;
2. fazer a saída obedecer integralmente a ordem de `selectedFields`;
3. projetar actions selecionadas como colunas quando aplicável e fechar enriquecimento criativo;
4. construir a matriz **611 × Hub** e expandir o catálogo canônico por lotes;
5. manter a UI derivada desse catálogo e validar desktop/móvel a cada ampliação significativa.

Scheduler permanece pausado até os gates posteriores do backend/piloto.
