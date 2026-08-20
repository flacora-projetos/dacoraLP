# Histórico por seção + contraste da dispensa (2026-08-20)

**Branch:** `feat/historico-por-secao` · **Estado:** implementado e testado, **aguardando GO para merge em `main`** (merge lá publica em produção).
**Repositório irmão:** a terceira correção da mesma investigação é da fábrica e vive em `OpenClaw-Dacora`, branch `feat/ponte-av2-nao-recarimba`, com o handoff completo em `docs/HANDOFF_HISTORICO_ANALISES_ACHADOS_2026-08-20.md`.

## Por que

O Flávio abriu o relatório real do **Hannover Fondue 2026-08** e relatou que não achava o bloco "Histórico das análises" e que havia um texto ilegível no cartão verde do "Resumo do mês".

Apurado contra produção, **sem navegador** (a extensão Claude in Chrome não estava conectada; Playwright foi descartado por não carregar a sessão Google, e não há storage-state governado):

- a string `Histórico das análises` **está** no bundle da tela de revisão (`PainelRelatorios-D4lWn7Dt.js`);
- `GET /api/painel-historico-analises` responde `401 sem_sessao` — publicado e correto;
- nenhuma regra de CSS o esconde;
- o chunk do relatório **interno** não tem nem o histórico nem "Melhorar análise" — logo o PO estava na tela certa.

O bloco vive na faixa de revisão, que acima de 1200px é coluna à direita e **abaixo de 1200px vira gaveta fixa no rodapé**, com o `<details>` recolhido lá dentro. Ele não foi encontrado duas vezes seguidas; isso é o veredito de usabilidade, não uma dúvida.

## O que mudou

### 1. Contraste da linha "Revisada sem análise" — `painel.css`

`.dcp-analise-dispensa` fixava `color: var(--dc-cinza)` (`#4a5e55`, cinza de fundo claro). Nos **blocos** essa linha cai no cartão branco `.dcp-analise-secao__controles` e funciona. Na **introdução** ela é irmã direta de `AnaliseIntroducao` e cai no cartão **verde-escuro** `.dc-destaque`, onde some.

Passou a **herdar** a tinta do container, com o `<span>` em `opacity: .82` (o botão ao lado fica cheio). No claro reproduz o cinza de sempre; no escuro reproduz o efeito de `--dc-sobre-verde`, sem o componente precisar saber onde foi renderizado.

### 2. Contador de histórico por seção — `AnalisesSecao.tsx`, `Revisao.tsx`, `HistoricoAnalises.tsx`

Cada seção passa a mostrar, ao lado de "Refinar análise" / "Revisada sem análise", um `<details>` com **"N versões no histórico"** e o selo **"Somente interno"**, listando as versões daquela seção.

- `VersaoDaAnalise` foi **exportada e reusada** — duas cópias divergiriam no primeiro campo novo, e uma esconderia dado do revisor.
- `historicoPorSecao` é agrupado uma vez no provider, memoizado.
- **Seção sem versão preservada não renderiza nada.** Seção nova não precisa declarar ausência de passado.
- Enquanto o histórico carrega ou falha, o bloco inline também não aparece: quem dá esse recado é a faixa, e repeti-lo por seção viraria parede de aviso.
- Sem ciclo de import: `HistoricoAnalises` não importa nada de `AnalisesSecao`.

### 3. ⚠️ A trava que faltava — `report.css`

A regra de impressão que tira a revisão do PDF do cliente listava só `.dcp-revisao__faixa`, `.dcp-revisao__navegacao`, `.dcp-analises-relatorio`, `.dcp-analise-introducao` e `.dcp-analise-secao__controles`.

`.dcp-analise-dispensa` e o novo `.dcp-historico-secao` nascem **fora** de `.dcp-analise-secao__controles` quando a seção é a introdução. Sem entrarem na lista, **o texto integral das análises internas iria para o PDF do cliente** — violação direta do item (4) do contrato AV. Ambos acrescentados.

## Regressões

Em `scripts/verifica-painel-av3-historico.mts` (`npm run verifica:av3`): render do contador, ausência do bloco em seção sem histórico, lista de seletores da impressão e ausência do cinza fixo. **As três mutações reprovam.**

> **A primeira versão da trava de impressão passou verde com o defeito presente.** A asserção lia o trecho do CSS por substring, e o **comentário escrito acima da regra citava os dois seletores** — `includes()` era satisfeito pelo comentário, não pela lista. Descoberto por mutação. Hoje ela extrai a lista de seletores entre o fim do comentário (`*/`) e o `{`, e o corpo separadamente.
>
> **A régua: asserção que procura um nome dentro de um arquivo de CSS/config pode ser satisfeita pela documentação da própria regra.**

**Build verde.** As 13 verificações do painel passam.

## Aberto

1. **`npm run lint` está vermelho na `main`** — 6 erros `TS2322`/`TS2503` do padrão `key` em props, idênticos antes e depois desta branch. O `build` não roda `lint`, então a publicação é verde. Enquanto estiver vermelho, o typecheck não reprova regressão nova.
2. **Sem smoke visual autenticado**, pelo motivo acima. É o único item desta entrega sem prova de tela.
3. **O ponto de virada de 1200px** continua transformando a faixa em gaveta de rodapé. O contador resolve a descoberta do histórico; a faixa (sinais, contexto, decisão) continua onde estava.

## Como retomar

```bash
cd "SITE DACORA LP/worktrees/historico-por-secao"
npm run verifica:av3 && npm run build
```
