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
| Backend | Cloud Run `dacora-data-hub-00030-8ms`, 100% do tráfego |
| Imagem backend | `runtime:d54c50e` |
| Digest backend | `sha256:9f29d69086a571830eb75b2b0fa41ab358936a154007dccaa5abb6f4e32e89f4` |
| Rollback backend | `dacora-data-hub-00029-f5b`, tag `preupsert` |
| Scheduler | `PAUSED` |

Como merges documentais também geram deployment Vercel, **não fixe ID de deployment como estado canônico**; consulte `vercel inspect https://www.dacora.com.br` para o deployment corrente.

## Contrato field-centric

O portal publicado segue o modelo por campos:

- não pergunta nível/grão manualmente;
- emite `selectedFields` em novas definições;
- remove do payload novo `entityLevel`, `fields`, `creativeFields` e `breakdowns`;
- mostra o grão apenas como consequência da seleção;
- mantém leitura/edição de definições legadas.

O CRUD `selectedFields` já foi provado em produção com `selectedFields = [date, campaign_name, spend]`, deduzindo `entityLevel = campaign`.

## Smoke Meta real — BigQuery fechado em produção

O backend executou um smoke pós-correções com:

- conta queryable `act_643514297405998`;
- `selectedFields = [date, campaign_name, spend]`;
- grão `campaign`;
- período `2026-08-28`;
- revisão `dacora-data-hub-00030-8ms`.

A fonte independente Saldos MCP retornou `spend = 166.14` para a campanha `23852456848550667` (`MENSAGENS (WhatsApp) - PEC. CORTE`).

O Data Hub registrou no BigQuery:

- `sync_run_id = 501547d2-5ec3-42f2-9dd8-dbfcb3072bd6`;
- `status = success`;
- `reconciliation_status = reconciled`;
- `spend = 166.14`;
- `impressions = NULL`;
- `clicks = NULL`.

A divergência de gasto contra a fonte independente foi zero. Isso prova o caminho:

`selectedFields → Hub Data API → normalização → reconciliação → BigQuery`

para o recorte controlado.

Os campos não selecionados permaneceram `NULL`; não foram transformados em zero nem preenchidos indevidamente.

## Correções backend descobertas pelo smoke

1. PR backend `#79`: materializou `reconciliation` no caminho Hub.
2. PR backend `#81`: primeira tentativa de filtro de partição no `MERGE` projetado; insuficiente em runtime.
3. PR backend `#82`: correção definitiva, substituindo o projected `MERGE` por DMLs transacionais particionáveis, preservando fencing e campos não selecionados.

Validação backend da correção definitiva:

- Node 22.22.0: 488/488;
- focados merge/loader: 17/17;
- lint: OK;
- `git diff --check`: OK.

## Google Sheets — único gate aberto

O export correspondente ao run bem-sucedido chegou a ser disparado, mas terminou `dead` com:

`lastErrorCode = reauthorization_required`

O refresh token Google armazenado para o ator não é mais aceito pela Sheets API. O backend abriu o fluxo oficial `/internal/v1/portal/google/connect` e a URL de consentimento Google foi aberta no navegador local.

**A conclusão depende de consentimento humano na conta Google.** Não criar chave nova, não ampliar IAM permanente e não criar workaround no portal.

Depois da reautorização, repetir somente um smoke curto para confirmar:

1. export `succeeded`;
2. read-back do Sheets;
3. ordem final de `selectedFields`;
4. zero versus ausência;
5. nenhum campo não escolhido aparecendo indevidamente.

## Higiene

As definições e documentos `sheets_exports` temporários criados pelos smokes foram removidos do Firestore depois da coleta de evidências. Os `sync_runs` e linhas BigQuery permanecem como evidência auditável.

Todos os grants temporários de TokenCreator foram revogados; nenhuma chave persistente foi criada.

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

1. concluir o consentimento Google e fechar Sheets/read-back;
2. garantir ordem integral de `selectedFields` na saída;
3. projetar actions/conversions selecionadas como colunas;
4. fechar enriquecimento criativo;
5. construir e executar a matriz **611 × Hub**;
6. manter a UI derivada do catálogo canônico e validar desktop/móvel a cada ampliação significativa.

Scheduler permanece pausado até os gates posteriores do backend/piloto.
