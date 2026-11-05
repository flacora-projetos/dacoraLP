# Relatório trimestral — Etapa 4, portal (05/11/2026)

**Escopo:** desenvolvimento local na worktree `SITE DACORA LP/repo-worktrees/trimestral-etapas01`, branch `feat/trimestral-periodo-etapas01-20261105`. Não houve merge, push, deploy, gravação de produção, mudança de VPS, Drive ou rotina.

## O que mudou
- Produto `trimestral_externo_cliente`, competência do último mês e rótulo `3º trimestre de 2026 (julho a setembro)` nas superfícies que podem abrir trimestral.
- Fila com grupos por carteira Dácora/Allgrotech e visão geral com trimestrais **fora** dos totais, prazos e cobranças mensais.
- Página e PDF mantêm o catálogo, marcas, tipografia e **o mesmo gerador PDF** do mensal; `api/_pdf-empacotado.js` reempacotado a partir do código-fonte pelo script existente. `snapshotParaExibicao` arredonda frações de percentual apenas na apresentação trimestral, sem alterar snapshot fechado, checksum ou mensal/anual.
- Aprendizados e recomendações são duas seções editoriais virtuais do trimestral. Suas análises humanas são publicadas pelo caminho já existente; a aprovação recusa se faltar conferência privada ou texto humano aplicado. Dispensa das duas seções é recusada também no servidor.
- Conferência factual do revisor: `api/_painel-conferencia-trimestral.ts` lê JSON privado por `relatorio_id` e checksum em `relatorio_contextos_sugeridos`, tabela já existente e com RLS somente service_role. A tela de revisão mostra divergências; o cliente nunca recebe esses dados.
- `api/relatorio-publico.ts` remove `dados.origensMensais` e qualquer `conferencia` antes de renderizar página ou PDF do trimestral.
- Envio trimestral é escondido na revisão/fila e recusado **antes da RPC** em `api/painel-envio.ts`. Nada ativa o envio.
- Nenhum arquivo novo de função pública `api/`: novo helper começa por `_`.

## Evidências e limites
- `npm run verifica:trimestral`: prova produto, rótulo, agrupamento, preservação mensal, análise humana, privacidade, recusa do envio, aprovação fechada e PDF com fixture **inteiramente sintética**. Gera prévias somente em `output/trimestral-etapa4` (ignorado no Git).
- Verificações verdes: `verifica:fila`, `verifica:visao-geral`, `verifica:publico`, `verifica:envio`, `verifica:decisao`, `verifica:analise`, `verifica:ra4`, `verifica:revisao`, `verifica:pdf-dedicado`, além de `verifica:trimestral`.
- **6/6 mutações detectadas:** grupo, rótulo, recusa de envio, remoção de origens da rota pública, trava de aprovação, obrigatoriedade editorial. Os arquivos mutados foram restaurados.
- `npm run lint` ainda acusa somente o erro **pré-existente no checkout de referência**: falta localmente `@electric-sql/pglite` para `scripts/verifica-reunioes.mts`. Não foi instalada dependência na raiz nem alterado o checkout canônico.
- Nenhuma prévia valida contexto editorial real ou escrita real. Ainda não existe `analysisContext` específico do trimestral; usa a projeção factual aprovada. O armazenamento privado da conferência reaproveita JSON com versão 1, sem migração.
- As seções de funil GA4 e PMax continuam obedecendo às suspensões recebidas do snapshot mensal. A regra do prefixo das miniaturas não foi alterada.

## Capturas anexadas (dados inventados)
- [Página do relatório](evidencias/trimestral-etapa4/pagina.png)
- [Fila de revisão](evidencias/trimestral-etapa4/painel.png)
- [PDF, página 1](evidencias/trimestral-etapa4/pdf-pagina1.png)
- [PDF, página 2](evidencias/trimestral-etapa4/pdf-pagina2.png)

**Próximo portão:** auditoria independente do Claude. Não executar Etapas 5 a 8 nem integrar sem autorização.
