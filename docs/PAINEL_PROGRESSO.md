# Painel de aprovação de relatórios — onde a obra parou

**Rota:** `/painel-de-relatorios`
**Fase concluída:** P0 (fundação e login)
**Branch:** `feat/p0-painel-fundacao-login` — **sem `push`, sem merge, sem deploy**
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

**O código do login está pronto e conferido. Ele não pode funcionar ainda,
porque o provedor Google não está ligado no projeto do Supabase** — isso é
trabalho de console, é do Flávio, e está detalhado na seção 3.

Isso não é suposição: foi medido. O endereço de configuração do projeto
`Dácora Reports` responde hoje `google: false`, com só o provedor de e-mail
ligado.

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

## 3. O QUE O FLÁVIO PRECISA CONFIGURAR — na ordem, de uma vez

Nada disto dá para fazer por código. Enquanto não estiver feito, **o botão
"Entrar com o Google" vai abrir e voltar com erro** — e o erro será este, não
defeito de programação.

### Passo A — Google Cloud (5 minutos)

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

### Passo B — Supabase, ligar o Google (3 minutos)

1. Abra <https://supabase.com/dashboard> e entre no projeto **Dácora Reports**
   (o mesmo que guarda os relatórios; **não** é o da SmartBio).
2. Menu lateral → **Authentication** → **Sign In / Providers**.
3. Clique em **Google** e ligue a chave **Enable Sign in with Google**.
4. Cole o **Client ID** e o **Client Secret** que você copiou no passo A.8.
5. **É nessa mesma tela que aparece o endereço de retorno (`Callback URL`)
   que o passo A.5 pede.** Copie de lá.
6. **Save**.

### Passo C — Supabase, autorizar os endereços de volta (2 minutos)

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

### Passo D — Vercel, as três variáveis (3 minutos)

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
| **O login de verdade, com os três e-mails** | o provedor Google não está ligado no projeto (medido, não suposto). Sem isso não existe login para testar, e eu não posso — nem devo — entrar nas contas Google do Flávio e da Fernanda |
| **O `noindex` por cabeçalho no ar** | é a Vercel que aplica o `vercel.json`; localmente não há como. O padrão foi conferido contra a regra que já vale para `/relatorios/*`, e casa com `/painel-de-relatorios` e com as sub-rotas futuras |
| **O guard do refoco de aba na prática** | ele só dispara com sessão viva. Foi copiado do arquivo da SmartBio, onde está em produção há meses |
| **A tela de barrado com um e-mail real** | provada no servidor (seção 5.2) e renderizada sem erro; a volta completa pelo Google não |

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

---

## 7. A próxima coisa a fazer

**Em ordem:**

1. **O Flávio faz os cinco passos da seção 3.** Nada avança antes disso — nem
   dá para saber se o login funciona.
2. **Alguém entra com os dois e-mails e tenta com um terceiro**, e o resultado
   volta para cá.
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
