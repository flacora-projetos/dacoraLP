# Auditoria visual — estado anterior

Data da captura: 7 de agosto de 2026

Branch: `codex/design-relatorios-open-design`

Base auditada: `21ba67386b91d6c08d9fd2ba9905cb7ede32f2f1`

## Escopo e evidências

Foram auditados os fixtures montados que representam os dois formatos que chegarão ao gate final:

- Karyne Magalhães — serviços/leads;
- Aviarte — e-commerce.

Viewports usados:

- desktop: 1440 × 900;
- celular: 390 × 844, contexto equivalente à abertura pelo WhatsApp.

Arquivos de evidência:

- `screenshots/antes/karyne-desktop-viewport.png`
- `screenshots/antes/karyne-desktop-full.png`
- `screenshots/antes/karyne-mobile-viewport.png`
- `screenshots/antes/karyne-mobile-full.png`
- `screenshots/antes/aviarte-desktop-viewport.png`
- `screenshots/antes/aviarte-desktop-full.png`
- `screenshots/antes/aviarte-mobile-viewport.png`
- `screenshots/antes/aviarte-mobile-full.png`

## Diagnóstico factual

### Hierarquia e ritmo editorial

- A capa usa escala grande, mas a distância até a primeira seção cria um vazio que não acrescenta significado. No celular, a primeira decisão útil fica abaixo da primeira dobra.
- O resumo executivo é um único bloco verde escuro muito dominante. Depois dele, quase todas as seções voltam à mesma combinação de papel, branco, filete e texto verde-cinza.
- Títulos, índices e linhas horizontais distinguem capítulos, mas não criam âncoras suficientes para navegar por documentos de 19.188 px (Karyne) e 36.519 px (Aviarte) no celular.
- As superfícies repetidas têm pesos próximos. KPI, tabela, gráfico, qualidade da fonte e alerta parecem variações do mesmo cartão.

### Cor

- A identidade Dácora está presente, porém aplicada de forma quase monocromática a funções que precisam ser separadas.
- Meta, Google, Pinterest e GA4 usam degraus próximos da mesma rampa verde-cinza. Isso preserva a marca, mas reduz a diferenciação funcional, especialmente entre Google/Pinterest/GA4.
- O ferrugem concentra publicação pendente, ausência, falha e comparação desfavorável. Esses estados não são equivalentes.
- Tons claros de sage são usados em texto, eixos e datas. A auditoria automatizada encontrou contraste sério insuficiente em 15 nós na Karyne e 38 na Aviarte, além de itens inconclusivos em SVG e controles.

### KPIs e comparações

- O número tem boa escala, mas cartões vizinhos não têm uma leitura clara de rótulo → valor → contexto → comparação.
- A implementação já respeita a polaridade real da métrica por `direcaoFavoravel`; o problema é visual: seta e cor carregam significado demais e não mostram a palavra “favorável”, “desfavorável” ou “neutra”.
- Investimento, custo e resultado podem parecer pertencer à mesma categoria visual, embora peçam leituras diferentes.

### Gráficos e legendas

- Traços e hachuras ajudam, mas as cores próximas tornam a leitura comparativa lenta e não escalam bem para quatro plataformas.
- Rótulos de eixo têm contraste baixo em alguns contextos.
- A legenda é estável no código, mas visualmente discreta demais para sustentar documentos mensais longos.
- Recharts já está restrito às rotas de relatório e já respeita preferência por movimento reduzido; isso deve ser preservado.

### Tabelas e densidade

- As tabelas semânticas e os detalhes expansíveis preservam os dados, mas linhas, metadados e estados competem em tons muito próximos.
- No celular não há overflow horizontal real: Karyne e Aviarte permaneceram com `scrollWidth = 390`. A contrapartida é uma página muito longa, com perda de contexto entre cabeçalho, legenda e linha.
- Nomes longos e observações de indisponibilidade precisam de estilos próprios de quebra e de estado, sem depender de truncamento.

### Estados de dados

O contrato já separa valor medido, ausência, falha e não aplicável; a UI ainda não oferece uma taxonomia completa para o usuário:

- zero medido aparece como qualquer outro número, sem confirmação de que houve medição;
- “sem veiculação” aparece como observação textual, sem sinal de pausa consistente;
- dado ausente e falha compartilham quase o mesmo tratamento ferrugem;
- cobertura parcial aparece em bloco separado, porém sem vocabulário visual reutilizável;
- não aplicável é neutro, mas ainda pode ser confundido com ausência ao escanear.

### Acessibilidade e estrutura

- Karyne: 2 violações, 1 item inconclusivo e 49 verificações aprovadas.
- Aviarte: 2 violações, 1 item inconclusivo e 41 verificações aprovadas.
- Violações comuns: contraste sério e salto de nível de título moderado.
- Não foram encontrados erros JavaScript da página; o console continha apenas mensagens de desenvolvimento do Vite/React.

## O que não é problema

- Não há overflow horizontal de página nos dois celulares auditados.
- Ausência não é convertida em zero no contrato nem no componente atual.
- A polaridade das comparações não é deduzida ingenuamente de “subiu/desceu”.
- O relatório já é `noindex`, usa catálogo compartilhado e mantém gráficos com tabela/resumo textual.

Esses contratos são baseline de regressão e não podem ser sacrificados pelo redesign.
