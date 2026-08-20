# Handoff — painel do circuito de recusa — 20/08/2026

## Estado

Implementado localmente na branch `codex/circuito-recusa-portal`, sem merge,
deploy, migration remota, decisão ou envio real. Depende da migration
`20260820150000_p4_circuito_correcao.sql` da fábrica antes de publicação, pois
a view passa a fornecer as colunas novas.

## Entrega

- A API privada projeta estado/início/erro da ordem e identifica quando o
  relatório `gerado` é a nova versão vinculada à recusa.
- Fila e revisão explicam aguardando correção, processamento, falha e retorno
  à revisão humana. A nova versão não é aprovada, fechada nem enviada pelo
  painel.
- Não existe diff inventado: o painel só mostra o vínculo que a view consegue
  provar.

## Provas locais

`npm.cmd run verifica:decisao`, `npm.cmd run verifica:fila`,
`npm.cmd run verifica:revisao` e `npm.cmd run build` passaram. A instalação
local necessária para testes reportou uma vulnerabilidade alta preexistente nas
dependências; nenhum pacote ou lockfile foi alterado nesta entrega.

## Gate

Aplicar primeiro a migration da fábrica com read-back de grants/view, integrar e
publicar esta branch depois. Smoke autenticado deve ser somente leitura, sem
recusa, aprovação, P5, worker ou WhatsApp reais.
