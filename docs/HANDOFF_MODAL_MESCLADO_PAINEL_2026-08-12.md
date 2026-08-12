# Handoff — modal "Enviar ao cliente" / "Recusar" mesclado com o relatório

**Estado em 2026-08-12, fim do dia: RESOLVIDO e em produção.** A segunda
tentativa (`2abf8c9`, os dois diálogos renderizados por portal para
`document.body`) foi integrada na `main`, publicada e **confirmada pelo
Flávio**: *"o problema foi resolvido"*. As oito verificações do painel,
incluindo `verifica:decisao` e `verifica:envio`, passam sobre a `main`
atual, e a publicação seguinte (a tela do mensal interno Allgrotech) foi
validada em conjunto com esta correção, sem regressão.

**Tudo o que vem abaixo descreve a investigação até aquele ponto e
continua valendo pelo que ensina — não como pendência.** Em particular, a
primeira tentativa foi publicada e revertida no mesmo dia por piorar o
sintoma; a seção 4 explica por quê, e esse é o motivo de não repeti-la.

## 1. O sintoma original, relatado pelo Flávio com print

Na tela de revisão do painel (`/painel-de-relatorios`, relatório de um
cliente aprovado, ex.: Dr. Lucas Bulcão julho/2026), ao clicar em
**"Enviar"** na faixa lateral de revisão, o diálogo "Envio ao cliente"
abre **mesclado com o conteúdo do relatório atrás dele** — texto do
diálogo ("ENVIO AO CLIENTE", "Enviar o relatório de Dr. Lucas Bulcão...",
"Destino canônico confirmado pela fábrica...") sobreposto/entrelaçado
com texto da página de fundo (título do relatório, badge "Liberado
em..."), sem o fundo escurecer nem o cartão do diálogo aparecer opaco e
destacado. Não temos o arquivo do print salvo neste handoff — só a
descrição textual acima, verificada contra o DOM/CSS reais.

O mesmo diálogo existe para "Recusar com motivo" (`DecisaoDaRevisao.tsx`
→ `DialogoDeRecusa`), com a mesma estrutura CSS — não confirmado por
print, mas com o mesmo risco por construção.

## 2. Diagnóstico da tentativa 1 (por análise estática de código, NUNCA reproduzido ao vivo)

Eu (sessão anterior) não consegui logar no painel real (login Google via
Supabase Auth) para reproduzir visualmente. Todo o diagnóstico veio de
ler `src/painel/painel.css`, `src/painel/EnvioDaRevisao.tsx` e
`src/painel/DecisaoDaRevisao.tsx`.

Cadeia de CSS relevante, em `src/painel/painel.css`:

- `.dcp-modal` (o overlay do diálogo) é `position: fixed; inset: 0;
  z-index: 60; background: rgba(13, 31, 24, 0.45);` — devia cobrir o
  viewport inteiro e escurecer o fundo.
- O ancestral direto de `EnvioDaRevisao`/`DecisaoDaRevisao` é
  `<aside className="dcp-revisao__faixa">` (`RevisaoMoldura.tsx`,
  função `FaixaDeRevisao`).
- Em **desktop, `@media (min-width: 1200px)`** (linha ~1209 em
  `painel.css`), `.dcp-revisao__faixa` recebe:
  ```css
  .dcp-revisao__faixa {
    position: sticky;
    top: 1rem;
    max-height: calc(100vh - 2rem);
    overflow-y: auto;
    overscroll-behavior: contain;
    ...
  }
  ```
- **Hipótese (não confirmada ao vivo):** essa combinação de `position:
  sticky` + `overflow-y: auto` no ancestral faz o `.dcp-modal`
  (`position: fixed`) descendente ficar confinado a esse ancestral em
  vez de posicionar relativo ao viewport — por isso o diálogo aparecia
  espremido dentro da faixa lateral, sem cobrir a tela, com o texto do
  relatório atrás vazando por cima.
- Não encontrei `transform`/`filter`/`perspective`/`contain`/
  `will-change` em nenhum ancestral (que são as propriedades que a
  especificação CSS realmente lista como capazes de recriar o
  *containing block* de um `position: fixed`) — então a causa exata
  **não está 100% confirmada**. Pode ser um comportamento real de
  browser com `sticky`+`overflow`, pode ser outra coisa que a leitura
  estática não capturou.

## 3. O que a tentativa 1 fez

Commit `15034a9` (branch `fix/modal-portal-body-2026-08-12`, integrada
por fast-forward em `main`, publicada — depois revertida por `a0dac8b`,
também publicado):

- `src/painel/EnvioDaRevisao.tsx`: o retorno de `DialogoDeEnvio` passou
  a usar `createPortal(<div className="dcp-modal">...</div>,
  document.body)` em vez de retornar o JSX direto.
- `src/painel/DecisaoDaRevisao.tsx`: mesma mudança em
  `DialogoDeRecusa`.
- `scripts/verifica-painel-decisao.mts` e
  `scripts/verifica-painel-envio.mts`: os testes jsdom buscavam o
  diálogo dentro do elemento raiz (`#raiz`); como o portal move o nó
  para `document.body`, as buscas (`querySelector`, `querySelectorAll`)
  foram trocadas para procurar em `document.body` em vez de `#raiz`.
  Essas partes dos testes provavelmente continuam corretas (o portal
  realmente move o DOM para `document.body`) — o problema não é o
  teste, é a CSS depois do portal.
- Todas as verificações (`npm run verifica:painel`, `:fila`,
  `:visao-geral`, `:revisao`, `:decisao`, `:envio`, `:refoco`,
  `:publico`) e `npm run build` completo passaram antes da publicação.
  Isso prova que o código não quebrou nada *funcionalmente* (React,
  fluxo de estado, chamadas de API) — só não prova a aparência visual,
  porque os testes são jsdom (sem layout CSS real).

## 4. Por que piorou (minha melhor hipótese agora, TAMBÉM NÃO CONFIRMADA AO VIVO — comece por aqui)

`src/painel/painel.css`, topo do arquivo:

```css
.dc-painel {
  --dc-canvas: #f2efeb;
  --dc-superficie: #ffffff;
  --dc-verde: #014029;
  --dc-tinta: #0d1f18;
  --dc-cinza: #4a5e55;
  --dc-filete: rgba(13, 31, 24, 0.12);
  --dc-filete-forte: rgba(13, 31, 24, 0.2);
  ...
}
```

Todo o design (`.dcp-modal__caixa { background: var(--dc-superficie);
... }`, cores de texto, bordas etc.) depende dessas *custom
properties*, que são declaradas no seletor `.dc-painel` — a `<div
className="dc-painel">` que envolve a página inteira
(`src/pages/PainelRelatorios.tsx`).

**Propriedades CSS customizadas (`--variável`) herdam pela árvore REAL
do DOM, não pela árvore de componentes React.** Um `createPortal(...,
document.body)` move o nó renderizado para ser filho direto de
`<body>`, **fora** da subárvore de `.dc-painel`. Depois da tentativa 1,
o `.dcp-modal__caixa` provavelmente parou de enxergar `--dc-superficie`,
`--dc-tinta` etc. — cada `var(--dc-superficie)` sem definição no escopo
cai no valor inicial da propriedade (transparente, no caso de
`background`), então o cartão do diálogo teria ficado **sem fundo
nenhum**, texto sem cor definida, sem borda visível — pior do que antes
(que ao menos herdava o token certo, só que confinado no lugar errado).

**Isso é a explicação mais provável do "ficou pior"**, mas eu não
consegui ver a tela real depois do deploy para confirmar — só recebi a
frase do Flávio e revertei por precaução.

## 5. Estado atual (depois do revert)

- Commit `a0dac8b` em `main` do `dacoraLP`, publicado — reverte
  exatamente o diff de `15034a9`. Os quatro arquivos voltaram ao estado
  de `96c0d13` (antes de qualquer tentativa de correção).
- Produção está de volta ao **bug ORIGINAL** (seção 1) — modal
  confinado/mesclado, mas com os tokens de cor certos (porque não há
  portal nenhum agora). Não confirmei visualmente, só pelo diff.
- Nenhum dado foi afetado por nenhuma das duas versões — é bug
  puramente visual/CSS, sem mutação de estado, sem chamada de RPC
  diferente.

## 6. O que fazer a partir daqui

1. **Conseguir ver a tela real antes de tentar de novo.** Duas
   tentativas de análise estática (a original e esta) não bastaram. Se
   não der para logar no painel (login Google via Supabase Auth, só
   `contato@nandacora.com.br` e `flacora@gmail.com` autorizados), pedir
   ao Flávio um print OU uma chamada com tela compartilhada antes de
   publicar de novo.
2. **Se for repetir a ideia do portal**, ele precisa continuar
   *dentro* da subárvore `.dc-painel` para não perder as *custom
   properties* — por exemplo, um nó dedicado
   (`<div id="dcp-portal-raiz">`) renderizado como filho direto de
   `.dc-painel` (não de `document.body`), com `createPortal` apontando
   para ele. Isso mantém o modal fora do ancestral `sticky`/`overflow`
   problemático SEM sair do escopo dos tokens de cor.
3. **Alternativa mais simples, sem portal:** investigar se dá para
   tirar `position: sticky` (ou o `overflow-y: auto` que acompanha) de
   `.dcp-revisao__faixa` no breakpoint `≥1200px`
   (`src/painel/painel.css`, linha ~1209) sem perder o comportamento
   de "faixa que acompanha a rolagem" que ela foi desenhada para ter —
   ou usar outro mecanismo de "sticky" (ex.: `position: fixed` com
   cálculo manual de topo) que não crie o problema.
4. **Confirmar a causa raiz de verdade** antes de publicar — hoje ela é
   só a hipótese mais provável (seção 2), nunca vista ao vivo. Pode
   valer a pena instrumentar (ex.: `getComputedStyle` no console do
   navegador, medindo `position` computado do `.dcp-modal` e a
   *containing block* real) antes de mexer em código de novo.
5. **O mesmo risco existe nos dois diálogos** (`DialogoDeEnvio` em
   `EnvioDaRevisao.tsx` e `DialogoDeRecusa` em `DecisaoDaRevisao.tsx`)
   — qualquer correção deve cobrir os dois, com o mesmo teste que a
   tentativa 1 já teria (ajustar `scripts/verifica-painel-decisao.mts`
   e `scripts/verifica-painel-envio.mts` se voltar a usar portal).
6. **Rodar sempre, antes de publicar:** `npm run verifica:painel`,
   `:fila`, `:visao-geral`, `:revisao`, `:decisao`, `:envio`,
   `:refoco`, `:publico`, e `npm run build` completo (cliente + SSR +
   prerender + sitemap). Nenhum deles pega bug visual de CSS puro — só
   provam que nada de funcional quebrou.
7. **Pedir autorização explícita do Flávio antes de publicar em
   `main`** — a autorização anterior ("pode integrar e publicar") foi
   para a tentativa 1, já consumida (e já revertida). Este handoff não
   é autorização para o próximo deploy.

## 7. Onde mexer

Repositório: `dacoraLP`
(`https://github.com/flacora-projetos/dacoraLP`, branch padrão `main`,
deploy automático na Vercel — push em `main` publica em produção).

Nesta máquina, a cópia que reflete `main` fica em
`C:\Users\Flávio Corá\Documents\PROJETOS PARTICULARES\SITE DACORA LP\worktrees\release-main-p3`
— **é a pasta usada para os dois deploys de hoje**, sempre com branch
de trabalho própria + fast-forward em `main`, nunca commit direto nela.
Existem outras pastas de trabalho paralelas (`git worktree list` no
repositório principal) de fases anteriores (P3, P4, P6 etc.) — não
mexer nelas para este bug.

Arquivos centrais:

- `src/painel/EnvioDaRevisao.tsx` (diálogo de envio)
- `src/painel/DecisaoDaRevisao.tsx` (diálogo de recusa)
- `src/painel/painel.css` (tokens em `.dc-painel`, regras `.dcp-modal`/
  `.dcp-modal__caixa` ~linha 1108-1131, `.dcp-revisao__faixa` sticky
  ~linha 1209-1238 e fixed-bottom-sheet ~linha 1240-1306)
- `src/painel/RevisaoMoldura.tsx` (onde os dois diálogos são montados,
  dentro de `<aside className="dcp-revisao__faixa">`)
- `scripts/verifica-painel-decisao.mts`,
  `scripts/verifica-painel-envio.mts` (regressões jsdom dos dois
  diálogos)

## 8. Contexto de produto (não é sobre este bug, mas é o que estava em teste)

Esta correção estava sendo testada dentro de um trabalho maior: o
Flávio pediu para ligar o envio real de relatórios mensais pelo painel
(worker P5 rodando dentro do heartbeat do `OpenClaw-Dacora`, já
publicado e funcionando — isso é outro repositório e não foi afetado
por nada deste handoff). Ele estava testando o fluxo real de aprovar +
enviar quando notou o modal quebrado. Não há decisão de produto em
aberto aqui — é bug de UI, puro e simples.
