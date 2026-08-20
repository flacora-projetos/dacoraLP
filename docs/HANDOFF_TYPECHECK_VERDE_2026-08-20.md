# O verificador de tipos voltou ao trabalho — e agora ele barra a publicação

**Data:** 2026-08-20
**Branch:** `fix/typecheck-verde` (a partir de `main/87365f5`)
**Estado:** implementado, testado e enviado ao GitHub. **NADA foi integrado à `main` e nada foi publicado** — falta o GO do Flávio.

---

## 1. A causa raiz: faltava um pacote, não faltava correção de código

`@types/react` e `@types/react-dom` **não estavam instalados**. O React 19 não traz os
próprios tipos embutidos, então, sem esse pacote, o `tsc` rodava praticamente cego: ele
não conhecia sequer a prop `key` do React.

Os 6 erros que `npm run lint` acusava eram **sintoma da ausência**, não código errado:

- 5 × `TS2322` dizendo que `key` "não existe nas props" — é justamente o pacote ausente
  que declara `key` como válida em qualquer componente;
- 1 × `TS2503` "Cannot find namespace 'React'" em `src/painel/telas.tsx:13`, que usa
  `React.ReactNode` sem import de tipo.

Ou seja: o verificador estava reprovando código correto e, ao mesmo tempo, **deixando
passar erro de verdade** — porque não tinha como enxergá-lo.

## 2. A medição

| Passo | Erros de `npm run lint` |
|---|---|
| Estado da `main` (`87365f5`) | **6** |
| Após instalar `@types/react@^19` e `@types/react-dom@^19` | **66** |
| Após anotar 3 declarações de `variants` do motion | **6** |
| Após corrigir os 6 restantes | **0** |

Os 60 erros que apareceram e sumiram vinham de **uma única declaração de `variants` por
arquivo** — `src/pages/Home.tsx`, `src/pages/PrivacyPolicy.tsx` e
`src/pages/PropostaLandingPage.tsx`. Cada uma é usada em dezenas de pontos do JSX, por
isso um erro só se multiplicava por arquivo.

**Escolha de estilo:** em vez de `ease: 'easeOut' as const`, os objetos foram anotados
como `Variants` (tipo importado de `motion/react`). É mais idiomático e protege o objeto
inteiro, não só a palavra `easeOut` — a próxima propriedade escrita errada ali é pega
pelo tipo, enquanto o `as const` só endurece o literal que já estava lá.

## 3. Os 6 erros restantes, um a um

**Regra seguida sem exceção: nenhum `@ts-ignore`, `@ts-expect-error` ou `as any` novo.**
Na prática, dois `as any` que já existiam foram **removidos**.

### 3.1 `scripts/verifica-painel-av3-historico.mts` (2 erros)

As chamadas eram `createElement(AnalisesSecaoProvider, { …, aoAcionar: (async () => ({})) as any }, filho)`.

**O `as any` estava mirando o sintoma errado.** O erro real não era o `aoAcionar` — era
`children`, que é **obrigatório** nas props do `AnalisesSecaoProvider`; com `children`
obrigatório, a sobrecarga variádica de `createElement` (a que aceita filhos como 3º
argumento) não se aplica, e o TypeScript recusa a chamada inteira.

Correção: passar o filho **dentro das props**, como os outros scripts do repositório que já
compilavam (`verifica-painel-analises-secao.mts`, `verifica-painel-av2-aviso.mts`) sempre
fizeram. O `as any` caiu junto, porque a assinatura real de `aoAcionar` já era compatível.

### 3.2 `scripts/verifica-painel-decisao.mts` (1 erro)

O fixture `decidivel` era um objeto solto, então `estado: 'pronta'` da seção editorial era
inferido como `string`, e `string` não cabe em `EstadoEditorialRA4`. Correção: anotar o
fixture com o tipo real, `RelatorioDecidivel`. Isso é ganho de proteção, não só de
compilação — daqui em diante o fixture não pode divergir do contrato sem o teste avisar.

### 3.3 `src/reports/charts/EvolucaoNoTempo.tsx` (3 erros)

Os componentes de tick e de tooltip recebiam `{...props}` — o objeto **cru** do Recharts,
com dezenas de campos que as nossas primitivas não conhecem e com tipos mais largos
(`x`/`y` como `string | number`). Correção: passar apenas as props que a primitiva declara.

Ao apertar a tipagem, apareceram **dois defeitos latentes de verdade** em
`src/reports/charts/primitivas.tsx`, e os dois foram corrigidos:

1. **`dataKey` pode ser uma função acessora** no Recharts. O código fazia
   `String(item.dataKey ?? …)` — com uma função, isso imprimiria **o código-fonte da
   função** como rótulo dentro do tooltip. Hoje `chaveDoItem` descarta a forma de função e
   cai no `name`.
2. **`value` pode ser um array** (séries de faixa). O código fazia `Number(item.value)` —
   com um array, isso é `NaN`, e o tooltip publicaria "NaN" formatado como se fosse número.
   Hoje `valorDoItem` devolve `null` nesse caso e o tooltip escreve **"sem dado"**. Segue a
   regra da casa: **ausência nunca vira número**.

`payload` também passou a ser `readonly`, que é o que o Recharts entrega de fato e o que o
componente realmente faz com ele (só lê).

**Nenhum item ficou em aberto.** Os 6 foram resolvidos por tipagem.

## 4. ⚠️ A PUBLICAÇÃO AGORA FALHA SE HOUVER ERRO DE TIPO

O `lint` entrou no `prebuild`, que é o caminho por onde a Vercel passa:

```
"prebuild": "npm run lint && npm run verifica:karyne-conversao && npm run verifica:linguagem && npm run verifica:vazamento"
```

**Isso muda o comportamento do deploy.** A partir do momento em que esta branch for
integrada, **um erro de tipo bloqueia a publicação do site**. É exatamente o objetivo — o
verificador deixa de ser um relatório que ninguém lê e passa a ser um portão — mas é uma
consequência que precisa estar clara antes do GO.

**Prova de que o portão realmente fecha:** um erro de tipo foi introduzido de propósito em
`chartTheme.ts` e o `npm run build` **falhou** (saída 2), acusando o erro antes de compilar
qualquer coisa. O arquivo foi restaurado em seguida e o `git diff` daquele arquivo voltou
vazio.

## 5. O que foi verificado

| Verificação | Resultado |
|---|---|
| `npm run lint` | **0 erros** |
| `npm run build` (com o `lint` já dentro do `prebuild`) | **verde** |
| `verifica:painel` · `fila` · `visao-geral` · `revisao` · `decisao` · `ra4` · `av2` · `av3` · `av4` · `envio` · `publico` · `funil` · `refoco` · `analise` | **14 de 14 verdes** |
| Supressões novas (`@ts-ignore` / `@ts-expect-error` / `as any`) no diff | **nenhuma** (duas foram removidas) |

## 6. Limpeza das worktrees antigas do portal

As quatro worktrees de tarefas já encerradas saíram, junto com as branches.

**Antes de remover qualquer coisa**, cada árvore foi varrida por vínculos do Windows
(junções/symlinks), **sem depender de rótulo em inglês** — este Windows responde
`<JUNÇÃO>`, e uma busca pela palavra `junction` daria "sem junções" mesmo havendo. A
varredura usou `Get-ChildItem -Force -Recurse | Where-Object { $_.LinkType }`, e o
resultado foi **nenhum vínculo em nenhuma das quatro**. O `node_modules` do checkout
principal foi conferido antes e depois: **216 pacotes e `.bin/tsx` presente nos dois
momentos** — nada foi danificado.

| Worktree / branch | Integrada em `origin/main`? | Destino |
|---|---|---|
| `feat/av2-portal-prontidao-aviso` | sim (provado por `git merge-base --is-ancestor`) | removida com `git branch -d` |
| `feat/av3-historico-interno` | sim | removida com `git branch -d` |
| `release/av3-20260818` | sim | removida com `git branch -d` |
| `feat/av1-analise-snapshot` | **NÃO** | **arquivada** como tag `arquivo/feat/av1-analise-snapshot` antes de sair |

**Sobre a branch não integrada:** ela tinha **um commit** fora do tronco, `495c635`
("docs: register av1 gate before ra5"), tocando só `AGENTS.md`, `CLAUDE.md` e
`docs/PAINEL_PROGRESSO.md`. O conteúdo está **superado**: aquele texto afirma que a
migration `0015` "ainda NÃO foi aplicada no Supabase remoto", e hoje AV1, AV2 e AV3 estão
em produção. Mesmo assim ela não foi apagada sem rede: a tag
`arquivo/feat/av1-analise-snapshot` aponta para `495c635` e foi conferida depois da
remoção da branch.

Estado final: `git worktree list` mostra só o checkout principal na `main` e a worktree
desta tarefa.

## 7. O que NÃO foi feito

- **Não houve merge na `main` e não houve publicação.** A branch foi enviada ao GitHub e
  para aí.
- Nenhum relatório foi regerado; nenhum dado de cliente foi tocado.
- Nenhuma mudança visual: as três páginas com `variants` mudaram só a anotação de tipo,
  não os valores da animação.
