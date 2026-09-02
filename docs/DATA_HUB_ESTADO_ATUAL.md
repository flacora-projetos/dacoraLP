# Data Hub no portal Dácora — estado atual

**Atualizado em 2026-09-02.** Este documento trata somente da rota `/data-hub`, seus módulos e o BFF correspondente. O portal também serve outras aplicações; trabalho de Data Hub não autoriza alterações nelas.

## Papel do portal

O Data Hub é uma funcionalidade do portal Dácora. A arquitetura vigente é:

`Portal /data-hub → BFF privado Vercel /api/data-hub/* → Cloud Run Dácora Data Hub → Hub Data API Meta → BigQuery → Google Sheets/read-back`

O portal é a superfície de escolha e operação; o repositório `Dacora Data Hub` é o backend/serviço de dados. Não duplicar lógica analítica ampla no frontend.

## Produção agora

| Componente | Estado |
| --- | --- |
| Portal | Vercel Production automático a cada merge em `main`; commit funcional Data Hub `fa244dc` |
| URL | `https://www.dacora.com.br/data-hub` |
| Backend | Cloud Run `dacora-data-hub-00031-fzv`, 100% do tráfego |
| Imagem backend | `runtime:f13b028` |
| Digest backend | `sha256:ca3db7f5fdc53e01bcfa118bfe5eaa750d7b5ae65278a08686f6689d59ec9c5a` |
| Rollback backend | `dacora-data-hub-00030-8ms`, tag `preselectedsheets` |
| Scheduler | `PAUSED` |

Como merges documentais também geram deployment Vercel, **não fixe ID de deployment como estado canônico**; consulte `vercel inspect https://www.dacora.com.br` para o deployment corrente.

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

O smoke final usou:

- período `2026-08-27`;
- baseline independente `spend = 195.48`;
- `selectedFields = [date, campaign_name, spend]`;
- revisão backend `dacora-data-hub-00031-fzv`.

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

O objetivo continua sendo aproximar o Data Hub do benchmark Stract de **611 capacidades úteis deduplicadas**, preservando semântica, grão, granularidade e compatibilidades reais.

O portal deve derivar o máximo possível seu catálogo e regras do backend, evitando uma segunda fonte manual de centenas de campos.

## Próximos gates

1. projetar actions/conversions selecionadas como colunas;
2. fechar enriquecimento criativo;
3. construir e executar a matriz **611 × Hub**;
4. expandir catálogo e backend por lotes;
5. manter a UI derivada do catálogo canônico e validar desktop/móvel a cada ampliação significativa;
6. só depois reavaliar PAR5/piloto e ativação do Scheduler.

Scheduler permanece pausado até esses gates posteriores.
