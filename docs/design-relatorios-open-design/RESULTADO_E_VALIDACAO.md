# Resultado da proposta e validação

Status: fatia compartilhada pronta para escolha de direção por Flávio.

Não é implementação completa do catálogo e não é o gate final da Fernanda.

## O que foi materializado

A direção recomendada, **Editorial de Performance**, foi aplicada somente às peças compartilhadas da fatia combinada:

- masthead, capa e cabeçalho de seção;
- KPIs e comparações;
- tema, legenda e rótulos de gráficos;
- tabela de entidades e cobertura parcial;
- estados de zero medido, ausência, falha, não aplicável, pausa e cobertura parcial;
- correção de níveis de título em criativos e blocos indisponíveis.

Não foi criada página por cliente. Karyne, Aviarte, Zenun e Santalberti continuam usando o mesmo esqueleto, catálogo e componentes.

## Antes × depois

| Dimensão | Antes | Proposta |
|---|---|---|
| Marca | verde-cinza aplicado a quase todas as funções | Dácora domina a página; cor de canal fica confinada à análise |
| Capa | escala grande + vazio prolongado | régua de marca, composição mais compacta e primeira seção mais próxima |
| Seções | filete superior e tamanho | índice + régua vertical + título mais firme |
| KPI | filetes monocromáticos | grade editorial branca, origem por filete de canal e número tabular |
| Comparação | seta + cor | seta + valor + palavra “favorável”, “desfavorável” ou “neutra” |
| Gráfico | canais próximos na rampa verde-cinza | paleta categórica estável + traço/textura + rótulo |
| Estado | ausência e falha visualmente próximas | texto, forma, contorno e cor por papel semântico |
| Zero | número sem confirmação | selo textual “medido” em KPI/tabela |
| Tabela móvel | várias colunas comprimidas | dimensão + métrica principal + detalhes expansíveis |

Evidências principais:

- antes desktop: `screenshots/antes/karyne-desktop-viewport.png`;
- depois desktop: `screenshots/depois/karyne-desktop-viewport.png`;
- antes celular: `screenshots/antes/karyne-mobile-viewport.png`;
- depois celular: `screenshots/depois/karyne-mobile-viewport.png`;
- tabela celular com detalhe: `screenshots/depois/karyne-tabela-mobile-detalhe.png`;
- escala de quatro plataformas: `screenshots/depois/quatro-plataformas-canais-desktop.png` e `screenshots/depois/quatro-plataformas-canais-mobile.png`;
- explorações A/B/C: `screenshots/exploracoes/comparacao-desktop.png` e `screenshots/exploracoes/comparacao-mobile.png`.

## Ciclo `od-design-refine`

### Iteração 1 — direção

Patch: hierarquia editorial, papéis de cor, KPIs, gráficos e tabela compartilhada.

Crítica: a régua da capa herdou cantos arredondados; a grade de cinco KPIs expôs uma célula vazia cinza; zero medido ainda não estava explícito na tabela.

### Iteração 2 — semântica

Patch: régua reta, fundo residual removido, polaridade escrita, zero medido na tabela, ausência/falha separadas e níveis de título corrigidos.

Crítica: Karyne passou com zero violações automáticas, mas o cenário de quatro plataformas revelou sobreposição em tabela móvel densa.

### Iteração 3 — escala e acabamento

Patch: no celular, a tabela mantém dimensão + métrica principal + ação; as demais métricas permanecem no detalhe expansível. Ajustes finais de pausa, contraste e comentários do sistema.

Crítica final: não houve overflow horizontal, sobreposição ou perda de acesso às métricas nos quatro cenários. O sistema convergiu para a fatia escolhida.

## Validação factual

### Matriz visual

| Cenário | Desktop | Celular | Resultado |
|---|---:|---:|---|
| Karyne — serviços/leads | 1440 × 900 | 390 × 844 | sem overflow; 17.037 px de altura móvel |
| Aviarte — e-commerce | 1440 × 900 | 390 × 844 | sem overflow; 32.895 px de altura móvel |
| Zenun — Google-only | 1440 × 900 | 390 × 844 | sem overflow; 10.544 px de altura móvel |
| Santalberti — Meta + Google + Pinterest + GA4/loja | 1440 × 900 | 390 × 844 | sem overflow; cores e filetes permanecem estáveis |

Karyne e Aviarte ficaram mais curtos que o baseline anterior (19.188 px e 36.519 px), sem remover conteúdo.

### Acessibilidade

- Karyne: 0 violações, 1 grupo inconclusivo para revisão manual, 50 verificações aprovadas.
- Aviarte: 0 violações, 1 grupo inconclusivo para revisão manual, 45 verificações aprovadas.
- O inconclusivo é o contraste em controles/SVG com composição transparente; a paleta foi verificada numericamente.
- Contraste das cores de canal sobre o papel: entre 5,25:1 e 5,78:1.
- Menor distância CIE76 entre canais: 18,94 (Pinterest × Instagram), contra 9,0 no par problemático anterior.
- Cor nunca atua sozinha: séries têm traço/textura/rótulo; estados têm texto/forma; comparações têm palavra de leitura.

### Responsividade e estados

- `scrollWidth = innerWidth = 390` nos quatro cenários.
- Nome longo quebra sem alargar a página.
- Tabela densa preserva todas as métricas no detalhe acionável.
- `R$ 0,00 — medido`, “sem veiculação”, “dado indisponível”, “falha na coleta”, “cobertura parcial” e “não se aplica” têm tratamentos distintos.
- Preferência `prefers-reduced-motion: reduce` foi emulada e reconhecida pelo runtime.

### Contratos e build

- `npm.cmd run build`: passou; cliente, SSR, prerender, sitemap e servidor gerados.
- `npm.cmd run verifica:revisao`: passou; snapshot carregado, checksum persistido e decisões protegidas.
- Snapshot, fixtures, JSON, checksum, catálogo, `RelatorioMontado`, `Esqueleto`, rotas e `noindex`: sem diff.
- Nenhuma dependência foi adicionada.
- Bundle de relatório atual: CSS 42,57 kB (7,99 kB gzip) e chunk compartilhado com Recharts 413,26 kB (121,31 kB gzip).
- A rota carregou uma folha do Google Fonts e um WOFF2 de Red Hat Display; nenhuma fonte nova foi introduzida pela proposta. Source Serif permanece apenas na proposta A já existente.
- `npm.cmd run lint` continua vermelho com seis erros de tipagem React já localizados em superfícies não modificadas por esta proposta; nenhum erro novo apareceu nos arquivos alterados.

## Integridade do gate

- nenhuma alteração em P3;
- nenhum push, merge, deploy ou operação Supabase;
- nenhuma mensagem real;
- nenhum relatório completo declarado como aprovado;
- nenhum pedido de reaprovação de conteúdo/checksum por mudança visual.

## Recomendação ao Flávio

Aprovar a direção **Editorial de Performance** como base do Gate 1. Se aprovada, a próxima tarefa deve aplicar o sistema ao catálogo inteiro e produzir dois relatórios completos realistas para o Gate 3 da Fernanda: um de serviços/leads e um de e-commerce.
