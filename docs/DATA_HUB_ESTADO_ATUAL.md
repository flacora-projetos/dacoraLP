# Data Hub no portal Dácora — estado atual

**Atualizado em 2026-09-07.** Este documento trata somente da rota `/data-hub`, seus módulos e o BFF correspondente. O portal também serve outras aplicações; trabalho de Data Hub não autoriza alterações nelas.

## Papel do portal

O Data Hub é uma funcionalidade do portal Dácora. A arquitetura vigente é:

`Portal /data-hub → BFF privado Vercel /api/data-hub/* → Cloud Run Dácora Data Hub → Hub Data API Meta → BigQuery → Google Sheets/read-back`

O portal é a superfície de escolha e operação; o repositório `Dacora Data Hub` é o backend/serviço de dados. Não duplicar lógica analítica ampla no frontend.

## Produção agora

| Componente | Estado |
| --- | --- |
| Portal | Vercel Production automático a cada merge em `main`; commit funcional Data Hub `fa244dc` |
| URL | `https://www.dacora.com.br/data-hub` |
| Backend | commit `54576ef`; Cloud Run `dacora-data-hub-00060-zip`, pronto e com 100% do tráfego na auditoria de 2026-09-06 |
| Hub Data API Meta | backend Saldos no commit `04d1865`; health correto em `https://api-wviue4ksza-uc.a.run.app/api/health` |
| Scheduler | `PAUSED` |

Como merges documentais também geram deployment Vercel, **não fixe ID de deployment como estado canônico**; consulte `vercel inspect https://www.dacora.com.br` para o deployment corrente.

Esta atualização registra o estado observado, mas **não representa deploy novo** do portal, do Data Hub nem do Saldos.

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

## Capacidades adicionais já provadas

As frentes que antes eram gates deixaram de ser apenas plano e foram confirmadas no código e nos testes dos três repositórios:

- `actions` e `action_values` selecionadas são projetadas como colunas estáveis para BigQuery e Sheets, sem despejar o array cru na planilha;
- o enriquecimento de criativo funciona no grão de anúncio e preserva a seleção field-centric;
- edições concorrentes usam a revisão da extração e falham com conflito, em vez de sobrescrever silenciosamente uma definição mais nova;
- a UI continua derivando campos e compatibilidades do catálogo devolvido pelo backend.

Essas provas não significam que todas as variações de actions ou todos os campos criativos do Stract já estejam cobertos. Elas fecham o caminho técnico; a ampliação do catálogo segue em lotes.

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

## Norte de cobertura

O benchmark Stract foi reconsultado em 2026-09-06. O inventário em transição encontrou:

- **1.010 campos brutos**;
- **676 capacidades úteis** depois da normalização;
- **32 `supported`**;
- **11 `partial`**;
- **633 `not_implemented`**.

Esse levantamento substitui o norte histórico de 611 capacidades. A matriz nova ainda está em worktree/branch do repositório `Dacora Data Hub` e **não está integrada em `main`**. Até a integração, os totais acima são inventário auditado em transição, não contrato publicado do produto.

O portal deve derivar o máximo possível seu catálogo e regras do backend, evitando uma segunda fonte manual de centenas de campos.

## Próximos gates

1. sanitizar o snapshot e os artefatos da matriz, removendo IDs e nomes reais de contas/clientes;
2. ligar cada classificação `supported`/`partial` a evidência rastreável de teste, probe ou smoke;
3. revisar e integrar a matriz vigente de **676 capacidades** no repositório `Dacora Data Hub`;
4. expandir primeiro hierarquia e métricas de Insights e, depois, as variações de `count`, `value` e `cost` das actions;
5. decidir com o PO se capacidades `business.*` e billing pertencem ao produto antes de implementá-las;
6. manter a UI derivada do catálogo canônico e validar desktop/móvel a cada ampliação significativa;
7. só depois reavaliar PAR5/piloto e ativação do Scheduler.

Scheduler permanece pausado até esses gates posteriores.
