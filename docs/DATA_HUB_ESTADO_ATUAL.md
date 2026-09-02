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
| Backend | Cloud Run `dacora-data-hub-00028-t4n`, 100% do tráfego |
| Imagem backend | `runtime:83ca649` |
| Commit backend em produção | `83ca64920a60fd2833e9d05214f3dc414040341e` |
| Rollback backend | `dacora-data-hub-00040-cil`, tag `prehubrec` |
| Scheduler | `PAUSED` |

O deployment funcional do portal permanece publicado em Vercel Production. Como merges documentais em `main` também geram novo deployment, **não fixe ID de deployment como estado canônico**; consulte `vercel inspect https://www.dacora.com.br` para o deployment corrente.

Smoke anônimo pós-release já provado:

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

## Contrato portal ↔ backend provado em produção

O CRUD field-centric foi provado em produção usando a identidade real do portal, sem extração Meta:

1. `GET /readyz` → 200;
2. catálogo → 200, com 56 contas, 51 queryable, 10 fields, 8 creativeFields, 8 breakdowns e 7 templates;
3. criação com `selectedFields = [date, campaign_name, spend]` → 201;
4. backend deduziu `entityLevel = campaign`;
5. read-back → 200 com a seleção preservada;
6. delete → 204;
7. GET posterior → 404.

A definição temporária desse CRUD foi removida.

## Smoke de dados Meta reais — estado correto

O backend avançou além do CRUD e executou um smoke real de dados com a mesma seleção `selectedFields = [date, campaign_name, spend]`, na conta queryable `act_643514297405998`.

Para `2026-09-01`, a Hub Data API devolveu uma linha com `spend = 228.21`. A reconciliação independente via Saldos MCP retornou o mesmo total. Portanto, a origem Meta real e o mapeamento field-centric da requisição foram comprovados nesse recorte.

O primeiro run E2E, porém, foi bloqueado antes da persistência porque o caminho Hub não materializava `reconciliation` para o worker. A correção entrou pela PR backend `#79` e está publicada em `dacora-data-hub-00028-t4n`/`runtime:83ca649`.

**Não declarar o gate completo encerrado ainda.** Falta um run pós-correção até:

`Hub Data API → normalização → BigQuery → Sheets/read-back`

com `sync_runs=success/reconciled`, conferência independente, ordem de `selectedFields`, distinção de zero/ausente e ausência de campos não escolhidos.

## Google Sheets — bloqueio operacional atual

A conexão Google do ator devolveu `reauthorization_required` durante o smoke. Isso bloqueou a prova nova de escrita/read-back em Sheets.

O portal não deve criar workaround nem trocar escopos. Quando houver GO operacional, reautorizar a conexão existente pelo fluxo próprio do Data Hub e repetir o read-back.

Duas definições temporárias de smoke existem no backend/Firestore. A limpeza pertence ao backend e deve ocorrer somente com GO explícito; não alterar o portal para esconder esses registros.

## Validação concluída nesta rodada

Portal em `main` foi revalidado sem tocar em RA/Supabase/relatórios:

- `npm run verifica:data-hub-casca`: OK;
- `npm run verifica:data-hub-spike`: OK;
- `npx tsc --noEmit` com `NODE_OPTIONS=--max-old-space-size=8192`: exit 0;
- build completo com `NODE_OPTIONS=--max-old-space-size=8192`: exit 0;
- `git diff --check`: obrigatório antes do commit.

A tentativa de build com heap padrão morreu por OOM durante o `prebuild`/TypeScript. Isso reproduz a limitação já conhecida; não é regressão funcional do Data Hub. A evidência válida é o TypeScript/build com heap ampliado.

## Norte de cobertura

O objetivo do Data Hub não é limitar o portal ao catálogo pequeno atual. O alvo funcional é se aproximar ao máximo do benchmark Stract documentado no backend: **611 capacidades úteis deduplicadas**, com semântica, grão, granularidade e compatibilidades reais.

O portal deve ser uma projeção da fonte canônica do backend. Não manter manualmente uma segunda lista de centenas de capacidades se o backend puder fornecê-las no catálogo. Não esconder uma capacidade suportada apenas para simplificar a UI; incompatibilidades reais devem ser explicadas e bloqueadas pelo contrato.

Fonte canônica do placar: repositório `Dacora Data Hub`, `docs/COBERTURA_STRACT_META.md`.

## Próximos gates

1. com GO operacional, limpar as definições temporárias de smoke no backend e reautorizar Google se necessário;
2. executar um run pós-correção e provar BigQuery + Sheets/read-back;
3. fazer a saída obedecer integralmente à ordem de `selectedFields`;
4. projetar actions selecionadas como colunas quando aplicável e fechar enriquecimento criativo;
5. construir a matriz **611 × Hub** e expandir o catálogo canônico por lotes;
6. manter a UI derivada desse catálogo e validar desktop/móvel a cada ampliação significativa.

Scheduler permanece pausado até os gates posteriores do backend/piloto.
