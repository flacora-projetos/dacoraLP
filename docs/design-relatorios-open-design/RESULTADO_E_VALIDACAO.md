# Resultado da expansão e validação local

Status: direção A e implementação completa aprovadas por Flávio; publicação em produção autorizada e verificada em 07/08/2026. A validação nominal de Fernanda não foi registrada neste documento e a P3 continua separada.

**Correção funcional posterior, aprovada pelo Flávio em 2026-08-07:** o redesign já preservava miniaturas quando elas existiam, mas os snapshots reais sempre traziam `miniatura: null`. A branch `codex/criativos-relatorios` liga o painel ao Storage privado e foi provada com Karyne v3 (8/8) e Aviarte v3 (30/30) em HTTP 200, com custo por resultado e status traduzido/datado. A fila mostra somente a versão corrente e mantém as anteriores no banco. Isso não altera nem autoriza P3.

Neste documento, a aprovação do Flávio é uma decisão de produto, direção visual
e publicação dada pelo PO no chat; não é revisão de código. Validação técnica,
testes e evidências são responsabilidade do agente executor.

## O que mudou no catálogo compartilhado

A linguagem **Editorial de Performance** foi expandida sem página, tema ou exceção por cliente:

- oportunidades e próximos passos ganharam régua por papel editorial, sem inferir “bom” ou “ruim” a partir do número;
- canais se distinguem por filete funcional de plataforma, mantendo a identidade Dácora como linguagem dominante;
- confronto entre mídia e loja preserva pesos idênticos e apresenta a diferença em campo neutro;
- ranking de criativos virou lista editorial compacta, com miniaturas reais preservadas e ausência de miniatura sem ocupar um cartão quadrado inteiro;
- comentário humano passou a funcionar como leitura assinada, distinto da apuração automática;
- glossário ganhou numeração e ritmo de referência rápida;
- indisponibilidade ganhou rótulo textual neutro e continua diferente de falha de coleta;
- fontes agora separam visualmente plataforma, no topo, de disponibilidade, na lateral e no texto do chip;
- tabelas, gráficos, KPIs, cobertura parcial, zero medido, comparações e navegação mantêm a fatia aprovada no Gate 1.

O markup novo é exclusivamente apresentacional (`data-plataforma`, `data-papel`, `data-tom` e rótulo neutro). Snapshot, JSON, checksum, tipos, catálogo, rotas, `noindex` e conteúdo dos fixtures não mudaram. Snapshots antigos continuam usando os mesmos renderizadores compartilhados e uma mudança de CSS não reabre a aprovação de conteúdo da P3.

## Gates

| Critério | Gate | Estado |
|---|---|---|
| Direção, marca, hierarquia, densidade e papéis de cor | Flávio — Gate 1 | aprovado: direção A |
| Catálogo completo, estados, escala, responsividade e regressão | Flávio — Gate 2 | aprovado em 07/08/2026 |
| Karyne e Aviarte completas, conteúdo e acabamento | Fernanda — Gate 3 | sem registro nominal neste documento |

A fatia do Gate 1 serviu para escolher direção. Os dois relatórios completos abaixo são a unidade correta para a validação da Fernanda.

## Links publicados

- Karyne — serviços/leads: <https://www.dacora.com.br/relatorios/demo/karyne>
- Aviarte — e-commerce: <https://www.dacora.com.br/relatorios/demo/aviarte>
- Zenun — Google-only: <https://www.dacora.com.br/relatorios/demo/zenun>
- escala de quatro plataformas: <https://www.dacora.com.br/relatorios/demo/ecommerce>

Todos responderam `200`; as rotas de relatório mantêm `X-Robots-Tag: noindex, nofollow, noarchive`.

## Como reabrir a prévia local

O servidor de validação foi encerrado depois da publicação. Para refazer a
comparação no worktree, inicie o Vite em 4173 e use:

- Karyne — serviços/leads: `http://127.0.0.1:4173/relatorios/demo/karyne`
- Aviarte — e-commerce: `http://127.0.0.1:4173/relatorios/demo/aviarte`
- Zenun — Google-only: `http://127.0.0.1:4173/relatorios/demo/zenun`
- escala de quatro plataformas: `http://127.0.0.1:4173/relatorios/demo/ecommerce`

A porta 3000 pertencia ao processo local do checkout protegido da P3. Em
07/08/2026, o Flávio mandou colocarmos esta validação nela porque é o callback
local autorizado no Supabase. Somente o processo foi parado; arquivos da P3
permanecem intocados. 4173 continua reservada para comparação das fixtures.

## Adendo — prova dos criativos reais

Esta prova é funcional e posterior ao gate visual histórico acima. As versões 3
foram gravadas no banco com estado `gerado`, preservando as versões anteriores. O painel
mantém o snapshot privado no banco, valida cliente e competência no servidor e
assina apenas a cópia enviada ao navegador. O teste real obteve 38/38 imagens em
HTTP 200; `npm.cmd run verifica:revisao` cobre imutabilidade e bloqueio de caminho
de outro cliente. O Flávio confirmou as imagens carregadas e autorizou commit,
merge e push desta correção.

Regra permanente: implementação e documentação são a mesma unidade de entrega;
nenhum gate, commit, merge ou push encerra trabalho com estado canônico atrasado.
Atualizar documentos vigentes sem reescrever evidência histórica concluída.

## Antes × depois

| Cenário | Baseline antes | Gate 2 depois |
|---|---|---|
| Karyne desktop | `screenshots/antes/karyne-desktop-full.png` | `screenshots/gate2/karyne-desktop-completo.png` |
| Karyne celular | `screenshots/antes/karyne-mobile-full.png` | `screenshots/gate2/karyne-mobile-completo.png` |
| Aviarte desktop | `screenshots/antes/aviarte-desktop-full.png` | `screenshots/gate2/aviarte-desktop-completo.png` |
| Aviarte celular | `screenshots/antes/aviarte-mobile-full.png` | `screenshots/gate2/aviarte-mobile-completo.png` |
| Zenun Google-only | baseline da fatia: `screenshots/depois/zenun-desktop-viewport.png` | `screenshots/gate2/zenun-google-only-desktop-completo.png` |
| Quatro plataformas | baseline da fatia: `screenshots/depois/quatro-plataformas-desktop-viewport.png` | `screenshots/gate2/quatro-plataformas-desktop-completo.png` |

Versões móveis de regressão: `screenshots/gate2/zenun-google-only-mobile-completo.png` e `screenshots/gate2/quatro-plataformas-mobile-completo.png`.

## Ciclo `od-design-refine`

### Iteração 1 — catálogo e densidade

Direção: substituir os blocos que ainda pareciam cartões de dashboard por estruturas editoriais compartilhadas.

Patch: ranking compacto, papéis de leitura, canais, confronto, comentários, glossário, indisponibilidade e fontes.

Crítica: a altura móvel de Aviarte caiu de 32.895 px para 27.202 px sem remover conteúdo, mas rankings com quantidade ímpar deixavam uma célula residual vazia no desktop.

### Iteração 2 — escala e convergência

Direção: resolver apenas a lacuna estrutural encontrada e revisar os blocos mais densos nos quatro cenários.

Patch: último item ímpar ocupa a largura editorial sem mudar o componente; mobile mantém uma coluna; origem e disponibilidade permanecem em eixos diferentes.

Crítica: Karyne, Aviarte, Zenun e quatro plataformas não apresentaram overflow, sobreposição, célula residual ou perda de conteúdo. O sistema convergiu em duas iterações.

## `impeccable-design-polish`

- nenhum gradiente decorativo, ícone gratuito, glassmorphism, movimento ou dependência foi adicionado;
- as hachuras existentes têm função de cobertura parcial ou ausência de miniatura;
- cor de plataforma fica confinada a origem, série, legenda e filete;
- atenção não significa resultado negativo; confronto mídia × loja e investimento permanecem neutros quando o contrato assim define;
- zero medido, sem veiculação, dado ausente, falha, cobertura parcial e não aplicável mantêm texto e forma além da cor;
- nomes longos quebram dentro do bloco; tabelas densas preservam dimensão, métrica principal e detalhes no celular;
- `prefers-reduced-motion: reduce` foi emulado e reconhecido pelo runtime.

## Validação factual

### Matriz visual

| Cenário | Desktop 1440 × 900 | Celular 390 × 844 | Overflow horizontal |
|---|---:|---:|---:|
| Karyne — serviços/leads | 11.278 px | 15.882 px | não |
| Aviarte — e-commerce | 18.712 px | 27.202 px | não |
| Zenun — Google-only | 7.587 px | 9.946 px | não |
| Quatro plataformas | 10.394 px | 15.995 px | não |

Nos quatro cenários, `scrollWidth` foi igual a `innerWidth`: 1440 no desktop e 390 no celular.

### Acessibilidade e runtime

| Cenário | Violações axe | Inconclusivos | Verificações aprovadas |
|---|---:|---:|---:|
| Karyne | 0 | 1 | 49 |
| Aviarte | 0 | 1 | 45 |
| Zenun | 0 | 1 | 47 |
| Quatro plataformas | 0 | 1 | 47 |

O único grupo inconclusivo é contraste automático em SVG/Recharts e elementos sobre hachura, cuja cor de fundo o axe não consegue determinar. Não houve erro JavaScript registrado. Estados e séries não dependem só de cor.

### Build, contratos e performance

- `npm.cmd run build`: passou, incluindo cliente, SSR, prerender, sitemap e servidor;
- `npm.cmd run verifica:revisao`: passou;
- `npm.cmd run verifica:fila`: passou;
- `npm.cmd run verifica:painel`: passou;
- `npm.cmd run verifica:refoco`: passou;
- fixtures, snapshot, tipos, catálogo, rotas, checksum e `noindex`: sem diff;
- nenhuma dependência, fonte ou imagem decorativa adicionada;
- CSS de relatórios: 49,28 kB, 8,83 kB gzip;
- chunk compartilhado com Recharts: 413,32 kB, 121,32 kB gzip;
- `npm.cmd run lint` permanece vermelho com os mesmos seis erros de tipagem React já documentados antes desta expansão; nenhum erro novo foi introduzido.
- `npm.cmd audit --omit=dev` sinaliza a advisory `GHSA-qwww-vcr4-c8h2` por
  faixa de versão do React Router. Ela afeta somente APIs RSC instáveis; este
  projeto usa `BrowserRouter` e não usa RSC. Não foi aplicado o downgrade
  forçado e incompatível sugerido pelo `npm audit`.

## Integridade do gate

- nenhuma alteração em P3 ou Supabase;
- publicação limitada aos commits aprovados do redesign e desta atualização documental;
- nenhum merge no checkout da P3, nenhuma operação Supabase e nenhum envio real;
- nenhuma página ou exceção por cliente;
- nenhum relatório declarado aprovado por Fernanda;
- nenhuma reaprovação de conteúdo solicitada por mudança apresentacional.

## Estado de produção

O redesign compartilhado está publicado. Qualquer ajuste posterior deve continuar no sistema compartilhado, nunca por cliente. P3, Supabase e envio de relatórios permanecem fora deste escopo.
