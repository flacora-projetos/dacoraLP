# Landing page — Dácora Performance Digital

Site institucional da Dácora, em produção em **https://www.dacora.com.br**.

SPA em React + Vite, **pré-renderizado em build-time** para HTML estático.
Deploy automático no Vercel a cada push em `main`.

## Rodando local

Pré-requisito: Node.js 22+.

```bash
npm install
npm run dev
```

Para conferir o resultado real (com pré-renderização, que só acontece no build):

```bash
npm run build && npm run preview
```

## Estrutura

```
index.html                  template base + head da home + JSON-LD do site
src/
  App.tsx                   rotas
  entry-server.tsx          entrada de SSR — usada só no build, não vai ao navegador
  pages/                    Home, PropostaLandingPage, PrivacyPolicy
scripts/
  seo-routes.mjs            metadados de SEO por rota (fonte da verdade)
  prerender.mjs             gera um .html por rota
  gen-sitemap.mjs           gera dist/sitemap.xml a partir das rotas
public/
  img/                      imagens em WebP responsivo
  robots.txt  llms.txt      arquivos para buscadores e answer engines
api/meta-capi.ts            Conversions API da Meta (server-side)
vercel.json                 roteamento e cache
```

## Por que existe pré-renderização

Sendo um SPA, o HTML entregue seria apenas `<div id="root"></div>`. O Google
executa JavaScript e conseguiria ler a página, mas os crawlers de IA
(GPTBot, ClaudeBot, PerplexityBot) **não executam JS** — para eles o site
seria uma página em branco.

O `npm run build` roda, em ordem:

1. `vite build` — bundle do cliente
2. `vite build --ssr src/entry-server.tsx` — bundle de SSR em `dist-ssr/`
3. `scripts/prerender.mjs` — renderiza cada rota e grava o HTML em `dist/`
4. `scripts/gen-sitemap.mjs` — gera o `sitemap.xml`
5. `esbuild server.ts` — servidor Express (usado fora do Vercel)

## Adicionando uma rota

Três lugares, sempre os três:

1. `src/App.tsx` — a `<Route>`
2. `scripts/seo-routes.mjs` — title, description, robots, JSON-LD e entrada no sitemap
3. `vercel.json` — regra apontando o caminho para o `.html` gerado, **antes** do
   catch-all

Esquecer o passo 2 ou 3 faz a rota cair no catch-all: ela é servida com o HTML
e o `<head>` da home, e não entra no sitemap.

## SEO / GEO — o que está montado

- `<head>` por rota gravado no HTML servido (nada de SEO via `useEffect`, que
  não é visto por quem não executa JS)
- JSON-LD: `Organization`, `WebSite`, `ProfessionalService` e `Service` no site;
  `FAQPage` em `/proposta-landing-page`, refletindo o FAQ **visível** na página
- `robots.txt` liberando explicitamente os crawlers de answer engines
- `llms.txt` com resumo do negócio, serviços e perguntas frequentes
- Imagens em WebP com `srcset`, `width`/`height` e preload do LCP
- Canonical sempre na versão `www`

Ao mexer em schema, a regra é: **só marcar o que está visível na página**.
`FAQPage` sem FAQ visível, ou texto escondido no HTML para crawler, é cloaking
e arrisca penalidade.

## Analytics

- GA4 `G-CN7F6YWH42` e Meta Pixel `1323581326370949` no `index.html`
- Meta Conversions API em `api/meta-capi.ts` (variáveis em `.env.example`)

## Deploy

Push em `main` → build e deploy de produção no Vercel (projeto `dacora-lp`).

O apex `dacora.com.br` redireciona para `www`. Esse redirect é configuração de
**domínio no painel do Vercel**, não do `vercel.json` — ele acontece antes das
rotas do deployment. Deve ser 308 (permanente): com 307, o Google trata o apex
como URL canônica e ignora o redirect para consolidar sinais.
