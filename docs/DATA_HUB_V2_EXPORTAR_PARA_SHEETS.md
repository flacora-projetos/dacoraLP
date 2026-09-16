# Plano — botão de exportar a consulta V2 para o Google Sheets

Status: **FRENTE ABERTA em 2026-09-16. Não iniciada. Nenhum código alterado.**

Repositório: `flacora-projetos/dacoraLP`. Worktree: `repo-worktrees/data-hub-v2-export-sheets`, branch `feat/data-hub-v2-export-sheets`, a partir de `origin/main` (`87cad2c`).

## 1. Problema

O Data Hub publicou em 16/09/2026 a entrega do resultado do Query Engine V2 no Google Sheets, provada com read-back da planilha e do BigQuery (revisão `dacora-data-hub-00091-sew`). A rota existe e funciona:

```text
POST /internal/v1/portal/query-v2/export
```

**Falta quem a chame.** Hoje a consulta V2 do portal executa, mostra a tabela na tela e termina ali: o usuário vê o resultado e não tem como mandá-lo para uma planilha. A capacidade está publicada e inacessível pela interface.

## 2. Escopo

Dentro: no resultado de uma consulta V2 já executada, permitir escolher uma planilha de destino e disparar a entrega, com estado visível de sucesso, duplicata e falha.

Fora, explicitamente: multi-conta, filtros, ordenação, opções de apresentação (arredondar, concatenar, limpar planilha, vazio→zero) e campos contextuais por conta. Cada um é frente própria.

Não tocar no fluxo de extrações agendadas nem no caminho 1.x.

## 3. O que já existe e deve ser reaproveitado

Verificado no código, não presumido:

- `src/pages/data-hub-google-picker.ts` exporta `escolherPlanilhaGoogle(accessToken)`, que já resolve a escolha da planilha pelo Google Picker;
- `src/pages/DataHub.tsx` já possui o tipo `DestinoGoogleSheets` e a validação `destinoDaResposta`, que recusa destino incompleto ou divergente vindo do backend;
- a operação `google-picker-session` já está roteada em `api/_data-hub.ts` e entrega o token do Picker;
- `src/pages/data-hub-query-v2.tsx` já exibe `queryRunId` e a tabela do resultado, e já distingue **campo ausente** (`—`), **valor nulo** (`null`) e valor presente em `valorCelula`.

Ou seja: o seletor de planilha e a validação de destino não precisam ser construídos. Falta a ponte e o gatilho.

## 4. O que falta

1. **Rota no bridge.** `api/_data-hub.ts` tem uma tabela de roteamento explícita por caminho e método. Acrescentar `'/query-v2/export'` com `POST`, e o valor correspondente em `Operacao`. Seguir exatamente o padrão das rotas vizinhas; não introduzir passthrough genérico.
2. **Montagem do snapshot.** A rota do Hub recebe `{ snapshot }` com origem V2. Campos e como derivá-los:

```text
schemaVersion      "1.0.0"
ownerId            identidade da sessão do portal, no formato portal-user:<uuid>
extractionId       identificador estável desta consulta ad-hoc
definitionRevision 1
occurrenceId       derivado do queryRunId
destination        o destino validado pelo Picker, writeMode "replace"
queryRunId         o queryRunId devolvido pela consulta V2
runDateStart/Stop  o período consultado
```

3. **Botão e estados na tela.** No bloco de resultado de `data-hub-query-v2.tsx`: escolher planilha, disparar entrega, e mostrar `enqueued`, `duplicate` e erro com mensagem entendível. `duplicate` **não é erro**: significa que a mesma entrega já foi feita e não foi repetida.

## 5. Decisão de idempotência — a parte que mais erra

A chave de exportação no Hub é derivada de `ownerId`, `extractionId`, `definitionRevision`, `occurrenceId` e destino. Ela define o que é a "mesma entrega". Portanto:

- **dois cliques no mesmo resultado, para a mesma planilha, devem gerar a mesma chave** e resultar em uma escrita só;
- **uma nova execução da consulta deve gerar chave nova**, porque o `queryRunId` mudou.

Derivar `occurrenceId` do `queryRunId` satisfaz os dois casos. Não usar timestamp do clique nem valor aleatório por clique: isso transformaria cada clique numa escrita nova e quebraria a proteção que o Hub oferece.

## 6. Item de segurança que entra nesta frente

Hoje a rota do Hub aceita `snapshot.ownerId` como o cliente enviar. A autenticação da rota é do **principal do portal**, não do usuário final, e a rota não confere se esse `ownerId` corresponde ao ator da sessão. O `ownerId` é o que decide **qual conexão Google será usada para escrever**.

Consequência: um `ownerId` errado — por engano de montagem ou por chamada forjada contra o bridge — escreveria usando a conexão Google de outra pessoa.

Hoje o risco é contido porque só o portal consegue chamar o Hub, mas a contenção é de perímetro, não de contrato. Esta frente deve:

- no portal, derivar `ownerId` **exclusivamente da sessão autenticada**, nunca do corpo da requisição do navegador;
- abrir item no repositório do Data Hub para a rota validar `snapshot.ownerId` contra o ator delegado e falhar fechado na divergência.

O segundo item é cross-repo e não deve ser esquecido por estar fora deste código.

## 7. Contrato que não pode ser quebrado na tela

O Hub garante que célula sem dado chega **em branco** na planilha, e que zero medido continua zero. A tela não pode desfazer isso:

- não preencher zero em campo ausente antes de exportar;
- não enviar a tabela renderizada; enviar **apenas o `queryRunId`** e deixar o Hub projetar a partir do resultado persistido;
- o traço `—` exibido na tela é representação visual de ausência, não um valor.

## 8. Gates de GO

- typecheck e build do portal verdes;
- teste do bridge cobrindo a rota nova, incluindo método errado e caminho errado;
- teste da montagem do snapshot, cobrindo a regra de idempotência da seção 5;
- prova real numa planilha descartável, conferindo que linhas sem dado chegaram em branco;
- `duplicate` exercitado de verdade, com dois disparos;
- deploy do portal sob GO explícito do PO.

## 9. Riscos

- **Chave de idempotência mal derivada**, transformando cada clique numa escrita nova;
- **`ownerId` de origem errada**, descrito na seção 6;
- **tela reintroduzindo zero** onde o Hub preservou ausência;
- planilha operacional escolhida por engano durante o teste: usar planilha descartável, como no smoke do Hub.
