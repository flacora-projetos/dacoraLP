# Relatório trimestral — Etapa 4, portal (05/11/2026)

Continuação local em 06/11/2026, com GO específico do PO. A [correção da recusa mensal](TESTE_RECUSA_MENSAL_TRIMESTRAL_2026-11-06.md) elimina a consulta adicional e põe a proteção trimestral na transação do banco. Endpoint e SQL reais passaram em memória, com rollback integral da recusa automática trimestral. A nova restrição, preparada na fábrica, precisa ser aplicada com GO antes de publicar o portal. Nada foi publicado ou aplicado remotamente.

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

## Auditoria do Claude (05/11/2026)

**Veredito:** reprovada como entregue (`4833ee8`) e **aprovada depois das correções** desta auditoria. Nada integrado, publicado ou gravado; banco e conector só foram lidos. Tabela completa dos defeitos: handoff da fábrica.

**O que mudou no portal:**
- Prontidão confere a decisão humana e a revisão durável, com os mesmos filtros da view pública; no mensal a ponte da coleta socorre uma falha desse registro, no trimestral não existe coleta seguinte.
- Recusa de trimestral exige causa manual, no servidor e no diálogo. O grupo de causas automáticas não aparece.
- Eco da aprovação e da recusa dizem o trimestre. A fila mantém "Voltar para edição" no aprovado e esconde só o envio.
- Nome do PDF diz o trimestre (`...-3-trimestre-de-2026-v1.pdf`): antes era igual ao do mensal de setembro.
- Aprendizados e recomendações entram no índice da capa, antes do glossário, na página e no PDF.
- A janela enviada à análise assistida diz que o documento é trimestral.
- Metadado `keywords` do PDF do mensal e do anual voltou ao texto de antes.

**Mudança de método:** `verifica:trimestral` usava um mensal com o carimbo de trimestral (`zenun`), que traz resumo pronto e por isso escondia a análise morta, e as capturas antigas mostravam "Julho teve...". A base agora é `src/reports/fixtures/trimestral-sintetico.json`, saída do montador da fábrica com números inventados e ajustada à forma do documento real. A verificação também passou a exercitar a rota pública e o servidor da decisão, não só funções isoladas.

**Provas:**
- Simulação real, só leitura, com Minerthal (enxuto, marca Allgrotech), Rei, Hannover e Syntonics (e-commerce): resumo, análise, página e PDF montam. Totais conferidos: Minerthal R$ 2.776,93, 237 conversas, R$ 11,72; Syntonics R$ 34.502,44 + R$ 1.324,39 = R$ 35.826,83. Julho segue hipotético, nenhum dado gravado.
- Mensal e anual, antes (`207c06d`) e depois, com cinco fixtures nas duas variantes: 30 arquivos comparados, PDFs idênticos em texto, imagem e metadados, página do mensal idêntica. Só difere a página do anual, que deixou de dizer "mensal" e "Resumo do mês": mudança pedida no handoff.
- Mutações: 17 de 17 no portal e 13 de 13 na fábrica. A que escapou na primeira rodada (receita de uma plataforma só) virou teste.
- Verdes: `verifica:trimestral`, `pdf-dedicado`, `fila`, `visao-geral`, `publico`, `envio`, `decisao`, `analise`, `ra4`, `revisao`, `analises-publicadas`, `analises-aprovadas-painel`. Continuam 12 funções públicas em `api/`.

**Conferido e aprovado sem mudança:** a view do envio traz `cliente_slug`, e a recusa do envio funciona de verdade; a tabela privada da conferência só dá acesso ao `service_role`, e a sugestão mensal não lê nem expõe a linha do trimestral; a chave nova não tem destinatário, segunda barreira contra envio; `origensMensais` não sai na rota pública.

**Limites conhecidos:** ver "O que falta antes do piloto" no handoff. `npm run lint` segue com a falta de `@electric-sql/pglite`, anterior a esta frente.

## Capturas (dados inventados)
- [Página](evidencias/trimestral-etapa4/pagina.png)
- [Tela de revisão, com a conferência privada](evidencias/trimestral-etapa4/revisao.png)
- [Fila de revisão](evidencias/trimestral-etapa4/painel.png): prova só o agrupamento; a captura sai sem o estilo do painel.
- [PDF, capa com o índice](evidencias/trimestral-etapa4/pdf-pagina1.png)
- [PDF, página 2](evidencias/trimestral-etapa4/pdf-pagina2.png)
- [PDF, Instagram com ausência declarada](evidencias/trimestral-etapa4/pdf-pagina7.png)

**Próximo portão:** Etapa 5 (Drive), na fábrica. Não integrar sem autorização.
