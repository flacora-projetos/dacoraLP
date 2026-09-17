# Plano — seletor de campos: busca, layout e nomes

Status: **FRENTE ABERTA em 2026-09-17. Não iniciada. Nenhum código alterado.**

Repositórios: `flacora-projetos/dacoraLP` (tela) e `flacora-projetos/dacora-data-hub` (catálogo e rótulos). Worktree: `repo-worktrees/data-hub-seletor-campos-ux`, branch `feat/data-hub-seletor-campos-ux`, a partir de `origin/main` (`34eb0e8`).

Origem: quatro críticas do PO sobre a tela publicada em 17/09/2026. Revisão apoiada nas Web Interface Guidelines.

## 1. Jargão interno vazando para o usuário

`Buscar campos V2` é nome de motor, não de produto. O usuário não escolhe entre V1 e V2: existe uma tela, e ela busca campos.

Ocorrências verificadas em `src/pages/data-hub-query-v2.tsx`:

- rótulo `Buscar campos V2`;
- legenda `Campos do catálogo V2`;
- botão `Executar consulta V2`;
- confirmação `Consulta V2 concluída`;
- cabeçalho de seção `Query Engine V2`;
- o texto de apoio menciona `discovery`, termo interno.

Regra para esta frente: **nenhum texto visível cita versão de motor, `discovery`, `grain`, `queryRunId` ou nome de rota.** Estado técnico útil pode continuar disponível, mas como detalhe secundário e em português comum.

O `queryRunId` merece decisão à parte: ele é a referência que liga a consulta à entrega. Manter, mas rotulado como "referência desta consulta", não como identificador de execução.

## 2. O campo de busca não é um combobox

Hoje o campo é um `<input type="search">` solto e a lista de campos é uma grade estática logo abaixo, sempre renderizada. Não existe relação declarada entre o campo e a lista.

Comportamento do benchmark, que é o alvo: **ao focar, abre a lista de opções; ao digitar, filtra.**

Faltam, pelas Web Interface Guidelines:

- `role="combobox"` com `aria-expanded`, `aria-controls` e `aria-activedescendant`;
- lista com `role="listbox"` e opções com `role="option"`;
- navegação por teclado: setas, Enter, Esc, Home/End;
- foco visível e `:focus-within` no grupo;
- estado vazio: busca sem resultado hoje renderiza um `fieldset` vazio, só com a legenda.

Decisão pendente do PO, porque muda o desenho: com o catálogo em 655 chaves, **abrir a lista inteira ao focar é uma parede de opções**. Duas saídas:

1. abrir já filtrado por um recorte útil (executáveis primeiro, ou os mais usados), com o resto acessível ao digitar;
2. abrir tudo, com carregamento por rolagem.

Recomendo a primeira: o benchmark abre uma lista navegável, não um despejo. Não implementar antes da decisão.

## 3. Sobreposição de texto e aspereza visual

Causa encontrada, não suposta.

**Sobreposição.** `.dch-query-v2__campos` é uma grade `repeat(auto-fit, minmax(14rem, 1fr))` e cada item é `.dch-opcao { display: flex }`. O `<span>` do rótulo não tem `min-width: 0`, então um identificador longo e sem espaços — por exemplo `action.messaging_conversation_started.count` — estoura a coluna e invade a vizinha. É o item "flex children require min-w-0" das guidelines, combinado com a falta de `overflow-wrap`.

**Aspereza.** `data-hub-query-v2.css` usa `border: 1px solid currentColor` em dois lugares — a moldura dos campos e a tabela de resultado. O resto do Data Hub usa `var(--dc-filete-forte)`. Por isso essas bordas saem em contraste cheio, pesadas, fora da linguagem da Dácora.

**Alinhamento.** `.dch-opcao` usa `align-items: center`, mas o rótulo tem duas linhas (nome + estado). Já existe `.dch-opcao--detalhada` com `align-items: flex-start` para exatamente esse caso e ela não está sendo usada aqui.

Correções desta frente:

- `min-width: 0` e `overflow-wrap: anywhere` no rótulo;
- bordas pelos tokens da marca, nunca `currentColor`;
- alinhamento ao topo quando o rótulo tem duas linhas;
- densidade e respiro revistos depois que a lista virar combobox, porque o container muda.

## 4. Nomes dos campos — estratégia

### O que foi descoberto

Os rótulos exibidos hoje **vêm do snapshot do benchmark**: o gerador do catálogo copia o campo `text` de `docs/benchmarks/stract-facebook-ads-fields-2026-09-06.json` para `label`.

Isso é mais do que um problema de idioma. A diretriz canônica do projeto diz que o benchmark define **comportamento e cobertura, não identidade nem texto**. Estamos exibindo o texto do produto de referência. Trocar os rótulos não é só tradução: **remove texto emprestado.**

### Volume real

Contado no catálogo gerado, não estimado:

```text
655 chaves no catálogo
  117 tipos de ação distintos
   44 tipos de conversão distintos
  172 campos diretos de Insights
= 333 nomes a traduzir, não 655
```

As três projeções de cada ação e conversão — contagem, valor e custo — são **composição**, não entradas separadas. Um nome de ação rende três rótulos por regra determinística.

### Proposta

1. **Dicionário pt-BR no Data Hub**, versionado, chaveado pelo identificador upstream (`action_type`, campo de Insights), com o vocabulário do gerenciador da Meta — que é a linguagem que o usuário já conhece, e é terminologia da plataforma, não texto de concorrente.
2. **Composição das projeções** por regra: nome da ação, valor da ação, custo por ação.
3. **Fallback que nunca mostra texto emprestado:** sem entrada no dicionário, derivar um nome legível do próprio identificador. O `text` do benchmark deixa de alimentar `label`.
4. **Prioridade por uso real:** começar pelos campos executáveis e pelos que aparecem nas consultas reais, não pelos 333 de uma vez.
5. **Identificador técnico continua acessível**, como detalhe secundário, para quem precisa casar com a API.

É trabalho de curadoria, não de engenharia pesada: a geração é determinística e testável, e a revisão dos nomes é do PO.

### Pergunta aberta

Não existe fonte automática dos nomes em português da Meta: a API de Insights não devolve rótulo localizado. Portanto o dicionário é curado. **Decisão do PO:** revisar os 333 de uma vez, ou aprovar em lotes por família?

## 5. Gates de GO

- typecheck e build do portal verdes;
- verificação nova cobrindo: filtro da busca, estado vazio, navegação por teclado do combobox e ausência de jargão nos textos visíveis;
- no Data Hub, teste de geração determinística do dicionário e de que nenhum `label` vem do snapshot do benchmark;
- revisão visual do PO em telas larga e estreita antes do deploy;
- deploy sob GO explícito do PO.

## 6. Riscos

- **Combobox mal feito piora o que existe:** grade estática ao menos é navegável por teclado nativamente. Sem setas, Esc e foco visível, o combobox regride acessibilidade.
- **Tradução inventada:** nome que não existe no gerenciador da Meta confunde mais que o termo em inglês. Sem certeza, manter o identificador e marcar para revisão.
- **Perder o contrato de ausência na leitura:** o traço que hoje marca campo ausente na tabela precisa sobreviver a qualquer redesenho. Vazio continua sendo vazio, também visualmente.
