> **Diretriz obrigatória:** leia primeiro [`DATA_HUB_DIRETRIZ_QUERY_FIRST.md`](DATA_HUB_DIRETRIZ_QUERY_FIRST.md). O motor schema-first/wide está aposentado para nova cobertura; este documento separa compatibilidade 1.x do próximo Query Engine V2.

# Data Hub no portal Dácora — estado atual

**Atualizado em 2026-09-10.** Este documento trata somente da rota `/data-hub`, seus módulos e o BFF correspondente. O portal também serve outras aplicações; trabalho de Data Hub não autoriza alterações nelas.

## Papel do portal

O Data Hub é uma funcionalidade do portal Dácora. A arquitetura vigente é:

`Portal /data-hub → BFF privado Vercel /api/data-hub/* → Cloud Run Dácora Data Hub → Hub Data API Meta → BigQuery → Google Sheets/read-back`

O portal é a superfície de escolha e operação; o repositório `Dacora Data Hub` é o backend/serviço de dados. Não duplicar lógica analítica ampla no frontend.

## Estado atual revalidado

| Componente | Estado |
| --- | --- |
| Portal | `origin/main` revalidado em `87cad2caa70e133a3ed88bfad159a9a1138acba2`; Field Picker V2 implementado apenas na branch local `feat/data-hub-field-picker-v2-ux-2026-09-10`, ainda sem push/merge/deploy |
| URL | `https://www.dacora.com.br/data-hub` |
| Backend Query Engine V2 | runtime funcional `bcfb4860e43795ad577d7db544a15835c61c0528`; Cloud Run `dacora-data-hub-00041-nwj`, Ready, 100% do tráfego |
| Catálogo V2 | **543 campos deduplicados**: 69 canônicos + 144 direct Insights novos + 330 Actions novos |
| Actions V2 | execução provada em produção; o Portal pode usar `sourceActionType`/`sourceProjection` quando publicados, sem inferir metadata ausente |
| Hub Data API Meta | fonte analítica do Data Hub permanece separada do Saldos MCP, conforme diretriz do Hub |
| Scheduler | `ENABLED`; o único schedule persistido está `disabled`, portanto não há recorrência due ativa |

Como merges documentais também geram deployment Vercel, **não fixe ID de deployment como estado canônico**; consulte `vercel inspect https://www.dacora.com.br` para o deployment corrente.

Esta atualização registra o estado revalidado pela sessão principal, mas **não representa deploy novo** do portal, do Data Hub nem do Saldos. O backend mantém `roles/run.invoker` restrito às três service accounts previstas; o grant temporário `TokenCreator` do portal está ausente.

## Compatibilidade backend 1.x já integrada — NÃO é o motor de expansão futuro

O estado integrado da expansão inclui:

- registry com **69 entradas** e schema `1.5.0`;
- migration `006` aplicada, com **6 colunas NUMERIC** e **6 views**, preservando a partição;
- matriz de **676 capacidades úteis**: **51 `supported`**, **4 `partial`** e **621 `not_implemented`**.

Esses números substituem o placar anterior de `32/11/633`. A matriz sanitizada e auditável está ligada ao código e às evidências correspondentes da PR #91; o smoke autenticado novo até Sheets/read-back continua separado dessa prova.

**Atenção:** as 69 entradas e as colunas/views da migration 006 são estado de compatibilidade do runtime publicado, não receita para novas capabilities. Desde 07/09/2026, é proibido transformar `621 not_implemented` em fila de colunas/migrations. A expansão futura pertence ao Query Engine V2.

## Contrato field-centric — fechado de ponta a ponta

O portal publicado segue o modelo por campos:

- não pergunta nível/grão manualmente;
- emite `selectedFields` em novas definições;
- remove do payload novo `entityLevel`, `fields`, `creativeFields` e `breakdowns`;
- mostra o grão apenas como consequência da seleção;
- mantém leitura/edição de definições legadas.

O golden slice foi provado com:

`selectedFields = [date, campaign_name, spend]`

Grão deduzido:

`campaign`

## Meta → BigQuery — fechado em produção

Smoke controlado na conta queryable `act_643514297405998`:

- período `2026-08-28`;
- `sync_run_id = 501547d2-5ec3-42f2-9dd8-dbfcb3072bd6`;
- `status = success`;
- `reconciliation_status = reconciled`;
- `spend = 166.14`;
- `impressions = NULL`;
- `clicks = NULL`.

A fonte independente Saldos MCP devolveu `166.14` para o mesmo recorte. Divergência: zero.

Isso prova:

`selectedFields → Hub Data API → normalização → reconciliação → BigQuery`

com distinção correta entre ausência e zero para campos não escolhidos.

## Google Sheets/read-back — fechado em produção

Depois da reautorização Google do ator, o backend conseguiu trocar o refresh token e criar planilha pela Sheets API normalmente.

O smoke field-centric inicial usou:

- período `2026-08-27`;
- baseline independente `spend = 195.48`;
- `selectedFields = [date, campaign_name, spend]`;
- revisão backend `dacora-data-hub-00031-fzv`, vigente naquele smoke.

O export terminou:

- `sheets_exports.state = succeeded`;
- `rows = 1`;
- `cols = 3`;
- range `'Página1'!A1:C2`.

Read-back real da planilha:

| Data | Nome da campanha | Investimento |
| --- | --- | ---: |
| 2026-08-27 | MENSAGENS (WhatsApp) - PEC. CORTE | 195,48 |

Portanto o portal/backend agora fecham o contrato `selectedFields` até a planilha:

- somente campos escolhidos aparecem;
- a ordem escolhida é preservada;
- `campaign_name` aparece corretamente;
- campos não escolhidos não vazam para a saída;
- valor final permanece reconciliado com fonte independente.

## Capacidades adicionais historicamente provadas

As frentes que antes eram gates deixaram de ser apenas plano e foram confirmadas no código e nos testes dos três repositórios:

- `actions` e `action_values` selecionadas são projetadas como colunas estáveis para BigQuery e Sheets, sem despejar o array cru na planilha;
- o enriquecimento de criativo funciona no grão de anúncio e preserva a seleção field-centric;
- edições concorrentes usam a revisão da extração e falham com conflito, em vez de sobrescrever silenciosamente uma definição mais nova;
- a UI continua derivando campos e compatibilidades do catálogo devolvido pelo backend.

Essas provas históricas não significam que todas as variações de actions ou todos os campos criativos do Stract já estejam cobertos. Elas comprovam compatibilidade do motor 1.x; **não autorizam repetir projeção wide por campo**. Desde 10/09/2026, o Query Engine V2 está publicado no runtime funcional `bcfb4860e43795ad577d7db544a15835c61c0528`, e Actions V2 foi provado em produção. Isso não transforma metadata ausente em contrato: o Portal só pode agrupar conceitualmente Actions quando `sourceActionType`/`sourceProjection` vierem publicados pelo catálogo.

## Correções backend descobertas pelos smokes

1. PR backend `#79`: materializou `reconciliation` no caminho Hub.
2. PR backend `#82`: correção definitiva do upsert projetado para `require_partition_filter`, usando DMLs transacionais particionáveis.
3. PR backend `#84`: fez `selectedFields` ser autoritativo também no export Sheets, preservando o layout legado para definições antigas.

Validação backend da PR #84:

- Node 22.22.0: **489/489**;
- focados Sheets: **30/30**;
- lint: OK;
- `git diff --check`: OK.

## Higiene

Os artefatos temporários dos smokes foram removidos depois da coleta de evidências:

- definições em `extractions`;
- documentos em `sheets_exports`;
- registro em `sheets_export_destinations`;
- planilhas de validação e smoke movidas para a lixeira do Google Drive.

Os `sync_runs` e linhas BigQuery permanecem como evidência auditável.

Todos os grants temporários TokenCreator foram revogados; nenhuma chave persistente foi criada.

Nenhum módulo de relatórios/RA, Supabase, envio ou outra aplicação do portal foi alterado.

## Validação do portal

### Baseline integrada anterior ao Field Picker V2

A última validação funcional integrada da frente Data Hub, sem tocar em outras aplicações, registrou:

- `npm run verifica:data-hub-casca`: OK;
- `npm run verifica:data-hub-spike`: OK;
- `npx tsc --noEmit` com `NODE_OPTIONS=--max-old-space-size=8192`: exit 0;
- build completo com `NODE_OPTIONS=--max-old-space-size=8192`: exit 0;
- `git diff --check`: OK.

A tentativa com heap padrão pode morrer por OOM no `prebuild`; a evidência canônica usa heap ampliado.

### Branch local do Field Picker V2 — 10/09/2026

A branch `feat/data-hub-field-picker-v2-ux-2026-09-10`, baseada diretamente em `origin/main = 87cad2caa70e133a3ed88bfad159a9a1138acba2`, implementa a nova UX search-first sem alterar cards de query nem contrato backend:

- busca por nome publicado, ID técnico e categoria, com ranking `exact → starts-with → word-start → substring`;
- exploração em quatro grupos humanos derivados da metadata: Métricas de performance, Ações e conversões, Dimensões e estrutura, Criativos;
- Actions com `sourceActionType` + `sourceProjection` reais são agrupadas conceitualmente, por exemplo `Video View → Quantidade / Valor / Custo`; campos sem essa metadata permanecem independentes;
- resultados recortados a 16 entradas por vez; área de selecionados paginada em 8 campos, preservando a ordem de `selectedFields`;
- estados `Pronto` e `Verificar nesta conta`, com limite de discovery sempre visível em `0/3` a `3/3` antes do erro;
- combobox/listbox com `aria-activedescendant`, multiseleção, setas, Enter, Escape, remoção nomeada, `focus-visible` e sheet de tela ampla no mobile;
- metadata do catálogo preservada no normalizador: `family`, `source`, `upstreamField`, `sourceActionType`, `sourceProjection` e `aggregation`;
- verificador focado criado em `scripts/verifica-data-hub-field-picker-v2.mts`, exposto como `verifica:data-hub-field-picker-v2`, sem alterar o `prebuild` global das outras frentes.

Prova executada nesta rodada: `git diff --check` = OK, com apenas o aviso de conversão LF→CRLF da worktree. A execução Node ainda **não foi comprovada nesta branch**: o Dácora Local Bridge recusou `npm ci` com `CLI não autorizada pela allowlist: npm`; pelas regras operacionais, essa negativa não foi contornada por PowerShell/outro executor. Portanto `verifica:data-hub-*`, TypeScript, build e Playwright desktop/mobile continuam pendentes até a capability de CLI ser restaurada. Não houve push, merge ou deploy.

## Norte vigente — Query Engine V2

O benchmark Stract integrado possui:

- **1.010 campos brutos**;
- **676 capabilities-base**;
- motor 1.x atual: **51 `supported`**, **4 `partial`**, **621 `not_implemented`**.

Esses números medem cobertura observada; **não são backlog de colunas nem de componentes do Portal**. A evidência de 07/09/2026 mostrou que o produto de referência é query-first: conta(s) + campos + período/opções; o planner resolve nível/fontes e o resultado pode ser esparso.

O Portal deve continuar derivando catálogo e compatibilidades do backend. Não manter segunda lista manual de centenas de campos e não esconder capability só porque o warehouse 1.x ainda não possui coluna wide correspondente.

## Próximo gate do Portal — aprovar o Field Picker V2

O backend Query Engine V2 está fechado para esta frente. O gate atual é exclusivamente a UX do seletor no Portal:

1. restaurar a capability autorizada de Node/npm na worktree e executar o verificador focado + `verifica:data-hub-*` pertinentes;
2. executar TypeScript/lint e build com heap ampliado;
3. validar visualmente com Playwright em desktop e mobile, sem mutações externas;
4. corrigir eventuais achados, registrar as evidências e só então considerar o seletor aprovado;
5. **depois da aprovação do seletor**, abrir em frente separada a revisão dos cards de query. Não alterar esses cards nesta fase.

Push, merge e deploy continuam sujeitos ao GO explícito do PO. Scheduler central permanece `ENABLED`, com o único schedule persistido `disabled`.

**LEGADO:** não retomar como plano “expandir hierarquia e 98 métricas”, “completar 160 actions” ou qualquer outro lote `capability → coluna → migration/view`. Essas listas antigas podem orientar probes/famílias do planner, mas não implementação física.