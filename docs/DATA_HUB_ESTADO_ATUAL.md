# Data Hub no portal Dácora — estado atual

**Atualizado em 2026-09-02.** Este documento trata somente da rota `/data-hub` e seus módulos/BFF. O portal também serve outras aplicações; trabalho de Data Hub não autoriza alterações nelas.

## Papel do portal

O Data Hub é uma funcionalidade do portal Dácora. A arquitetura esperada é:

`Portal /data-hub → BFF privado Vercel /api/data-hub/* → Cloud Run Dácora Data Hub → Hub Data API Meta → BigQuery → Google Sheets/read-back`

O portal é a superfície de escolha e operação; o repositório `Dacora Data Hub` é o backend/serviço de dados. Não duplicar lógica analítica ampla no frontend.

## Contrato field-centric

O portal publicado desde 2026-08-26 já segue o modelo por campos:

- não pergunta nível/grão manualmente;
- emite `selectedFields` em novas definições;
- remove do payload novo `entityLevel`, `fields`, `creativeFields` e `breakdowns`;
- mostra o grão apenas como consequência da seleção;
- mantém leitura/edição de definições legadas.

Commit funcional histórico: `e158438 feat: align Data Hub portal with selected fields`, já contido em `main`.

## Correções locais de contrato em 2026-09-02

Branch: `fix/data-hub-field-contracts`.

A prova portal ↔ backend encontrou dois defeitos no lado da UX/normalização:

1. `nivelResolvidoDoRascunho` ainda começava pelo `rascunho.nivel` legado, embora a tela não oferecesse mais seletor de nível. Isso permitia um valor oculto forçar grão diferente do deduzido pelos campos.
2. Ao editar uma definição legada sem `selectedFields`, remover `entityLevel` sem materializar o grão podia transformar silenciosamente, por exemplo, uma definição de anúncio em grão de conta/campanha.

Correções:

- grão novo começa em `conta` e sobe somente pelos campos/breakdowns/criativos selecionados;
- todos os breakdowns publicados pelo Hub possuem consequência de grão no frontend: demografia/geografia/placement-device → mínimo campanha; `video_asset` → anúncio;
- ao migrar uma definição legada, o portal materializa o campo de identidade correspondente (`account_id`, `campaign_id`, `adset_id` ou `ad_id`) antes de salvar no formato field-centric;
- definição que já possui `selectedFields` não recebe campo artificial.

Arquivos tocados somente nesta frente:

- `src/pages/DataHub.tsx`;
- `src/pages/data-hub-catalogo.ts`;
- `scripts/verifica-painel-data-hub-casca.mts`;
- documentação Data Hub.

Nenhum módulo de relatórios/RA, Supabase, envio ou outra aplicação do portal foi alterado.

## Validação local

Em 2026-09-02:

- `npm run verifica:data-hub-casca`: OK;
- `npm run verifica:data-hub-spike`: OK;
- `npx tsc --noEmit` com `NODE_OPTIONS=--max-old-space-size=8192`: exit 0;
- `git diff --check`: exit 0.

A primeira execução redundante de TypeScript sem heap ampliado morreu por OOM do processo Node; a execução canônica com heap ampliado passou. Não há evidência de erro TypeScript introduzido por esta frente.

## Incompatibilidade de produção confirmada

O portal publicado já envia `selectedFields`, mas em 2026-09-02 o Cloud Run do backend continua em `dacora-data-hub-00038-top`, imagem `runtime:a8fbe2c`, anterior ao suporte a `selectedFields` no `extraction-store`.

Portanto, **produção ainda não está alinhada ponta a ponta**, mesmo que as correções locais de portal e backend estejam coerentes.

## Norte de cobertura

O objetivo do Data Hub não é limitar o portal ao catálogo pequeno atual. O alvo funcional é se aproximar ao máximo do benchmark Stract documentado no backend: **611 capacidades úteis deduplicadas**, com grão, granularidade e compatibilidades reais.

O portal deve ser uma projeção da fonte canônica do backend. Não manter manualmente uma lista paralela de centenas de capacidades se o backend puder fornecê-las no catálogo. Não esconder uma capacidade suportada apenas para simplificar a UI; incompatibilidades reais devem ser explicadas e bloqueadas pelo contrato.

Fonte canônica do placar: repositório `Dacora Data Hub`, `docs/COBERTURA_STRACT_META.md`.

## Próximos gates

1. integrar as branches `fix/data-hub-field-contracts` do portal e backend;
2. alinhar produção seguindo gates de merge/push/deploy;
3. smoke autenticado real do contrato field-centric;
4. fazer a UI acompanhar a expansão do catálogo canônico sem duplicar regras;
5. validar comportamento desktop/móvel a cada ampliação significativa do catálogo.
