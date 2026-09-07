# Diretriz do Portal — Data Hub query-first / field-centric

Status: **CANÔNICO PARA QUALQUER TRABALHO EM `/data-hub`.**

Fonte arquitetural superior no backend: `@projects/Dacora Data Hub/docs/DIRETRIZ_QUERY_FIRST_FIELD_CENTRIC.md` e `@projects/Dacora Data Hub/docs/LEGADO_MOTOR_SCHEMA_FIRST.md`.

## Decisão vigente desde 07/09/2026

O Data Hub aposentou o motor schema-first/wide como estratégia de expansão:

```text
capability → registry → coluna física → migration → views → próximo lote
```

Esse caminho continua apenas como compatibilidade do runtime já publicado. **Não deve orientar o frontend, o BFF, o catálogo visual nem os próximos prompts do Portal.**

O produto passa a ser modelado como construtor de query:

```text
conta(s)
+ campos selecionados
+ período/granularidade
+ filtros/atribuição/opções
        ↓
Query Planner V2 no backend Hub
        ↓
resultado tabular dinâmico/esparso
```

## Papel do Portal

O Portal é a superfície de configuração e operação. Ele deve:

- apresentar contas e campos disponíveis conforme o catálogo devolvido pelo backend;
- tratar `selectedFields` como intenção do usuário;
- não exigir seletor manual de `campaign/adset/ad` quando o grão puder ser deduzido pelos campos;
- permitir que o backend informe compatibilidade, disponibilidade e metadata por campo;
- preservar a ordem escolhida dos campos quando essa ordem fizer parte do contrato;
- distinguir visualmente indisponibilidade/vazio de zero quando necessário;
- manter definições 1.x legadas operáveis durante a transição.

O Portal **não deve**:

- manter uma segunda lista manual de centenas de capabilities;
- esconder campos só porque o BigQuery atual não possui coluna wide correspondente;
- recriar no frontend regras de endpoint/Graph API que pertencem ao planner;
- tratar `51/4/621` como backlog de componentes ou colunas;
- sugerir “expandir 98 métricas” ou “160 actions” por lotes wide;
- converter célula vazia/null/ausente em zero automaticamente;
- reativar seletor manual de nível como solução para incompatibilidades.

## Evidência do benchmark Stract

A pesquisa de 07/09/2026 no Hub, baseada em prints do PO + scrape público completo da categoria Facebook Ads da Stract, confirmou:

- a UX central é **Selecione os Campos**;
- período e opções são blocos independentes;
- múltiplas contas podem ser selecionadas;
- o nível/grão decorre das dimensões/campos presentes;
- custom conversions e outros campos contextuais podem aparecer após discovery/refresh da conta;
- o resultado é tabular e pode conter células vazias;
- “substituir células vazias por zero” é opção posterior, portanto vazio e zero são estados diferentes.

## Estado de compatibilidade

O Portal publicado já usa `selectedFields` e não exige nível manual para novas definições. Isso é um ativo do Query Engine V2, não algo a reverter.

O backend wide e os exports 1.x atuais continuam funcionando até migração explícita. O Portal deve preservar essas definições antigas, mas **não usar sua estrutura como limite do seletor novo**.

## Próximo gate real

O próximo marco não é ampliar um lote de campos no frontend. É provar o Query Engine V2 no backend com uma query representativa sem migration global por campo e, então, fazer o Portal consumir o catálogo/resultados desse motor.

Até esse spike existir:

- manter UI derivada do backend;
- não criar regras locais para “compensar” gaps do motor atual;
- não declarar o novo smoke Portal → Sheets concluído sem read-back real;
- Scheduler permanece `PAUSED` conforme o gate operacional separado.

## Regra para sessões futuras

Antes de tocar `/data-hub`, BFF, seletor de campos ou documentação Data Hub:

1. ler `AGENTS.md` e `CLAUDE.md`;
2. ler este documento;
3. ler `docs/DATA_HUB_ESTADO_ATUAL.md`;
4. se o workspace Hub estiver disponível, ler a diretriz e o tombstone canônicos no Hub;
5. tratar qualquer plano anterior de expansão por lotes/colunas como **LEGADO**, mesmo se estiver em handoff ou prompt datado.
