# Painel de aprovação de relatórios — onde a obra parou

**Rota:** `/painel-de-relatorios`
**Fase concluída:** P0 (fundação e login)
**Branch:** `feat/p0-painel-fundacao-login` — publicada no `origin` com autorização
do Flávio. **Sem merge na `main` e sem produção.**
**Prévia no ar:**
<https://dacora-lp-git-feat-p0-painel-funda-f228fb-flavio-coras-projects.vercel.app>
**Última atualização:** 2026-08-06

O plano completo (as oito fases, o que o painel faz e por quê) vive no
`OpenClaw-Dacora`, em `docs/HANDOFF_PAINEL_APROVACAO_2026-08-06.md`. **Este
arquivo é o de continuidade:** ele diz o que existe, o que falta, e o que já
custou caro descobrir.

> ### Regra que vale para todas as fases
>
> Ao terminar uma fase — **e também ao parar no meio dela** — atualize este
> arquivo e faça o commit no mesmo passo. Ele é o que faz a próxima sessão
> continuar em vez de recomeçar.

---

## 1. Situação em uma frase

**O painel está publicado numa prévia, com as três variáveis de ambiente
cadastradas e medidas. Falta uma coisa só para o login funcionar: autorizar o
endereço da prévia no Supabase** (seção 3.1).

O provedor Google **já foi ligado** no projeto `Dácora Reports` desde que este
documento foi escrito, e as duas contas autorizadas entraram na máquina local.
Os passos A, B, C e D da seção 3 estão feitos.

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

**O login de verdade.** Quem fez esta rodada não tem as contas do Flávio nem da
Fernanda, e não deve ter. A volta completa pelo Google só é provada por eles —
e **antes disso falta o passo da seção 3.1**.

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
| Tela autenticada vazia | `src/painel/PainelInicio.tsx` |
| Pele do painel (tokens `--dc-*`, densidade de ferramenta) | `src/painel/painel.css` |
| **Autorização por e-mail, no servidor** | `api/painel-sessao.ts` + `api/_painel-autorizacao.ts` |
| `noindex` por cabeçalho | `vercel.json` |
| Regressão da autorização | `scripts/verifica-painel-autorizacao.mts` (`npm run verifica:painel`) |

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

> **Os passos A, B, C e D abaixo JÁ FORAM FEITOS** (Google ligado, endereços de
> retorno de produção e de `localhost` autorizados, três variáveis cadastradas
> na Vercel). Ficam registrados porque descrevem o desenho e servem de roteiro
> se algum dia for preciso refazer. **O que falta é a 3.1, e só ela.**

### 3.1 — FALTA FAZER: autorizar o endereço da prévia no Supabase

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

### Passo C — Supabase, autorizar os endereços de volta (FEITO para produção e localhost; falta o da prévia, seção 3.1)

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
| **O login de verdade, na prévia** | quem fez esta rodada não tem as contas Google do Flávio e da Fernanda, e não deve ter. E falta a seção 3.1 |
| **O guard do refoco de aba na prática** | ele só dispara com sessão viva. Foi copiado do arquivo da SmartBio, onde está em produção há meses |
| **A tela de barrado com um e-mail real** | provada no servidor (seção 5.2) e renderizada sem erro; a volta completa pelo Google não |

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

Não é bug do nosso código, é comportamento da biblioteca: toda vez que a aba
volta a ficar visível, ela reemite o evento de login **com a mesma sessão**.
Sem comparar o usuário antes e depois com um `ref`, isso derruba o estado de
carregamento, o portão volta para a tela de espera e **desmonta a página
inteira**.

Num painel de aprovação isso é pior que num app comum: quem está lendo um
relatório de 17 seções, rola até a metade, troca de aba para conferir um número
no Meta e volta — **perde o lugar**. O guard está em `AuthContext.tsx`, com
comentário. **Não o remova por parecer redundante.**

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
5. **A tela autenticada da P0 está vazia de propósito.** Uma fila de exemplo
   numa tela cujo trabalho é decidir o que vai para o cliente seria dado falso no
   lugar exato onde ele não pode existir. A tabela `public.relatorios` tem zero
   linhas hoje.
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

**Em ordem:**

1. **O Flávio faz a seção 3.1** — um endereço a mais na lista de retorno do
   Supabase. É o único passo de console que falta.
2. **O Flávio e a Fernanda entram na prévia pelo celular**, cada um com a sua
   conta, e o resultado volta para cá. Se sobrar um terceiro e-mail à mão, vale
   ver a tela de barrado de verdade.
3. **Aí sim, a P1 (a fila).** Ela depende de outra coisa que **ainda não
   existe**: a fase W2, no `OpenClaw-Dacora`, é o que faz o relatório gerado
   virar linha na tabela `public.relatorios`. Hoje a tabela está vazia. Sem a
   W2, a P1 não tem o que listar.

**Quando a P1 começar**, ela vai precisar de uma variável nova, que ainda não
existe em lugar nenhum: `SUPABASE_SERVICE_ROLE_KEY`, só no servidor e **nunca**
com prefixo `VITE_`. A RLS da tabela está ligada **sem nenhuma política, de
propósito** — o acesso público lê zero, e a única porta é essa chave, no
servidor. **Criar política de leitura pública ali entrega o relatório de um
cliente para outro.**

---

## 8. Achado fora do escopo, para quem cuidar do `OpenClaw-Dacora`

Esta sessão trabalhou só no `dacoraLP` e não tocou no outro repositório. Fica
registrado aqui para outra sessão levar:

> O projeto Supabase `Dácora Reports` está com **cadastro por e-mail e senha
> ligado e aberto** (`disable_signup: false`). Não abre buraco no painel — o
> código recusa quem não entrou pelo Google —, mas é uma porta sem uso num
> projeto que só devia aceitar Google. Vale desligar (passo E da seção 3).
