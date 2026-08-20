# HANDOFF — RA5: recibo final na página pública e PDF — 2026-08-20

## Estado

Implementação em `codex/ra5-recibo-pagina-pdf`, sobre `main/e6b1c49`, sem
alteração de Supabase remoto, deploy, merge, envio ou áudio.

## Contrato entregue

`api/relatorio-publico.ts` não libera mais um snapshot somente porque a
aprovação legada bate com o documento. Antes de montar a resposta pública, lê
o recibo AV4 `relatorio_fechamentos_editoriais` e exige identidade exata
(`relatorio_id`, cliente, competência e versão) e os três vínculos exatos:

- `checksum_documento` = `relatorios.checksum`;
- `checksum_factual` = `relatorios.checksum_factual_editorial`;
- `aprovado_checksum` = a aprovação persistida da mesma versão.

Ausência, recibo malformado ou qualquer divergência devolve o mesmo 404
indisponível do link público. O recibo continua interno e não é incluído no
JSON. A página pública usa somente `RelatorioMontado`; a impressão/PDF vem
desse mesmo snapshot. Histórico e controles internos seguem fora da página
pública e ocultos na impressão pelo contrato CSS existente.

## Provas

- `npm.cmd run verifica:publico` — passou. Inclui negativas para documento,
  snapshot factual, aprovação, cliente e versão divergentes, além da ausência
  de histórico na resposta pública e da regra de impressão do histórico.
- `npm.cmd run verifica:av4`, `verifica:av3` e `verifica:revisao` — passaram.
- `npm.cmd run lint` — passou com 0 erros após `npm ci` isolado na worktree.
- `npm.cmd run build` — passou: Vite, SSR, prerender, casca privada, sitemap e
  bundle do servidor. O primeiro comando completo foi interrompido pelo limite
  de execução durante o Vite; a repetição da etapa Vite e das etapas restantes
  fora do sandbox concluiu verde.
- `git diff --check` — passou.

## Smoke

O navegador isolado não iniciou (`CDP response channel closed`), por isso não
há alegação de smoke visual/autenticado. O smoke HTTP não mutante da produção
atual confirmou painel 200 com casca `noindex`, retenção privada 401 sem sessão
e rota externa com credencial inválida usando `no-store`/`no-referrer`. A branch
RA5 não foi publicada e esse smoke não prova o código novo.

## Próximo gate

Revisar, commitar e enviar a branch. Depois da integração da dependência de
tipagem, rodar `npm run build`; após merge/publicação autorizados, repetir
smoke público com um link governado e smoke autenticado com storage-state
governado, sem aprovar, descartar ou enviar.
