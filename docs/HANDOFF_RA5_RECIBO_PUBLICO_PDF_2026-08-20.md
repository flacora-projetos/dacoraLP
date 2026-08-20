# HANDOFF — RA5: recibo final na página pública e PDF — 2026-08-20

## Resultado

RA5 está integrada em `main/2a7dc4e` e publicada pela Vercel com deployment
`success`. `api/relatorio-publico.ts` só devolve a versão `liberado` cujo
recibo AV4 coincide exatamente com a identidade, o checksum do documento, o
checksum factual e o checksum aprovado. Ausência ou divergência devolve o
mesmo 404 indisponível.

O token, o recibo e o histórico editorial continuam internos e não entram no
JSON público. A página usa somente `RelatorioMontado`; o PDF é a impressão
dessa mesma página, sem fonte paralela. Histórico e controles internos seguem
fora da página e ocultos na impressão.

Não houve alteração de schema/Supabase, aprovação, recusa, envio, descarte de
histórico ou áudio nesta entrega.

## Provas

- `verifica:publico`: passou, incluindo ausência de histórico e negativas de
  documento, fatos, aprovação, cliente e versão divergentes;
- `verifica:av4`, `verifica:av3` e `verifica:revisao`: passaram;
- `lint`: passou com zero erros após `npm ci` isolado na worktree;
- build completo da branch: Vite, SSR, prerender, casca privada, sitemap e
  bundle do servidor concluíram verdes;
- produção: raiz e painel HTTP 200; credencial pública inválida retorna 404 com
  `no-store` e `no-referrer`;
- navegador real autenticado: painel e revisão de Hannover Fondue abriram em
  desktop e 390×844, sem overlay, erro de console ou overflow horizontal. O
  histórico apareceu recolhido e marcado como interno. Nenhuma ação mutante
  foi acionada.

O Playwright isolado não conseguiu reutilizar uma sessão governada. O smoke
autenticado foi concluído por controle da janela Chrome aberta pelo PO, sem
inspecionar cookies ou storage.

## Gate operacional restante

Uma leitura remota somente de contagem encontrou **zero** relatórios que hoje
estejam simultaneamente `liberado`, com token e recibo AV4 exato. Não existe,
portanto, link positivo que possa ser testado sem criar uma aprovação humana
real. Esse estado não foi fabricado.

No primeiro fechamento real, abrir o link público e imprimir o PDF sem enviar,
conferindo que ambos mostram o mesmo conteúdo final e nenhum histórico. O
envio P5 permanece separado. Depois dessa validação operacional, a próxima
fase técnica da família é RA6.
