# Casca limpa nas rotas privadas — fim do flash da home (2026-08-20)

**Branch:** `fix/casca-privada` · **Origem:** o PO relatou que a home institucional pisca por alguns instantes antes do painel de relatórios aparecer.

## O que estava acontecendo

Uma linha em `vercel.json`:

```json
{ "src": "/(.*)", "dest": "/index.html" }
```

Toda rota que não fosse arquivo caía em `index.html` — e `index.html` **não é uma casca vazia**: o `prerender` injeta a home inteira já renderizada dentro dele, de propósito, para os crawlers de IA lerem o site sem executar JavaScript.

Então abrir `/painel-de-relatorios` ou `/relatorios/<token>` entregava **24 KB da home institucional**, o navegador pintava aquilo, e só depois o roteador trocava pela página certa.

Medido em produção antes da correção, tanto no painel quanto no relatório de cliente:

| Fato | Antes |
|---|---|
| `<title>` servido | `Gestão de Tráfego Pago para Negócios Locais \| Dácora` |
| Bytes de home pintados antes do app | 24.076 |
| Preload da imagem do banner, `fetchpriority="high"` | **2 ocorrências** (uma no `<head>`, outra dentro do `#root` renderizado) |
| Google Analytics (`gtag`) | disparando |
| Pixel do Facebook (`fbq` + `noscript`) | disparando `PageView` |

O preload em prioridade alta é o detalhe que fecha o ciclo: a página privada mandava o navegador baixar uma foto de marketing **na frente** do próprio código do relatório, alongando o flash que ela mesma causava.

**Decisão do PO em 2026-08-20:** fora Google Analytics e Pixel do Facebook das rotas privadas — **tanto do relatório do cliente quanto do painel interno**.

## O que mudou

1. **`index.html`** ganhou marcadores em três blocos, no padrão `<!--tag-->…<!--/tag-->` que o `prerender` já usava para `seo` e `jsonld`: `hero-preload`, `analytics` (gtag + Pixel do `<head>`) e `analytics-noscript` (o `<img>` do Pixel no `<body>`).
2. **`scripts/prerender.mjs`** passa a emitir também **`dist/app.html`**: o mesmo template, com `#root` vazio, cabeçalho neutro (`<title>Dácora</title>`, `noindex`, `no-referrer`), sem preload de marketing e sem rastreador. **2 KB**, contra 24 KB da home.
3. **`vercel.json`** manda `/painel-de-relatorios(/.*)?` e `/relatorios/(.*)` para `/app.html`, depois do `handle: filesystem` e antes da regra final. Home, política de privacidade e proposta seguem exatamente como estavam.

Nada do painel ou dos relatórios foi tocado. `server.ts` não serve o site (ele mesmo declara isso), então não existe um segundo caminho a corrigir.

## ⚠️ O defeito que a própria trava expôs, e que é a parte mais útil daqui

`prerender.mjs` lê `dist/index.html` **como template** e, no laço seguinte, **sobrescreve esse mesmo arquivo** com a home renderizada. Rodá-lo duas vezes sem um `vite build` no meio faz a casca nascer **a partir da home já renderizada** — exatamente o conteúdo que ela existe para não ter.

Isso não aparecia antes porque, para a home, a segunda passada era inofensiva (o `<div id="root"></div>` já não existia e o `replace` virava no-op). Com a casca, vira uma casca errada publicada em silêncio.

Hoje o script **falha alto** se o template já estiver pré-renderizado, dizendo o que fazer. **A régua: script que consome um arquivo e o substitui não é idempotente, e o custo disso só aparece quando alguém acrescenta um segundo consumidor do template.**

## Regressão

`scripts/verifica-casca-privada.mjs`, dentro de `npm run build`, logo após o `prerender` — a verificação é feita **no artefato que vai ao ar**, não no código-fonte. Ela exige, na casca: `#root` vazio, zero rastreadores (5 padrões), zero preload do banner, `noindex`, **e que o bundle e o CSS do app estejam carregados**.

Essa última é o que impede a trava de virar teatro: sem ela, "zero rastreador" seria satisfeito por uma **página em branco**.

E há a metade negativa, sobre `dist/index.html`: a home precisa **continuar** pré-renderizada, **continuar** com os dois rastreadores e **continuar** com o preload do banner. Sem isso, tudo passaria verde no dia em que a pré-renderização quebrasse e os dois arquivos virassem cascas vazias.

Também confere a ordem das rotas em `vercel.json` — uma regra correta colocada depois da regra final nunca é alcançada.

**Quatro mutações, todas reprovando:** rota privada devolvida ao `index.html`; rastreadores de volta na casca; casca sem o bundle do app; home transformada em casca.

> **Uma das mutações passou verde na primeira tentativa e o motivo era meu:** o regex que "esvaziava" o `#root` da home era não-guloso e casava com o primeiro `</div>` interno, então a home continuava cheia. A mutação era ineficaz, não a trava. Refeita copiando a casca por cima da home — 24.417 → 1.837 bytes —, ela reprovou nos quatro pontos. **Mutação que não muda o artefato não testa nada.**

## Portões

- `lint`: 0 erros (já com o gate de tipos ligado na publicação)
- `build`: verde, incluindo `verifica:casca`
- 14 de 14 verificações do painel

## Como conferir depois de publicado

```bash
curl -s https://www.dacora.com.br/painel-de-relatorios | grep -o "<title>[^<]*</title>"
curl -s https://www.dacora.com.br/painel-de-relatorios | grep -c "connect.facebook.net\|googletagmanager"
```

Esperado: `<title>Dácora</title>` e `0`. A home deve continuar com o título de venda e com os dois rastreadores.
