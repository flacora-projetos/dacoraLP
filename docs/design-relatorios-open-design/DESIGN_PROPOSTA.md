# Proposta Open Design — relatórios mensais Dácora

Status: Gate 1 aprovado por Flávio em 06/08/2026; direção A — Editorial de Performance — autorizada para expansão. Gates 2 e 3 ainda aguardam revisão humana.

Este arquivo é separado de qualquer `DESIGN.md` do produto e não substitui a identidade existente.

## Como as skills orientaram a direção

`creative-director` foi usada como orquestradora: primeiro definiu-se o que “bom” significa para Flávio, Fernanda e o cliente; depois vieram auditoria, alternativas comparáveis, implementação representativa e crítica.

`design-brief` organizou as oito dimensões do problema, mas seus presets fechados não foram adotados. A identidade e os tokens reais da Dácora prevalecem.

`frontend-design` impõe uma direção estética explícita, produção real, responsividade e acessibilidade — sem montar um dashboard SaaS genérico.

`od-design-refine` estrutura até três ciclos de direção → patch → crítica. Cada ciclo deve mudar a menor camada compartilhada capaz de resolver o problema observado.

`impeccable-design-polish` fecha o trabalho com uma inspeção anti-“AI slop”: sem gradientes genéricos, cartões decorativos em excesso, ícones gratuitos ou movimento sem função.

## Brief em oito dimensões

### 1. Intenção

Transformar o relatório mensal em um documento editorial de performance: rápido de escanear no celular, confiável para aprovação no desktop e claro sobre o que foi medido, o que não aconteceu e o que não pôde ser coletado.

### 2. Público e contexto

- Cliente: abre o link pelo WhatsApp, normalmente em 390 px, e procura o essencial antes dos detalhes.
- Fernanda: valida conteúdo e apresentação no desktop/painel, incluindo tabelas densas, nomes longos e fontes incompletas.
- Flávio: escolhe primeiro a direção estética por uma fatia comparável; essa escolha não equivale à aprovação final.

### 3. Personalidade

Precisa, sóbria, humana e editorial. Mais “relatório de performance preparado por especialistas” do que “painel de software”. A página pertence à Dácora; cores de plataforma só têm função analítica.

### 4. Conteúdo e hierarquia

Ordem de leitura prioritária: competência e estado de publicação → síntese → KPIs → tendência → entidades/alertas → rastreabilidade. Hierarquia deve usar escala, peso, espaço, régua, superfície e rótulo; cor nunca é o único sinal.

### 5. Sistema visual

- Tipografia: Red Hat Display já carregada; nenhuma fonte nova.
- Base: papel quente, tinta verde muito escura e verde Dácora.
- Formas: cantos moderados, réguas editoriais, tabulação numérica e pouco volume de cartões.
- Gráficos: cor de canal estável entre meses, reforçada por traço, textura e rótulo.
- Movimento: nenhum novo movimento; respeitar `prefers-reduced-motion`.

### 6. Interação

Sem navegação de dashboard. O documento deve continuar linear, com seletor de competência e detalhes expansíveis existentes. Foco visível, alvos confortáveis e cabeçalhos de tabela compreensíveis.

### 7. Restrições

- Redesign puramente apresentacional.
- Nenhuma alteração em snapshot, JSON, checksum, catálogo de blocos ou contrato de dados.
- Snapshots antigos continuam renderizando.
- Nenhum tema ou exceção por cliente.
- Sem pizza, eixo duplo, gradiente decorativo ou dependência nova.
- `noindex`, responsividade e ausência ≠ zero permanecem.

### 8. Evidência de sucesso

- Desktop 1440 × 900 e celular 390 × 844 sem overflow horizontal.
- Contraste WCAG AA para texto e 3:1 para elementos gráficos essenciais.
- As quatro plataformas permanecem distinguíveis em cor, traço/textura e texto.
- Zero medido, sem veiculação, ausente, falha e parcial são reconhecíveis sem depender apenas da cor.
- Build e verificadores de contrato passam sem alterar fixtures/checksums.

## Três direções exploradas

As três explorações usam a mesma fatia factual do fixture Karyne: cabeçalho, competência, cinco KPIs, evolução do investimento e uma entidade sem veiculação.

### A — Editorial de Performance — recomendada

Régua verde Dácora, capa compacta, números tabulares, seções com contraste editorial e cor de canal apenas nos elementos analíticos. É a melhor combinação de marca, leitura em WhatsApp e escalabilidade para quatro plataformas.

### B — Instrumento de Mídia

Mais densa, modular e técnica, com grade explícita e aparência de ferramenta operacional. Escaneia bem, mas se aproxima demais de um dashboard SaaS e perde a sensação de documento fechado.

### C — Caderno Executivo

Mais próxima de um relatório impresso, com grandes faixas de tinta e composição assimétrica. Tem presença de marca, porém consome mais área vertical e pode dificultar tabelas longas no celular.

## Direção recomendada: Editorial de Performance

### Papéis de cor

| Papel | Token proposto | Uso |
|---|---:|---|
| Marca primária | `#014029` | masthead, títulos-chave, foco e assinatura |
| Marca média | `#02593A` | apoio, regras e elementos ativos |
| Tinta | `#0D1F18` | texto principal e e-commerce |
| Texto secundário | `#40544B` | explicações e metadados acessíveis |
| Papel | `#F2EFEB` | fundo do documento |
| Superfície | `#FFFFFF` | tabelas e blocos analíticos |
| Meta | `#176B87` | série/legenda Meta |
| Google | `#8A5700` | série/legenda Google |
| Pinterest | `#9B3D4D` | série/legenda Pinterest |
| GA4 | `#6955A3` | série/legenda GA4 |
| Instagram | `#9B416F` | série/legenda Instagram |
| CRM | `#006B5B` | série/legenda CRM |
| Atenção editorial | `#98500F` | pendência ou atenção explícita |
| Falha | `#8E3D32` | falha de fonte, sempre com texto/ícone |
| Favorável | `#176B52` | somente quando a métrica define a leitura como favorável |
| Desfavorável | `#8E3D32` | somente quando a métrica define a leitura como desfavorável |
| Neutro | `#52665D` | variação sem polaridade e estados neutros |

A página não vira um arco-íris: os matizes de plataforma ficam confinados a série, marcador, legenda e pequeno filete de origem. O restante continua no sistema Dácora.

### Taxonomia visual de disponibilidade

| Estado | Tratamento | Regra semântica |
|---|---|---|
| Zero medido | `0` em tinta + selo textual “medido” | houve coleta e o valor foi zero |
| Sem veiculação | símbolo de pausa + faixa neutra tracejada + texto | a plataforma/campanha não veiculou; não é falha nem zero implícito |
| Dado ausente | contorno pontilhado + “dado indisponível” | o valor não existe no snapshot |
| Fonte com falha | marcador de falha + ferrugem + “falha na coleta” | houve erro de obtenção; nunca vira zero |
| Cobertura parcial | filete informativo + padrão hachurado + “cobertura parcial” | parte do universo foi medida; números continuam válidos dentro do escopo declarado |
| Não aplicável | traço + “não se aplica” em neutro | não é pendência nem problema |

### Orçamento de performance

- zero fontes novas e zero imagens decorativas;
- zero bibliotecas novas; manter Recharts lazy nas rotas privadas;
- nenhuma animação nova e movimento reduzido preservado;
- apenas CSS/tokens e markup apresentacional compartilhado;
- cores e legendas são constantes, nunca derivadas da ordem dos dados do mês;
- baseline de screenshots em 1440 × 900 e 390 × 844 para Karyne e Aviarte;
- matriz de escala: Karyne, Aviarte, Zenun Google-only e Santalberti quatro plataformas.

## Gates e critérios de aceitação

### Gate 1 — escolha da direção por Flávio — aprovado

- A/B/C foram comparadas com exatamente o mesmo conteúdo;
- Flávio aprovou a direção A — Editorial de Performance;
- a aprovação cobre identidade, hierarquia, densidade e papéis de cor;
- a fatia não foi tratada como aprovação final da Fernanda.

### Gate 2 — implementação completa do catálogo

- aplicar a direção aprovada a todos os blocos compartilhados, sem exceção por cliente;
- completar a taxonomia dos cinco estados e validar nomes longos/tabelas densas;
- garantir snapshots antigos, JSON, checksum, catálogo e `noindex` inalterados;
- validar Karyne, Aviarte, Zenun Google-only e cenário de quatro plataformas;
- consolidar regressão visual, contraste, overflow, movimento reduzido e orçamento de performance.

### Gate 3 — validação final da Fernanda

- apresentar dois relatórios completos e realistas: serviços/leads e e-commerce;
- Fernanda valida leitura, conteúdo, estados indisponíveis, tabelas e acabamento no desktop;
- somente essa validação pode autorizar o fechamento visual; mudanças de CSS/componentes não reabrem a aprovação do conteúdo P3.

## Limite atual desta proposta

Nesta branch a direção A foi expandida para o catálogo compartilhado e materializada nos relatórios completos de Karyne e Aviarte, com Zenun e o cenário de quatro plataformas como regressão. O trabalho continua sendo uma proposta local: Gate 2 depende da revisão de Flávio e Gate 3 depende da validação da Fernanda. Nenhuma mudança visual autoriza P3, publicação ou reaprovação de conteúdo.
