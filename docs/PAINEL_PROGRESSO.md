# Painel de aprovação de relatórios — onde a obra parou

**Rota:** `/painel-de-relatorios`
**Fase concluída:** P0 (fundação e login) · **Fase A da P1 — o carregador RODOU:
os dois relatórios estão no banco** (seção 9.5)
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

**A fila do mês está de pé, lendo do banco, com os dois relatórios reais
dentro.** Na máquina do Flávio ela funciona ponta a ponta. O que falta é de
console, não de código: **autorizar o endereço da prévia no Supabase**
(seção 3.1) e **cadastrar a chave de serviço na Vercel** (seção 3.3), sem os
quais a prévia mostra a tela de entrada e a fila não carrega lá.

O provedor Google **já está ligado** no projeto `Dácora Reports`, as duas contas
autorizadas entraram na máquina local, e a chave de serviço **já está no
`.env.local`**. Os passos A, B, C e D da seção 3 estão feitos.

---

## 1.2 A tabela de relatórios TEM os dois relatórios — julho de 2026

Esta seção dizia o contrário até 2026-08-06, e a inversão é a notícia da
rodada: **`public.relatorios` tem duas linhas**, a Karyne e a Aviarte, ambas de
`2026-07`, versão 1, estado `gerado`. A carga foi conferida linha a linha
contra os arquivos de origem — seção 9.5.

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

### 3.3 — A chave de serviço: FEITA na máquina, FALTA na Vercel

**Ela já está no `.env.local`** e foi usada para carregar os dois relatórios e
para a fila ler o banco na máquina do Flávio. **O que falta é o segundo lugar:
cadastrá-la na Vercel**, senão a fila na prévia responde `sem_chave_de_servico`
e explica isso na própria tela.

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

1. **O Flávio pega a chave de serviço e cola nos dois lugares** — seção 3.3. É
   o que destrava tudo o que vem depois: sem ela a tabela continua vazia e a
   fila não tem o que mostrar.
2. **Rodar os dois comandos da seção 9** para os relatórios da Karyne e da
   Aviarte entrarem no banco.
3. **O Flávio faz a seção 3.1** — um endereço a mais na lista de retorno do
   Supabase, para o login funcionar na prévia.
4. **O Flávio e a Fernanda entram na prévia pelo celular**, cada um com a sua
   conta, e o resultado volta para cá. Se sobrar um terceiro e-mail à mão, vale
   ver a tela de barrado de verdade.

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

## 10. Achado fora do escopo, para quem cuidar do `OpenClaw-Dacora`

Esta sessão trabalhou só no `dacoraLP` e não tocou no outro repositório. Fica
registrado aqui para outra sessão levar:

> O projeto Supabase `Dácora Reports` está com **cadastro por e-mail e senha
> ligado e aberto** (`disable_signup: false`). Não abre buraco no painel — o
> código recusa quem não entrou pelo Google —, mas é uma porta sem uso num
> projeto que só devia aceitar Google. Vale desligar (passo E da seção 3).
