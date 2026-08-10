# Painel de aprovação de relatórios — onde a obra parou

**Rota:** `/painel-de-relatorios`
**Fases concluídas e publicadas:** P0 (fundação e login) · **P1 inteira —
carregador, fila e correção do refoco de janela** (seções 9, 11 e 11.7) ·
**P2 concluída e validada — relatório dentro da bancada, faixa responsiva e
smoke autenticado aprovados pelo Flávio em desktop e celular**
**Produção:** P0/P1 já estavam publicadas; a P2 foi integrada na `main` pelo
merge `335a2f5`, enviada ao GitHub e verificada em produção. Rota:
<https://www.dacora.com.br/painel-de-relatorios>.
O redesign compartilhado **Editorial de Performance** também foi aprovado pelo
Flávio e publicado; o checkpoint do código levado à produção é `61e27c8`. A
validação nominal da Fernanda ainda não foi registrada e é o Gate 3 que fecha o
visual antes de nova implementação.
**Correção aprovada e integrada em 2026-08-07:** o merge `9e287b1` em `main`,
enviado ao GitHub na sequência autorizada, resolve caminhos privados
`storage://relatorios-miniaturas/...` somente depois
da autorização do painel. Karyne v3 tem 8/8 cards e Aviarte v3 tem 30/30 com
assinatura real, HTTP 200 e status traduzido/datado. A fila mostra somente a
versão 3 corrente e preserva as anteriores no banco para auditoria. O Flávio
confirmou que as imagens carregaram. Os arquivos da P3 continuam intocados.
**Áudio privado publicado e provado em 2026-08-09:** o merge `7591452`
acrescentou o bloco genérico `AUDIO` e o resolvedor privado sem retomar a P3. A
Vercel marcou o deployment de produção como concluído; domínio e deployment
responderam 200, e a API sem sessão permaneceu fechada em 401. O bucket privado
e relatórios exclusivamente sintéticos foram criados para o smoke autenticado.
Depois disso, Karyne virou o primeiro opt-in real: a versão 6 de julho foi
gravada como nova linha com áudio privado, preservando integralmente as versões
1–5. Isso não habilitou envio nem retomou a P3.
**Última atualização:** 2026-08-09

**Correção organizacional publicada em 2026-08-09 (`36824a6`):** a fila separa **mensais externos · carteira Dácora**, **mensais externos · carteira Allgrotech** e **mensais internos · Allgrotech** usando `identidade.carteira` e `identidade.produto`, nunca o nome do cliente. Snapshot legado sem esses campos fica numa seção explícita de classificação pendente. A mesma correção reconhece os resultados de contas com várias conversões (`*_resultado_grupo_N`) e remove a mensagem obsoleta de que falta definir o resultado no cadastro. O banco tem 78 versões da competência 2026-07; as 34 correntes são 19 Allgrotech e 15 Dácora, todas em `gerado`, sem áudio e sem aviso de coleta parcial. P3 permanece intocada.

O plano completo (as oito fases, o que o painel faz e por quê) vive no
`OpenClaw-Dacora`, em `docs/HANDOFF_PAINEL_APROVACAO_2026-08-06.md`. **Este
arquivo é o de continuidade:** ele diz o que existe, o que falta, e o que já
custou caro descobrir.

> ### Regra que vale para todas as fases
>
> Código e documentação são uma unidade de entrega. Ao terminar uma fase — **e
> também ao parar no meio dela** — atualize este arquivo e os documentos
> canônicos aplicáveis antes de validação, commit, merge ou push. Atualize a
> fonte vigente; não reescreva histórico concluído nem crie diário cumulativo.

---

## 1. Situação em uma frase

**A fila do mês está em produção, lendo do banco, com 34 relatórios correntes da
competência 2026-07.** A P2 está concluída e publicada: a fila abre o relatório completo
dentro da bancada, com deep-link e faixa responsiva;
carregamento ou erro nunca mostram controles de decisão. O Flávio concluiu e
aprovou o smoke autenticado em desktop e celular. O catálogo visual dos
relatórios foi redesenhado e publicado depois da P2, sem mudar snapshot,
checksum ou estado. A organização por carteira/produto está em produção desde
2026-08-09. O Gate 3 da Fernanda continua aberto para Karyne e
Aviarte; P3 está pausada e não foi aprovada para integração (seção 7).

### Auditoria da fila corrente em 2026-08-09

A leitura inicial do banco encontrou 44 linhas, das quais 34 eram as versões
correntes de julho: 23 `small_cap`, cinco `ecommerce` e seis `servicos_leads`.
Dez avisos de coleta parcial Meta eram falsos positivos do consumidor: os
relatórios com várias conversões já publicavam cada resultado e cada ranking,
mas a fonte ainda verificava o ranking único obsoleto. A correção pertence à
fábrica no `OpenClaw-Dacora`. Depois da carga, o banco passou a ter 78 versões;
as 34 correntes não contêm aviso de coleta parcial nem mensagem de conversão
pendente.

Não existe correção de palavras-chave pendente: o conector já entrega a lista e
a cobertura que dimensiona a diferença para o total da conta. Hannover e
Syntonics continuam sem resultado por produto em Performance Max, mas o PO
adiou essa ampliação em 2026-08-09 e ela não bloqueia esta publicação. O registro
está em `docs/PENDENCIA_ADIADA_CONECTOR_GOOGLE_PRODUTOS_PMAX_2026-08-09.md` no
`OpenClaw-Dacora`. Nenhum relatório mensal interno Allgrotech existe hoje; a
seção correspondente só aparecerá quando snapshots desse produto existirem.

### Checkpoint integrado da P2

Branch de origem `codex/p2-revisao-painel`, checkpoint de código `05323e2`,
integrada na `main` pelo merge `335a2f5`. A API de detalhe repete sessão e allow-list no
servidor e não devolve o token público. A revisão usa o mesmo snapshot e o mesmo
renderizador da página do cliente, traz sinais com alvo de seção, mantém a URL
`?relatorio=...` e preserva esse deep-link no retorno do Google. Os botões de
aprovar e recusar existem desabilitados, porque a mutação pertence à P3.

Passaram `npm run verifica:painel`, `npm run verifica:fila`,
`npm run verifica:refoco`, `npm run verifica:revisao` e o build completo. O
`lint` continua nos mesmos seis erros TypeScript preexistentes, sem erro novo
desta rodada. Um navegador real, em isolamento local e com leitura somente do
snapshot persistido, abriu Karyne e Aviarte em 1440×900 e 390×844: documento e
faixa presentes, zero erro de página e zero rolagem lateral. A Karyne exercitou
oito gráficos. Nenhum snapshot foi gravado no repositório e o arnês temporário
foi removido.

O primeiro teste humano autenticado encontrou dois defeitos: o servidor local
tinha sido iniciado antes do endpoint da P2 e devolvia a SPA no lugar da API;
depois do reinício, a Karyne quebrava porque o snapshot usa a fonte válida
`crm`, ausente do catálogo visual. O primeiro foi resolvido reiniciando o
servidor; o segundo está corrigido e coberto pela regressão no checkpoint
`05323e2`. Depois da correção, o Flávio reconfirmou fila → Karyne → voltar →
nomes clicáveis e repetiu o fluxo autenticado no celular. Os dois foram
validados; integração e push foram autorizados na sequência.

### Frente de voz — V4 publicada sem tocar na P3

A capacidade genérica de leitura em áudio foi implementada separadamente e
integrada à `main` pelo merge `7591452`, sem alterar o placeholder da P3. Ela acrescenta o bloco
configurável `AUDIO`, estados disponível/indisponível, controles acessíveis sem
autoplay e assinatura server-side de URI privada do Storage. O caminho é
isolado por cliente, competência e `v<versão>` vindos das colunas da linha; o
snapshot não certifica a própria identidade. Contrato malformado é sanitizado
antes da resposta e nunca monta player. O bucket privado e o player foram
provados em produção com um relatório exclusivamente sintético: uma única linha
v2 e um único OGG permanecem isolados para inspeção; a v1 de teste foi removida
depois de revelar codificação defeituosa no shell. Chrome desktop e 390 × 844
mostraram controles, sem autoplay, erro ou overflow. Isso não ativa cliente,
não carrega snapshot real e não antecipa a rota externa W3. Contrato,
evidências e gates: [`HANDOFF_VOZ_V4_AUDIO_RELATORIO_2026-08-08.md`](HANDOFF_VOZ_V4_AUDIO_RELATORIO_2026-08-08.md).

**Botão destacado publicado em 2026-08-09:** o bloco ganhou **“Ouvir a versão falada”**, com alternância para pausa, `aria-controls`/`aria-pressed`, controles nativos mantidos e nenhum autoplay. `verifica:revisao` e o build completo passaram depois do merge `1e8f4ba`; a Vercel concluiu o deployment da `main`. O bundle servido por `www.dacora.com.br` contém o botão e `aria-pressed`, sem `autoplay`; raiz HTTP 200 e API sem sessão HTTP 401. A fábrica publicou também a v3 exclusivamente sintética com a voz autorizada da Fernanda. A inspeção visual autenticada da v3 ainda depende de uma sessão Google válida no navegador de QA; nenhuma credencial foi fabricada ou solicitada durante o deploy.

**Piloto real Karyne e checksum alinhado:** a v6 `c8103cb6-e7fe-48e3-a9c1-a34d92e5a075` foi carregada e lida de volta com checksum `e090c5abe85965a2810467977b34f5ac`, bloco `AUDIO` disponível e URI privada. A v5 permaneceu intacta e tem o mesmo checksum porque somente a representação opcional mudou. O carregador agora aplica a neutralização estreita da fábrica: remove do cálculo apenas `dados.audios` e blocos `AUDIO`; regressões provam que mudar um número ou acrescentar qualquer outro bloco continua alterando o checksum.

**W3 externa implementada para o piloto da Karyne:** a rota
`/relatorios/<token>` e a API server-side correspondente leem somente versão
`liberado`, não revogada, não substituída e com o checksum do GO ainda atual.
Token, UUID e sinais internos da bancada não voltam no JSON; miniaturas e áudio
continuam privados e são assinados apenas na cópia de resposta. Página e API
impõem `noindex`, `no-store` e `no-referrer`. `verifica:publico`,
`verifica:revisao` e o build passaram. O merge `59c34dc` entrou em produção no
deployment `dpl_4kVJrSfCBDrKumY7aPYf5nW1NdTj`; o token real ficou bloqueado
antes do GO e abriu depois dele com áudio assinado. A primeira entrega à Karyne
foi confirmada e a reexecução ficou deduplicada. Recibo, migrações e evidência
sanitizada estão no handoff operacional do OpenClaw.

### Checkpoint visual publicado em 07/08/2026

A direção **Editorial de Performance** foi aplicada ao catálogo compartilhado,
validada em Karyne, Aviarte, Zenun e no cenário de quatro plataformas e
publicada na Vercel. O código do redesign está em `e4d6f13`; a aprovação e a
publicação foram registradas em `a181e73`; o checkpoint que levou o código
aprovado à produção é `61e27c8`. Evidências, before/after e critérios dos gates
ficam em `docs/design-relatorios-open-design/`.

O “aprovado pelo Flávio” neste registro é a decisão de produto, direção visual
e publicação dada pelo PO no chat; não significa revisão de código. A revisão
técnica, os testes e as evidências de produção são responsabilidade do agente.

Não foi criada página, tema ou exceção por cliente. A mudança é
apresentacional: não altera o conteúdo persistido nem exige novo GO para um
snapshot já aprovado.

### Correção dos criativos — aprovada pelo Flávio

O snapshot real passou a carregar caminho imutável do bucket privado, nunca o
link temporário da Meta. `api/painel-relatorio.ts` repete a autorização da P2 e,
antes de responder, valida que cada caminho pertence ao `cliente_slug` e à
competência da linha; só então cria uma URL assinada por uma hora. A operação
acontece numa cópia: banco e checksum continuam intactos. Caminho cruzado de
outro cliente é recusado e volta para o estado explícito sem miniatura.

As versões 3 de julho foram gravadas como `gerado` e lidas de volta: Karyne
`6176a8dd-294b-481a-ae41-153c07548271`, Aviarte
`3755f9ea-7bc1-4264-905f-0cbc0e196966`. O smoke direto do Storage fechou 8/8 e
30/30 imagens em HTTP 200, com status traduzido e datado em todos os cards.
Nenhum token público foi exibido ou reutilizado. Versões 1 e 2 permanecem intactas.
`npm run verifica:revisao` passou. A tentativa na porta 3001 caiu no `SITE_URL`
porque o callback local autorizado no Supabase é o da 3000. **A porta 3000 fica
reservada ao checkout em validação humana, não à P3 por identidade; a P3 só a
usa quando ela própria for o alvo autorizado do teste.** Por instrução do
Flávio, somente o processo local da P3 foi parado e este worktree assumiu a
porta; nenhum arquivo do checkout protegido foi alterado.

Antes da entrega ao Flávio, passaram as quatro regressões do painel e o build
completo. O `lint` continua somente nos seis erros React/TypeScript
preexistentes já registrados; esta entrega não acrescentou erro de tipagem.

A fila antes mapeava cada linha versionada do banco diretamente para a tela.
Por isso v1, v2 e v3 pareciam três relatórios. Agora ela consolida por
`cliente_slug + competencia` e escolhe a maior `versao`; o histórico continua
no banco e não vira trabalho duplicado.

---

## 1.2 A tabela tem dois clientes e três versões de cada — julho de 2026

Esta seção dizia o contrário até 2026-08-06, e a inversão é a notícia da
rodada: `public.relatorios` começou com Karyne e Aviarte v1. A correção dos
criativos acrescentou v2 e depois v3 sem sobrescrever histórico: hoje são seis
linhas, todas de `2026-07`, estado `gerado`. A fila mostra somente Karyne v3 e
Aviarte v3; v1/v2 continuam no banco para auditoria. Cada carga foi conferida
linha a linha contra o arquivo de origem — seção 9.5.

A fila deixa de ser tela de espera e passa a ser a tela principal do painel.

---

## 1.1 O que a prévia provou — e o defeito que só ela pegava

A primeira prévia publicada **respondia 500 em todo pedido a
`/api/painel-sessao`**, que é o endereço que decide quem entra. Não era
configuração: era um `import` sem extensão. Está corrigido no commit `f0aba87`,
e o "por quê" está na seção 5.8.

Isso é o argumento da prévia inteiro, num caso só: **a máquina do Flávio dizia
que estava certo e a nuvem dizia que não**, e o sintoma teria chegado
disfarçado de erro de login — a pessoa entraria no Google, voltaria, e travaria
numa tela de erro. Ninguém procuraria num `import`.

### Conferido na prévia, com o defeito já corrigido

| O que | Resultado |
|---|---|
| As três variáveis de ambiente no ambiente de Preview | **as três existem** — como foi medido está na seção 3.2 |
| O endereço e a chave apontam para o projeto certo, e funcionam | sim: o servidor **falou com o Supabase de verdade** e recebeu a recusa esperada para um token inventado |
| `/painel-de-relatorios` | responde 200 |
| O site institucional (`/`, política de privacidade, proposta) | responde 200, com o conteúdo de sempre |
| As oito rotas `/relatorios/demo/*` | respondem 200, todas |
| `X-Robots-Tag: noindex, nofollow, noarchive` no painel | **presente** — era o item que a rodada anterior não teve como conferir |
| O mesmo cabeçalho em `/relatorios/*` | presente |
| `/api/painel-sessao` sem sessão | 401 `sem_sessao` |
| `/api/painel-sessao` com token inválido | 401 `sessao_invalida` |
| Método errado (`DELETE`) | 405 |
| A lista de autorizados vazou para o navegador? | **não** — os 14 arquivos do pacote da prévia foram varridos, o endereço pessoal do Flávio não aparece em nenhum |

### O que continua sem conferir

O login real, a fila e a revisão corrigida foram provados pelo Flávio em desktop
e celular. A configuração da seção 3.1 já foi feita.

---

## 2. O que ficou pronto

| Peça | Onde |
|---|---|
| Rota `/painel-de-relatorios`, carregada sob demanda | `src/App.tsx`, `src/pages/PainelRelatorios.tsx` |
| Sessão Google via Supabase Auth, com o guard do refoco de aba | `src/painel/AuthContext.tsx` |
| Cliente Supabase criado sob demanda | `src/painel/supabase.ts` |
| Botão do Google | `src/painel/BotaoGoogle.tsx` |
| Portão (espera → entrar → barrado → erro → conteúdo) | `src/painel/Portao.tsx` |
| As cinco telas de portão | `src/painel/telas.tsx` |
| Tela autenticada com fila e revisão | `src/painel/PainelInicio.tsx` |
| Pele do painel (tokens `--dc-*`, densidade de ferramenta) | `src/painel/painel.css` |
| **Autorização por e-mail, no servidor** | `api/painel-sessao.ts` + `api/_painel-autorizacao.ts` |
| `noindex` por cabeçalho | `vercel.json` |
| Regressão da autorização | `scripts/verifica-painel-autorizacao.mts` (`npm run verifica:painel`) |
| **A fila do mês (P1)** | `src/painel/Fila.tsx`, montada em `src/painel/PainelInicio.tsx` |
| **A fila, no servidor** | `api/painel-fila.ts` + `api/_painel-fila-dados.ts` |
| **Carregador de snapshot** | `scripts/carrega-relatorio.mts` (`npm run carrega:relatorio`) |
| **Regressão da fila** | `scripts/verifica-painel-fila.mts` (`npm run verifica:fila`) |
| **Bancada e faixa responsiva da P2** | `src/painel/Revisao.tsx`, `src/painel/RevisaoMoldura.tsx` |
| **Detalhe protegido do relatório** | `api/painel-relatorio.ts` |
| **Regressão da revisão e da fonte CRM** | `scripts/verifica-painel-revisao.mts` (`npm run verifica:revisao`) |

### O que veio da SmartBio, e o que não veio

Veio **o padrão de código, nunca credencial e nunca projeto** — são dois
projetos Supabase diferentes, com bases de usuários separadas.

**Reaproveitado:** a forma de criar o cliente Supabase; o ícone do Google em
SVG, literal (é marca, não se redesenha); o esqueleto do `AuthContext`
(sessão, usuário, `isLoading`, `signOut`, `onAuthStateChange`); e a forma do
`ProtectedRoute` — carregando → sem sessão → sem autorização → conteúdo.

**Deixado de fora, de propósito:** `tenant`, `trialDaysLeft`, `effectiveTier`,
`tierError` e o rastreamento de marketing (são de um produto com planos, e
consultam tabelas que este banco não tem); e o `oauth-intent.ts`, que carrega
plano e checkout de um funil de vendas que aqui não existe.

**Escrito do zero:** o endpoint de autorização inteiro, as cinco telas, a pele
e a densidade. A SmartBio não tem nada equivalente — lá quem entra é cliente
pagante, e todo mundo que entra pode usar.

**A decisão de reaproveitar se pagou por um item só, e ele vale por todos:**
o guard do `lastUserIdRef`, na seção 5.1 abaixo.

---

## 3. Configuração de console

Nada disto dá para fazer por código.

> **Todos os passos abaixo foram feitos.** Ficam registrados porque descrevem o
> desenho e servem de roteiro se algum dia for preciso refazer.

### 3.1 — FEITO: autorizar o endereço da prévia no Supabase

Sem isto, quem clicar em "Entrar com o Google" na prévia vai ao Google, volta,
e trava. É um endereço a mais na mesma lista do passo C.

1. <https://supabase.com/dashboard> → projeto **Dácora Reports**.
2. **Authentication** → **URL Configuration** → **Redirect URLs** → **Add URL**.
3. Cole exatamente isto, com o `/**` no fim:

   ```
   https://dacora-lp-git-feat-p0-painel-funda-f228fb-flavio-coras-projects.vercel.app/**
   ```

4. **Save.**

**Não apague os endereços que já estão lá** — são os de produção e o de
`localhost`, e todos continuam valendo.

Esse endereço é **fixo enquanto a branch existir**: a Vercel dá esse mesmo
apelido a cada nova publicação dela, então ele não muda a cada commit. Uma
branch nova ganharia um endereço novo, e precisaria deste mesmo passo.

### 3.2 — Como se sabe que as três variáveis estão lá

Isto foi **medido na prévia publicada**, não suposto, e vale registrar porque a
mesma medida serve para a próxima vez:

- **`VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`**: elas são embutidas na
  página no momento em que ela é construída. Os arquivos publicados foram
  baixados e as duas estão lá — o endereço aponta para o projeto certo (o
  `Dácora Reports`, conferido pelo início do endereço) e a chave está no formato
  novo do Supabase (`sb_publishable_`). Se faltassem, o painel abriria com a
  frase "faltam variáveis de ambiente" em vez da tela de entrada.
- **`PAINEL_EMAILS_AUTORIZADOS`**: esta não pode ser lida de fora, e não deve
  mesmo. O que prova a existência dela é o **próprio endereço de conferência de
  acesso**: sem a lista, ele responde `lista_vazia`; sem endereço ou chave,
  responde `nao_configurado`. Ele respondeu `sem_sessao` — que é a resposta que
  **só existe depois** dessas duas conferências passarem. Ou seja: a lista está
  cadastrada e não está vazia.
- E, com um token inventado, ele respondeu `sessao_invalida` — o que só acontece
  se o servidor **conseguiu falar com o Supabase de verdade**. Isso prova que o
  endereço e a chave não são só existentes, são válidos.

### 3.3 — FEITA na máquina e na Vercel

Ela está no `.env.local` e na Vercel, nos ambientes de Preview e Production.
Foi usada para carregar os dois relatórios e a função publicada da fila está de
pé. Em produção, sem sessão, a função responde `401 sem_sessao` antes de qualquer
leitura do banco.

Ela é a única porta de leitura da tabela, por desenho (seção 7).

**Onde o Flávio pega:** <https://supabase.com/dashboard> → projeto **Dácora
Reports** → **Project Settings** → **API** → a chave **`service_role`** (a
secreta, com aviso de "never share"). **Não** é a `anon`.

**Onde ele cola — dois lugares, e o nome é o mesmo nos dois:
`SUPABASE_SERVICE_ROLE_KEY`.**

1. **Para rodar na máquina dele:** no arquivo `.env.local`, na raiz deste
   projeto, uma linha nova `SUPABASE_SERVICE_ROLE_KEY=...`. Esse arquivo não
   vai para o repositório.
2. **Para a prévia e a produção:** Vercel → projeto **dacora-lp** →
   **Settings** → **Environment Variables**, marcando **Production** e
   **Preview**. Depois, **Redeploy** — a Vercel não aplica variável em quem já
   está no ar.

> **Ela NUNCA leva `VITE_` na frente.** Tudo que começa com `VITE_` é embutido
> na página e qualquer visitante consegue ler. Com essa chave no navegador,
> qualquer visitante leria os relatórios de todos os clientes de uma vez.

### Passo A — Google Cloud (FEITO)

Reaproveitando o cliente OAuth que a SmartBio já usa, por decisão sua.

1. Abra <https://console.cloud.google.com> e escolha, no seletor de projeto
   lá em cima, o projeto onde vive o login da SmartBio.
2. Menu lateral → **APIs e serviços** → **Credenciais**.
3. Na lista **IDs do cliente OAuth 2.0**, clique no cliente que a SmartBio usa.
4. Role até **URIs de redirecionamento autorizados** e clique em
   **+ ADICIONAR URI**.
5. Cole ali o endereço de retorno do projeto `Dácora Reports`. **Ele aparece
   pronto para copiar dentro do Supabase**, na tela do passo B — abra as duas
   abas lado a lado e copie de lá, para não haver erro de digitação.
6. **Não apague nenhum endereço que já esteja na lista.** O login da SmartBio
   depende deles, e é um produto em produção.
7. **Salvar.** O Google pode levar alguns minutos para a mudança valer.
8. Ainda nessa tela, copie o **ID do cliente** e a **Chave secreta do cliente**
   — são eles que vão no passo B.

### Passo B — Supabase, ligar o Google (FEITO)

1. Abra <https://supabase.com/dashboard> e entre no projeto **Dácora Reports**
   (o mesmo que guarda os relatórios; **não** é o da SmartBio).
2. Menu lateral → **Authentication** → **Sign In / Providers**.
3. Clique em **Google** e ligue a chave **Enable Sign in with Google**.
4. Cole o **Client ID** e o **Client Secret** que você copiou no passo A.8.
5. **É nessa mesma tela que aparece o endereço de retorno (`Callback URL`)
   que o passo A.5 pede.** Copie de lá.
6. **Save**.

### Passo C — Supabase, autorizar os endereços de volta (FEITO para produção, localhost e prévia)

Sem isto o login entra no Google, volta, e para numa tela de erro sem
explicação.

1. **Authentication** → **URL Configuration**.
2. Em **Site URL**, deixe `https://www.dacora.com.br`.
3. Em **Redirect URLs**, clique em **Add URL** e acrescente, um por vez:
   - `https://www.dacora.com.br/painel-de-relatorios`
   - `https://dacora.com.br/painel-de-relatorios`
   - `http://localhost:3000/painel-de-relatorios` — este é só para testar na
     sua máquina; pode remover depois.
4. **Save**.

### Passo D — Vercel, as três variáveis (FEITO e medido, seção 3.2)

1. Abra <https://vercel.com> → projeto **dacora-lp** → **Settings** →
   **Environment Variables**.
2. Cadastre três, **com estes nomes exatos**:

   | Nome | Onde achar o valor |
   |---|---|
   | `VITE_SUPABASE_URL` | Supabase → Project Settings → API → *Project URL* |
   | `VITE_SUPABASE_ANON_KEY` | Supabase → Project Settings → API → chave *anon / publishable* |
   | `PAINEL_EMAILS_AUTORIZADOS` | os dois e-mails, separados por vírgula — já estão no `.env.local` da sua máquina, copie de lá |

3. Marque **Production** e **Preview** nas três.
4. **Nunca** ponha `VITE_` na frente de `PAINEL_EMAILS_AUTORIZADOS`. Tudo que
   começa com `VITE_` é embutido na página e qualquer visitante consegue ler.
5. Depois de salvar, é preciso **publicar de novo** (*Redeploy*) para as
   variáveis valerem — a Vercel não aplica em quem já está no ar.

### Passo E — opcional, mas recomendado

O projeto `Dácora Reports` está hoje com **cadastro por e-mail e senha ligado
e aberto**. O painel só aceita entrada pelo Google (o código confere isso e
recusa o resto), então essa porta não leva a lugar nenhum — mas ela também não
serve para nada aqui. Se quiser fechar: **Authentication → Providers → Email →
desligar**.

### Depois de tudo isso

Abra `https://www.dacora.com.br/painel-de-relatorios` e entre com cada um dos
dois e-mails. Se der erro, **a causa mais provável é um destes cinco passos**,
não o código. As mensagens de erro do painel foram escritas para dizer qual.

---

## 4. O que NÃO deu para conferir, e por quê

Registrado com todas as letras para ninguém achar que foi testado.

| Não conferido | Motivo |
|---|---|
| **A tela de barrado com um e-mail real** | provada no servidor (seção 5.2) e renderizada sem erro; não foi usada uma terceira conta Google real |

**Dois itens saíram desta lista em 2026-08-06, porque a prévia os resolveu:** o
`noindex` por cabeçalho **está no ar e foi medido** (seção 1.1), e o provedor
Google **já está ligado** — o que travava o login não trava mais.

**O que foi conferido de verdade:** a página abre na rota, com título e
`noindex` na própria página; a pele carrega com os tokens certos; as seis telas
renderizam sem erro; no celular (375px) nada rola de lado e o botão tem 48px de
altura; o endpoint responde 401 sem sessão, 401 com sessão inválida **contra o
Supabase real** e 405 em método errado; e os e-mails autorizados **não aparecem
em lugar nenhum do pacote publicado** (seção 5.3).

---

## 5. As armadilhas desta rodada — leia antes de mexer

### 5.1 O `gotrue-js` reemite `SIGNED_IN` a cada refoco de aba

O evento repetido é comportamento da biblioteca; a recarga era nossa. Ao voltar
para a janela, o `gotrue-js` relê a sessão do armazenamento e emite `SIGNED_IN`
com **um objeto novo em memória**, embora pessoa e token sejam os mesmos. O
guard do `AuthContext` já impedia nova autorização e nova tela de espera, mas
precisava manter `setSessao` para não prender um token renovado.

A dependência escondida estava na fila: `buscar` dependia do objeto inteiro da
sessão, e o `useEffect` dependia de `buscar`. Objeto novo → callback novo → nova
consulta → esqueleto → tabela remontada. A correção em `Fila.tsx` depende apenas
do id estável da pessoa e lê o token atual por `ref`: refoco e refresh ficam
silenciosos; troca de pessoa e ação manual continuam usando a sessão atual.

Num painel de aprovação isso é pior que num app comum: quem está lendo um
relatório de 17 seções, rola até a metade, troca de aba para conferir um número
no Meta e volta — **perde o lugar**. O guard do `AuthContext` e a estabilidade da
busca em `Fila.tsx` são duas metades da mesma proteção; remover qualquer uma
reabre o defeito.

### 5.2 O que "provar a autorização" quer dizer aqui

`npm run verifica:painel` roda o endpoint **de verdade**, com só a resposta do
Supabase substituída por um dublê. Ele prova, hoje:

- os dois e-mails autorizados entram — inclusive escritos com maiúscula;
- um terceiro é barrado com **o e-mail dele de volta** (a tela precisa dizer
  quem entrou) e **sem a lista de autorizados na resposta**;
- e-mail autorizado entrando por outro provedor que não o Google: barrado;
- lista vazia ou banco não configurado: **ninguém entra**. Falha fechado.

Se você mexer no arquivo de autorização, rode isso. É a única peça do painel
que decide quem entra e a única que dá para provar sem três contas Google na
mão.

### 5.3 Como conferir que a lista de e-mails não vazou

`npm run build` e depois procurar os endereços dentro de `dist/`. Feito nesta
rodada, com um detalhe que engana:

> `contato@nandacora.com.br` **aparece sim** no pacote do navegador — e está
> certo. É o e-mail de contato da **política de privacidade**, que já estava lá
> antes deste trabalho e é público de propósito. Quem bater o olho e concluir
> "a lista vazou" vai atrás de um problema que não existe.

O termo que **não pode** aparecer em lugar nenhum é o endereço pessoal do
Flávio. Nesta rodada ele não aparece em nenhum dos 104 arquivos do build.

### 5.4 O servidor local não lê `.env.local` sozinho

`dotenv` lê `.env`; `.env.local` é convenção do **Vite**. O efeito era cruel:
o navegador enxergava as variáveis e as funções em `api/` não, então a
conferência de acesso respondia "não configurado" numa máquina que estava
configurada — e só depois do login. Resolvido em `server.ts`, que agora carrega
`.env.local` e `.env`, nessa ordem.

### 5.5 O que decide acesso nunca mora no navegador

A tela esconder um botão é **conforto, não segurança**. Toda função de servidor
que vier depois (a fila, a aprovação, o envio) **repete a conferência de sessão
e e-mail por conta própria**, sem confiar em ter sido chamada pela tela certa.

E a lista de e-mails, hoje e sempre, sem prefixo `VITE_`.

### 5.6 Este repositório é público

Por isso **este documento não escreve** o endereço do projeto no Supabase, a
chave pública, nem o e-mail pessoal do Flávio. Todos os passos acima mandam
copiar o valor da tela onde ele já está. Se você for acrescentar exemplo aqui,
mantenha essa disciplina.

### 5.7 A rota tem `noindex` em três camadas, e nenhuma sobra

O meta na própria página, o cabeçalho `X-Robots-Tag` no `vercel.json` (que o
rastreador lê **sem executar JavaScript**, que é o caso que importa num SPA), e
a ausência da rota em `scripts/seo-routes.mjs`, que a mantém fora da
pré-renderização e do sitemap. Não remova nenhuma achando que as outras cobrem.

**As três estão conferidas no ar** desde 2026-08-06 (seção 1.1).

### 5.8 Import sem extensão entre arquivos de `api/` derruba a função inteira

Custou a primeira prévia. `api/painel-sessao.ts` importava
`'./_painel-autorizacao'` — sem extensão — e **todo** pedido respondia 500
`FUNCTION_INVOCATION_FAILED`, com `ERR_MODULE_NOT_FOUND` no log.

A Vercel compila cada arquivo de `api/` para um módulo ESM **separado**, sem
juntar os vizinhos, e o Node em ESM não completa extensão sozinho. O `tsx` (o
`npm run dev`) e o `esbuild` (que empacota o `server.ts`) completam — então
**localmente funciona e publicado não**, que é a pior forma de um defeito
aparecer.

**A regra:** todo import relativo dentro de `api/` leva `.js` no fim, mesmo
apontando para um arquivo `.ts`. O TypeScript resolve `.js` para o `.ts` ao
lado, então continua sendo um módulo compartilhado só. O comentário no
`painel-sessao.ts` guarda isso, porque a extensão parece sobra e a próxima
pessoa vai querer tirá-la.

**Como pegar isso na próxima vez, sem login:** bater no endereço da prévia sem
sessão nenhuma. Ele tem que responder 401 `sem_sessao`. Qualquer 500 ali é a
função quebrada, e a resposta diz qual dos três casos é (`nao_configurado`,
`lista_vazia`, ou um erro de verdade).

---

## 6. Decisões tomadas no caminho

1. **Não existe rota `/login`.** O painel tem um endereço só; quem não entrou vê
   a tela de entrada nele mesmo. Isso resolve de graça duas exigências do plano:
   o retorno do Google cai no lugar certo, e a sessão que expira no meio da
   revisão devolve a pessoa à mesma revisão.
2. **O cliente Supabase é criado sob demanda, não na importação do arquivo.** Na
   SmartBio ele lança erro na importação se faltar variável; aqui isso derrubaria
   a pré-renderização do **site institucional inteiro** no build. O erro continua
   alto, mas vira uma frase em português na tela do painel.
3. **Recusar quem não entrou pelo Google**, mesmo com e-mail autorizado. O
   projeto tem cadastro por e-mail e senha ligado; sem esta conferência, alguém
   poderia registrar um dos dois endereços e entrar sem nunca passar pelo Google.
   Custou três linhas.
4. **"Não autorizado" não é erro.** É resposta legítima e tem tela própria, com o
   e-mail que entrou e o que fazer. Quem cai numa tela genérica conclui que o
   sistema quebrou.
5. **A tela autenticada da P0 nasceu vazia de propósito.** A P1 substituiu esse
   vazio pela fila real depois que `public.relatorios` recebeu Karyne e Aviarte.
6. **Um script de regressão, sem trazer suíte de testes para o projeto.** O
   projeto não tem nenhuma, e montar uma não é escopo da P0; mas a peça que
   decide quem entra não podia ficar sem prova.
7. **O endereço da prévia é público, e isso está certo.** A proteção de prévia
   da Vercel foi desligada neste projeto em 2026-08-03, com autorização do
   Flávio, para a Fernanda abrir pelo celular sem conta na Vercel. Quem achar o
   endereço vê **a tela de entrada**, e mais nada: quem decide o acesso é a lista
   de e-mails no servidor, e a tabela de relatórios só é lida pela chave de
   serviço. O que fica exposto é rascunho de um site que já é público.

---

## 7. A próxima coisa a fazer

1. **Gate 3 da Fernanda:** validar nominalmente os relatórios completos
   publicados de Karyne (serviços/leads) e Aviarte (e-commerce): leitura,
   conteúdo, estados indisponíveis, tabelas e acabamento. Registrar o resultado;
   o GO visual do Flávio não substitui esse gate de uso.
2. **P3, em sessão própria e só depois de autorização específica:** habilitar aprovar e recusar, com checksum
   carimbado e motivo obrigatório. Está **pausada e não aprovada para merge** no
   checkout `repo`, branch `codex/p3-aprovacao-recusa`, com a migração
   `supabase/migrations/20260807001052_painel_p3_aprovacao_recusa.sql` vazia e
   ainda não rastreada. É placeholder, não implementação. Não mover, commitar,
   aplicar no Supabase ou integrar por inferência.
3. **P5:** depois do GO, abrir o diálogo de envio com o grupo pelo nome e
   `Agora não` como saída legítima.
4. **P4:** recusa avisa o grupo `Dácora - Agentes`.
5. **P6:** histórico e auditoria; **P7:** comentário humano editável antes do GO.

**Dashboard operacional:** é uma proposta para as próximas fases, ainda não
aprovada nem numerada. Deve ser avaliada sem transformar estes relatórios
fechados e versionados em BI ao vivo e sem entrar silenciosamente no escopo da
P3.

> **A W2 deixou de ser bloqueio da P1.** Este documento dizia que a fila
> dependia da fase W2 no `OpenClaw-Dacora` — a etapa que faz o relatório
> gerado virar linha no banco. Na prática o que faltava era **um carregador**,
> e ele agora existe aqui (seção 9): os dois snapshots que a W1 já produziu
> vão para o banco com um comando cada. A W2 continua valendo como automação
> (gerar e gravar num passo só), não como pré-requisito.

**A RLS da tabela está ligada sem nenhuma política, de propósito** — o acesso
público lê zero, e a única porta é a chave de serviço, no servidor. **Criar
política de leitura pública ali entrega o relatório de um cliente para
outro.**

---

## 9. O carregador de relatórios (fase A da P1)

`npm run carrega:relatorio -- "<caminho do snapshot>.json"` —
`scripts/carrega-relatorio.mts`. Lê **um** snapshot do disco e grava **uma**
linha em `public.relatorios`.

Os dois comandos que enchem a fila, quando a chave da seção 3.3 existir:

```
npm run carrega:relatorio -- "C:\...\OpenClaw-Dacora\out\relatorios\karyne_magalhaes-2026-07.json"
npm run carrega:relatorio -- "C:\...\OpenClaw-Dacora\out\relatorios\aviarte-2026-07.json"
```

### 9.1 A regra que o script trava sozinho

**O snapshot nunca entra neste repositório.** Ele tem números reais de cliente
e o repositório é público. O script **recusa qualquer caminho que esteja
dentro da pasta do projeto** — não é aviso no comentário, é recusa com saída
de erro, provada.

### 9.2 O que ele confere, e o que ele deliberadamente NÃO confere

**Não confere:** formato da competência, tamanho do token, versão repetida.
Isso tudo já é **restrição da tabela**, e reimplementar aqui criaria uma
segunda fonte de verdade para divergir da primeira. Quando o banco recusa, o
script mostra a recusa dele inteira, sem traduzir.

**Confere uma coisa só, e ela não duplica nada:** recalcula o checksum a
partir do conteúdo que vai ser gravado e compara com o que veio no arquivo. Se
divergirem, o que seria gravado não é o que foi apurado — e aí gravar é pior
que falhar. Os dois snapshots batem.

### 9.3 Três decisões de formato, e o porquê de cada uma

1. **O `conteudo` gravado é o snapshot SEM o bloco `publicacao`.** Aquele bloco
   é o envelope (estado, versão, checksum, quem aprovou), e o envelope são as
   **colunas**. Guardar uma segunda cópia dele dentro de um `conteudo` que é
   imutável por gatilho congelaria um `"estado": "gerado"` para sempre dentro
   de um relatório que amanhã estará aprovado e enviado — duas respostas para
   a mesma pergunta, e a de dentro sempre errada. É também exatamente o objeto
   que o checksum cobre.
2. **O token é sorteado** (32 bytes, 43 caracteres), nunca derivado do nome, do
   slug ou da competência. Não há login no relatório: quem tem o link vê. Se o
   token derivasse do cliente, o link de um entregaria os outros por
   adivinhação. **Ele nunca sai inteiro em log** — o script imprime só o
   tamanho e os quatro primeiros caracteres.
3. **`gerado_em` é a data da fábrica**, não a de agora. A hora em que alguém
   rodou a carga não é fato do relatório.

### 9.4 O que foi provado, e o que não deu

**Provado:**

| O quê | Como |
|---|---|
| Lê os dois snapshots, monta a linha e sorteia o token | `--simular`, nos dois arquivos |
| O checksum dos dois bate com o conteúdo | recalculado dos dois, confere |
| Caminho dentro do repositório é recusado | tentado de propósito, recusou |
| Sem a chave, ele **para e explica onde pegar e onde colar** | rodado sem a chave |
| A tabela aceita exatamente as colunas que o script preenche | linha-sonda gravada e apagada, direto no banco |
| A tabela recusa versão repetida, competência torta e token curto | as três tentadas contra o banco real; **as três recusadas**, e a tabela voltou a zero linhas |

**O que faltava era a gravação de verdade — e ela aconteceu.** Ver 9.5 e 9.6.

### 9.5 A carga real, e o que foi conferido depois dela

Os dois comandos rodaram em 2026-08-06. A tabela tem duas linhas:

| | Karyne Magalhães | Aviarte |
|---|---|---|
| `cliente_slug` / `competencia` | `karyne_magalhaes` · `2026-07` | `aviarte` · `2026-07` |
| versão · estado | 1 · `gerado` | 1 · `gerado` |
| `checksum` | igual ao do snapshot | igual ao do snapshot |
| `conteudo` | idêntico ao arquivo | idêntico ao arquivo |
| `gerado_em` | a data da fábrica, não a da carga | idem |
| `token` | 43 caracteres | 43 caracteres |

**A conferência do token foi além de contar caracteres**, porque o requisito
não é comprimento, é não ser adivinhável a partir do cliente:

- não contém o slug, o nome do cliente nem a competência, em nenhuma grafia;
- **não é hash de nenhum deles** — foram gerados os digests de `slug`,
  `slug-competencia`, `slug+competencia`, `slug:competencia` e nome, em
  SHA-256/SHA-1/MD5/SHA-512, nas três codificações, e nenhum casa com o token;
- os dois tokens **não têm um único caractere em comum no começo**, que é o que
  se espera de sorteio e não de derivação.

### 9.6 ⚠️ O `jsonb` do Postgres REORDENA as chaves — e isso reprovou a
### primeira carga com a linha já gravada

A primeira execução real gravou a Karyne corretamente e **morreu logo depois**,
na conferência de leitura de volta, dizendo *"o que voltou do banco NÃO é o que
foi mandado"*. Era o script que estava errado, não o banco.

`jsonb` **não guarda o texto do JSON — guarda a estrutura**, com as chaves
reordenadas por tamanho e depois alfabeticamente. O que subiu como
`identidade,fontes,montagem,dados,leitura` voltou como
`dados,fontes,leitura,montagem,identidade`. Mesmo objeto, mesmos 44.372
caracteres, `JSON.stringify` diferente — e SHA-256 de textos diferentes dá
digest diferente. Recalcular o checksum a partir do que o banco devolve
**reprova sempre**.

O read-back hoje compara o conteúdo numa forma canônica (chaves ordenadas nos
dois lados), que prova a mesma coisa sem depender de uma ordem que o Postgres
nunca prometeu preservar.

> **A regra que sai daí vale muito além do carregador, e a P3 tropeça nela se
> ninguém avisar:** o checksum é a impressão digital **do arquivo que a fábrica
> gerou**, e só pode ser recalculado a partir dele. Para responder *"o
> relatório mudou desde o GO?"*, compare a **coluna** `aprovado_checksum` com o
> checksum da nova geração — **nunca** recalcule a partir do `conteudo` lido do
> banco.

**O efeito colateral:** aquela primeira carga deixou uma linha órfã no banco,
de uma execução que terminou em erro. Ela foi removida e a carga refeita do
zero com o script corrigido, para o procedimento documentado valer como está
escrito. **Quem vir uma carga falhar depois do `✔ Gravado`, confira a tabela
antes de rodar de novo** — a versão repetida vai ser recusada, e a recusa é
correta.

---

## 11. A fila do mês (P1) — o que ela faz e o que foi medido

**Só leitura.** Não existe botão de aprovar, recusar ou enviar, e a ausência é
a decisão: aprovar sem o relatório na tela é o que este painel existe para
impedir, e um botão na lista convida exatamente a isso. Isso é a P2/P3.

Quem calcula é o servidor (`api/_painel-fila-dados.ts`); a tela apresenta.

### 11.1 A ordem, que é a entrega inteira da fase

Duas camadas, nesta ordem: **primeiro o que espera decisão** (um relatório já
enviado não pede nada de ninguém, por mais sinais que tenha); **dentro de cada
faixa, o mais pesado primeiro**. Alfabético é só desempate, para a lista não
dançar entre dois carregamentos.

Os sinais e seus pesos: coleta com falha (50), investimento ausente (40),
plataforma sem evento de resultado definido (30), seções indisponíveis
(20 + 5 por seção extra), variação forte contra o mês anterior (12).

### 11.2 Cinco regras da casa que a fila herda, e por quê

1. **Ausência não vira zero.** Sem nenhum investimento apurado, a célula é um
   traço. `R$ 0,00` ali afirmaria que o cliente não gastou nada no mês — uma
   frase sobre o negócio dele, dita por engano.
2. **Só faixas de PLATAFORMA entram na soma.** A Aviarte tem, além do Meta
   inteiro, faixas por grupo de campanha, todas com uma métrica chamada
   "Investimento". Somar tudo mostraria o mês em dobro e nada pareceria errado.
3. **Resultado NÃO soma entre plataformas.** Investimento soma porque dinheiro
   gasto não se sobrepõe; resultado não, porque a mesma venda pode ser
   atribuída pelo Meta e pelo Google ao mesmo tempo. A fila mostra lado a lado,
   dizendo de onde vem cada um: `Meta 158 · Google 60,09 compras`.
4. **Comparação proibida continua proibida.** Quando o relatório marca uma
   comparação como não permitida (mês incompleto, valor travado em faixa), a
   fila não a faz por fora.
5. **Estado com forma E texto, nunca só cor** — círculo vazado, losango,
   círculo cheio, traço; e o texto por extenso, com quem aprovou e quando.

### 11.3 A conversão fracionada do Google

O Google Ads atribui conversões em pedaços: uma venda tocada por três anúncios
vira frações de crédito, e o mês fecha em `60,089809`. Na fila, **as casas
decimais só aparecem quando existem** — `16,00` vira `16`, `60,089809`
continua `60,09`. Nenhum número é arredondado para caber; só param de ser
escritos zeros que não informam. Quando há fração, o detalhe da célula diz por
quê, senão a pessoa acha que a plataforma contou errado.

Isso vive em `Fila.tsx` e **não** em `src/reports/format.ts` de propósito:
aquele arquivo formata o relatório que vai ao cliente, que já está fechado.

### 11.4 O celular, com números medidos

A Fernanda revisa no celular, então isto foi medido e não estimado. **Em 375px
a tabela pedia 517px de largura e só cabiam 341 — e o que ficava para fora era
a coluna de SINAIS**, ou seja, exatamente a informação pela qual a fila existe,
atrás de uma rolagem lateral que ninguém adivinha.

Correção: abaixo de 820px, **três** colunas saem da grade (estado,
investimento, resultado) e voltam como linhas de apoio sob o nome do cliente,
deixando cliente e sinais. Depois disso: 375px cabe sem rolagem lateral
nenhuma, e a página nunca rola de lado em nenhuma largura testada (375, 414,
768, 820, 830, 1024, 1280, 1600).

> **O corte é 820px, e não os 767px de costume.** Com as cinco colunas a tabela
> só passa a caber a partir de 800px; em 768 — o iPad em retrato — faltavam
> 26px. Um corte em 767 deixaria justamente esse aparelho no pior dos dois
> mundos. **O número saiu de medir, não de escolher pelo nome do aparelho.**

Densidade conferida: **linha de 48px no desktop**, dentro da faixa de 44–52 do
handoff.

### 11.5 O que foi provado, e como

`npm run verifica:fila` — a lógica pura (números, sinais, ordem), o endpoint
inteiro com o Supabase dublado, **e a tabela desenhada**.

| O quê | Como |
|---|---|
| A ordem por atenção, com o enviado no fim e o alfabeto só como desempate | fila de 5 clientes montada no teste |
| Ausência não vira zero; grupo de campanha não entra na soma | casos próprios |
| Comparação proibida não vira sinal; plataforma não contratada não vira ruído | casos próprios |
| **Quem não passa na porta não chega perto do banco** | as consultas são contadas: sem sessão, e-mail fora da lista ou provedor errado → **zero chamadas ao banco** |
| A coluna `token` nunca é pedida | a URL de cada consulta é inspecionada |
| Sem a chave de serviço, falha alto — nunca cai para a chave pública | a chave é removida do ambiente e o resultado é 500, não fila vazia |
| Competência torta é recusada antes de virar consulta | `2026-13` e uma tentativa de injeção |
| Mês vazio explica; banco vazio explica outra coisa | HTML renderizado, sem `<table>` nos dois |
| Tabela de verdade, com `scope`, `caption` e estado por forma+texto | HTML renderizado |
| Nenhum botão de aprovar/recusar/enviar nesta tela | HTML renderizado |

**Além da regressão**, o endpoint real foi rodado contra o **banco real** com os
dois relatórios, com só a sessão dublada: resposta 200, `no-store`, **2,2 KB**
para o navegador (o `conteudo` de ~50 KB por relatório fica no servidor), e
nem o token nem o conteúdo inteiro na resposta.

E o pacote publicado (`npm run build`) foi varrido: o e-mail pessoal do Flávio
não aparece; a chave de serviço **não** aparece — só o **nome** da variável,
dentro do texto que a tela mostra quando ela falta, o que é o comportamento
desejado.

### 11.6 O que NÃO foi provado

O fluxo autenticado completo da P2 saiu desta lista: depois da correção, o
Flávio validou desktop e celular.

### 11.7 A recarga ao trocar de janela — corrigida e com regressão

`npm run verifica:refoco` monta a `FilaComSessao` real num DOM isolado e conta
as consultas. Ele prova quatro contratos:

1. sessão relida como objeto novo, com a mesma pessoa e o mesmo token, não
   consulta nem remonta a fila;
2. token renovado também não consulta sozinho;
3. a próxima ação manual usa o token renovado, não o antigo;
4. trocar de pessoa é mudança real e consulta novamente.

O teste falhou antes da correção com duas consultas no refoco e passou depois.
Na publicação de 2026-08-06, o build completo passou, as doze rotas públicas
responderam `200`, o painel manteve `X-Robots-Tag: noindex, nofollow, noarchive`
e `/api/painel-sessao` e `/api/painel-fila` responderam `401 sem_sessao`, sem
devolver item de cliente.

### 11.8 A Karyne não dependia do Supabase do site para abrir

O diagnóstico leu, sem alterar, as duas linhas do `Dácora Reports` e montou os
dois snapshots no navegador. A revisão não faz chamada ao projeto da Karyne:
os dados do funil já estão congelados no snapshot. A quebra acontecia porque
três blocos desse snapshot declaram `plataforma: "crm"`, valor produzido pelo
gerador do `OpenClaw-Dacora`, mas o `PlataformaId` e o tema visual deste
repositório ainda não conheciam `crm`. `preenchimentoBarra` recebia a fonte e
tentava ler `textura` de uma série inexistente.

O checkpoint `05323e2` incluiu `crm` no contrato, no nome exibido e no tema,
mais regressão direta para o preenchimento. A mesma rodada eliminou a rolagem
horizontal móvel causada pelos rótulos de unidade e pela tabela de campanhas.
Karyne passou com oito gráficos em desktop e celular; Aviarte passou nos dois
tamanhos. Nenhum banco remoto foi alterado.

### 11.9 Pendência de dado histórico da Karyne — pertence à fábrica

Até 21/06/2026, as campanhas da Karyne levavam direto ao WhatsApp e o resultado
otimizado era **mensagens iniciadas**. A partir de 22/06/2026, passaram a usar a
conversão do site. A evolução anual atual aplica o evento novo retroativamente e
por isso deixa de contar as mensagens dos meses anteriores: janeiro a junho
ficam historicamente errados, embora os dados atuais não sejam afetados.

Não é correção do painel: ele reproduz fielmente o snapshot persistido. A
fábrica no `OpenClaw-Dacora` deve rastrear qual evento de conversão cada
campanha/conjunto otimizava em cada período, por ID e vigência, e agregar cada
mês com a definição que valia naquele momento. Nunca aplicar a conversão atual
ao histórico inteiro. A pendência precisa ser resolvida antes de escalar a
montagem para mais relatórios com mudança de objetivo ao longo do tempo.

---

## 10. Achado fora do escopo, para quem cuidar do `OpenClaw-Dacora`

Esta sessão trabalhou só no `dacoraLP` e não tocou no outro repositório. Fica
registrado aqui para outra sessão levar:

> O projeto Supabase `Dácora Reports` está com **cadastro por e-mail e senha
> ligado e aberto** (`disable_signup: false`). Não abre buraco no painel — o
> código recusa quem não entrou pelo Google —, mas é uma porta sem uso num
> projeto que só devia aceitar Google. Vale desligar (passo E da seção 3).
