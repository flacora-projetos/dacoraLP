# Reuniões do Portal Dácora — 29/10/2026

## Estado e escopo

Serviço original publicado em 29/10/2026 pelo PR #75, com importação inicial VetSell no Dácora Reports. A preparação original está descrita abaixo. A correção da abertura para a equipe foi publicada pelo PR #76 e conferida com acesso real em computador/celular: [prova](HANDOFF_REUNIOES_ABERTURA_2026-10-29.md). Não implica compartilhar conteúdo interno.
O PO pediu equipe e clientes convidados, começando apenas com
`flacora@gmail.com` e `contato@nandacora.com.br`, com campo para convidar.

- `/reunioes`: biblioteca com busca e criação de reunião pela equipe.
- `/reunioes/:slug`: pauta compartilhada, roteiro interno, perguntas e registros.
- Google autentica; a lista privada `PAINEL_EMAILS_AUTORIZADOS` define a equipe.
  Cada cliente tem convite por reunião, com vencimento e revogação.
- Convidado vê pauta e registros compartilhados; não recebe roteiro interno,
  respostas de apoio, notas internas ou lista de convidados na resposta HTTP.
- Anotações, decisões e próximos passos são inserções individuais, com autor e
  horário fornecidos no servidor. Não há edição concorrente de um bloco único.
  Atualiza a cada 10 segundos enquanto a aba está visível. Rascunhos não são
  salvos automaticamente e não sobrevivem ao fechamento/recarregamento da página.
- Registros da equipe começam como internos; compartilhar exige escolher
  “Equipe e convidados”. O rótulo permanece visível antes do envio.
- “Liberar acesso” autoriza a conta Google; **não manda e-mail**. A equipe copia
  e envia o link por seu canal. O servidor valida o convite em cada operação.
- Nova reunião aceita títulos de etapa com `##`. Nesta primeira entrega o
  roteiro é salvo na criação; atualização posterior do roteiro não tem editor.
  Os participantes acrescentam registros, sem apagar o histórico.

## Limites de segurança e integração

O acesso de reuniões é independente do acesso ao painel de relatórios. O
dispatcher já existente atende `modo=reunioes` por `_reunioes.ts`, com validação
própria Google/convite; os demais modos continuam passando por `conferirAcesso`.
Nenhum convite amplia a lista do painel. Mantidas as 12 funções da Vercel.

Os três objetos `portal_reunioes`, `portal_reunioes_convites` e
`portal_reunioes_notas` são novos. RLS habilitada, sem política pública, sem
privilégios para `anon`/`authenticated`; somente o BFF com a chave de serviço
acessa. Não usar a chave pública como fallback. O conteúdo privado não é
importado pelo frontend nem pré-renderizado. Nova rota usa `app.html`, fora do
sitemap e com `noindex`, `no-store` e `no-referrer`.

A renovação do token não remonta a página. Rascunhos permanecem durante troca
de etapa/aba ou falha temporária de consulta. Uma recusa de acesso remove o
conteúdo antigo. IDs das anotações permitem repetir uma tentativa após falha de
rede sem duplicar e sem trocar o autor/conteúdo de outro registro. Textos são
renderizados como texto React, sem HTML injetado.

## Conteúdo Vetsell preparado

Fonte privada no checkout CRM, preservada fora deste Git e do pacote público:

`C:\Users\Flávio Corá\Documents\PROJETOS PARTICULARES\Dacora - CRM de Campanhas\INSTRUCOES PARA CLIENTES GIT IGNORED\VETSELL\PORTAL_REUNIAO_VETSELL_2026-10-29.json`

Destino previsto: `/reunioes/vetsell-2026-10-29`. O arquivo contém 8 etapas
internas, as 45 perguntas/respostas existentes e 8 pontos compartilhados.
Preserva os limites de operação real ainda não conectada/testada, um único
número oficial, mensagens manuais dos vendedores e ausência de garantia de
desbloqueio. Não incorpora preços da pesquisa paralela. Não importa anotações
do navegador da versão local anterior, que continuam apenas naquele navegador.

## Verificação local

- `npm run verifica:reunioes`: usa PGlite (PostgreSQL em memória) e o dispatcher
  real, com apenas autenticação Google e transporte REST substituídos por
  adaptadores locais. Aplica o SQL real; prova criar/ler, dois autores
  simultâneos, autoria forjada ignorada, repetição sem duplicar, isolamento
  entre reuniões, exclusão de conteúdo interno, vencimento/revogação e bloqueio
  de acesso direto por chave pública. Prova também que convidado não entra no
  painel de relatórios.
- `npm run verifica:painel`, `npm run verifica:refoco`, `npm run verifica:av4`:
  passaram sem chamadas a produção.
- Lint e build completo com prebuild passaram. O aviso antigo de falha RA4 no
  AGENTS não se reproduziu nesta base: `verifica:ra4` passou nesta sessão.
- Navegador com sessões e respostas simuladas, em 1440×1000 e 390×844: biblioteca,
  busca/sem resultado, criação com conteúdo separado, todas as 8 etapas,
  45 respostas e busca, nota persistente após recarregar, falha de gravação
  preservando rascunho, convite/revogação, convidado anotando e conteúdo interno
  ausente. Sem rolagem horizontal do documento. Único aviso é preload da imagem
  da home no servidor Vite local; a casca de produção passou no verificador.
- Importador validou o arquivo Vetsell com 8/45/8, sem gravar remotamente.

Evidências visuais preservadas na pasta privada CRM
`VETSELL/reuniao-local/portal-desktop.png` e `portal-celular.png`. São prévias
locais, não prova de autenticação Google ou colaboração em produção.

## Publicação após GO explícito do PO

1. Recriar worktree a partir de `codex/reunioes-20261029`, conferir remoto e
   mudanças paralelas. Instalar com `npm ci`; rodar verificadores exigidos.
2. Confirmar que o projeto é **Dácora Reports** (`xdvnybvflhmhescjjxip`), não
   SmartBio nem CRM. Conferir tabelas, auth e config atual antes de aplicar SQL.
3. Com GO para banco/publicação, aplicar
   `supabase/migrations/20261029131920_portal_reunioes.sql`. Conferir grants/RLS
   e leitura/gravação por serviço; anon e authenticated devem continuar sem acesso.
4. Confirmar a lista privada de equipe com os dois e-mails autorizados. Não
   cadastrar clientes nessa lista: usar os convites por reunião.
5. Conferir retorno OAuth para domínio real em `/reunioes` e nos deep-links.
   A autorização do callback da rota nova ainda não foi verificada remotamente.
6. Push/PR/merge/publicação somente com GO, mantendo as outras frentes intactas.
   Anexar PR ao chat após criá-lo. Confirmar deployment e domínio reais.
7. Obter UUID real do autor autorizado e importar o JSON privado, sem expor
   credenciais. Importador não sobrescreve slug existente:

   `node --env-file=<env privado> --import tsx scripts/carrega-reuniao.mts <conteudo.json> <UUID autor>`

   Sem `--aplicar` só valida; com `--aplicar`, insere e relê ambos os conteúdos.
8. Validar login real dos dois membros, anotações entre duas sessões e acesso
   de convidado em cenário autorizado. Não criar contatos ou eventos Meta
   fictícios. Não enviar mensagens/convites por e-mail automaticamente.

## Limpeza e continuidade

Builds, dependências descartáveis, script de smoke com conteúdo copiado e cache
temporário da CLI pertencem a esta tarefa e devem ser removidos no encerramento.
Guardar código no commit da branch, conteúdo/evidências na pasta privada CRM.
Nenhuma credencial foi copiada para o worktree. O servidor original da reunião
local, porta 8769/PID 22676, permanece por decisão anterior para uso da reunião;
não depende do worktree do Portal. O servidor 8772 foi usado apenas para smoke
e deve ser encerrado antes de remover o worktree.

Referências verificadas para a implementação: [API protegida](https://supabase.com/docs/guides/api/securing-your-api),
[validação de usuário](https://supabase.com/docs/reference/javascript/auth-getuser)
e [changelog](https://supabase.com/changelog.md). Usado Supabase JS do lockfile;
nenhuma mudança de SDK em produção.

## Remodelação visual ousada — 17/11/2026 (branch local, não publicada)

Pedido do PO pela skill maestro, nível ousado, depois de duas prévias (a segunda sem cursiva). Branch `feat/reunioes-visual-ousado`, só local: sem push, sem PR e sem publicação até o GO do PO.

- Tipografia da referência da skill: Inter Tight para texto, títulos e números; DM Mono só em rótulos. Sem serifada e sem itálico; destaque por peso e cor (PO, 17/11). Cores e grão da home nova.
- Lista: herói escuro com a próxima conversa (hoje, amanhã, em N dias) e a fita da semana (segunda a sábado), cada reunião um ponto no seu dia, ligado ao cartão. Lista dividida em próximas e já aconteceram.
- Reunião: cabeçalho escuro com escopo e abas; abas e etapas entram com transição curta. Emojis de cadeado e pessoas trocados por texto ("só equipe", "Compartilhado").
- Nada mudou em acesso, convite, anotação, transcrição ou API. A aba Visão geral ainda não existe no código: depende da aprovação da proposta de conteúdo.
- Verificado: `verifica:reunioes` (com o teste da aba de transcrição ajustado ao nome sem emoji e provado por mutação), lint e build do Vite; bancada local com dados fictícios em computador e 375 px, sem rolagem lateral. Sem login real e sem produção.

## Visão geral pós-reunião — 17/11/2026 (mesma branch, não publicada)

Aprovada pelo PO ("Aprovo, pode construir"). Aba "Visão geral" só da equipe, no roteiro interno; abre nela quando existe. Tabelas novas `portal_reunioes_visoes` (uma por reunião, sem update) e `portal_reunioes_visao_correcoes` (inserção individual, autor do servidor), migração `20261117190000_portal_reunioes_visoes.sql`, ainda **não aplicada**. Ações `visao` e `corrigir_visao` em `_reunioes.ts`, só equipe; convidado nem recebe `tem_visao`. Contrato e correções em `src/reunioes/visao.ts`, espelhados na Dácora (`OpenClaw-Dacora/src/lib/cerebro/reunioes-visao.js`), que confere os itens antes de gravar. Handoff completo, provas e ordem de publicação: `OpenClaw-Dacora/docs/HANDOFF_REUNIOES_VISAO_GERAL_2026-11-17.md`.
