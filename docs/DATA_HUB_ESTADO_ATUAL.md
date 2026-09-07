> **Diretriz obrigatória:** leia primeiro [`DATA_HUB_DIRETRIZ_QUERY_FIRST.md`](DATA_HUB_DIRETRIZ_QUERY_FIRST.md). O motor schema-first/wide está aposentado para nova cobertura; este documento separa compatibilidade 1.x do próximo Query Engine V2.

# Data Hub no portal Dácora — estado atual

**Atualizado em 2026-09-07.** Este documento trata somente da rota `/data-hub`, seus módulos e o BFF correspondente. O portal também serve outras aplicações; trabalho de Data Hub não autoriza alterações nelas.

## Papel do portal

O Data Hub é uma funcionalidade do portal Dácora. A arquitetura vigente é:

`Portal /data-hub → BFF privado Vercel /api/data-hub/* → Cloud Run Dácora Data Hub → Hub Data API Meta → BigQuery → Google Sheets/read-back`

O portal é a superfície de escolha e operação; o repositório `Dacora Data Hub` é o backend/serviço de dados. Não duplicar lógica analítica ampla no frontend.

## Estado atual revalidado

| Componente | Estado |
| --- | --- |
| Portal | Vercel Production automático a cada merge em `main`; commit funcional Data Hub `fa244dc` |
| URL | `https://www.dacora.com.br/data-hub` |
| Backend | PR #91 mesclado em `2a034551d0ca301f12286208052084567ff513b0`; Cloud Run `dacora-data-hub-00035-5qn`, Ready, 100% do tráfego; build `663446cb-d964-4bc5-a99f-44dacf75e01f`, digest `sha256:3347b10b579f9bee552f38e981d3f8872f22928f4aaca295c55893ec38fdc975` |
| Rollbacks backend | `dacora-data-hub-00060-zip` (`pre-core-expansion`) e `dacora-data-hub-00031-fzv` (`pre-meta-expansion`) |
| Hub Data API Meta | Saldos no commit `eed756a`, revisão `api-00090-yok`; health 200 em `https://api-wviue4ksza-uc.a.run.app/api/health` |
| Scheduler | `PAUSED` |

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

Essas provas históricas não significam que todas as variações de actions ou todos os campos criativos do Stract já estejam cobertos. Elas comprovam compatibilidade do motor 1.x; **não autorizam repetir projeção wide por campo**. Para o Query Engine V2, o smoke autenticado novo até Sheets/read-back **ainda não foi verificado**; portanto não se deve afirmar que o novo motor está comprovado ponta a ponta.

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

Última validação funcional da frente Data Hub, sem tocar em outras aplicações:

- `npm run verifica:data-hub-casca`: OK;
- `npm run verifica:data-hub-spike`: OK;
- `npx tsc --noEmit` com `NODE_OPTIONS=--max-old-space-size=8192`: exit 0;
- build completo com `NODE_OPTIONS=--max-old-space-size=8192`: exit 0;
- `git diff --check`: OK.

A tentativa com heap padrão pode morrer por OOM no `prebuild`; a evidência canônica usa heap ampliado.

## Norte vigente — Query Engine V2

O benchmark Stract integrado possui:

- **1.010 campos brutos**;
- **676 capabilities-base**;
- motor 1.x atual: **51 `supported`**, **4 `partial`**, **621 `not_implemented`**.

Esses números medem cobertura observada; **não são backlog de colunas nem de componentes do Portal**. A evidência de 07/09/2026 mostrou que o produto de referência é query-first: conta(s) + campos + período/opções; o planner resolve nível/fontes e o resultado pode ser esparso.

O Portal deve continuar derivando catálogo e compatibilidades do backend. Não manter segunda lista manual de centenas de campos e não esconder capability só porque o warehouse 1.x ainda não possui coluna wide correspondente.

## Próximos gates — Query Engine V2

1. no Hub, inventariar os gates físicos que ainda amarram `selectedFields` a registry/schema wide;
2. implementar catálogo base + discovery contextual, planner por adaptadores e row builder dinâmico/esparso;
3. provar uma query representativa em Meta → Hub → BigQuery → Sheets → read-back **sem migration global por campo**;
4. só então adaptar/ampliar o Portal para consumir o catálogo e resultado do V2, mantendo a UI derivada do backend;
5. preservar definições 1.x legadas enquanto a transição não estiver comprovada;
6. manter `business.*` adiado até contrato/fonte próprios; billing não entra por analogia;
7. reavaliar PAR5/piloto e Scheduler somente no gate operacional separado.

**LEGADO:** não retomar como plano “expandir hierarquia e 98 métricas”, “completar 160 actions” ou qualquer outro lote `capability → coluna → migration/view`. Essas listas antigas podem orientar probes/famílias do planner, mas não implementação física.

Scheduler permanece `PAUSED`.