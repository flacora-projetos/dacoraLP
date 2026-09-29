# Instruções para agentes — SITE DÁCORA LP

Leia este arquivo por inteiro antes de atuar no repositório. Para qualquer
trabalho no painel de relatórios, leia também `docs/PAINEL_PROGRESSO.md` e o
plano/handoff canônico indicado nele no repositório `OpenClaw-Dacora`.

**Para qualquer trabalho em `/data-hub`, BFF Data Hub, seletor/catálogo de campos ou documentação dessa frente, leia obrigatoriamente `docs/DATA_HUB_DIRETRIZ_QUERY_FIRST.md` e `docs/DATA_HUB_ESTADO_ATUAL.md`.** Desde 07/09/2026, o motor schema-first/wide é legado para expansão; não reintroduza cobertura por coluna/migration/view nem trate 51/4/621 como backlog de UI.

## Prioridade ativa — frente RA

A frente **RA — Revisão Analítica Assistida dos Relatórios Mensais** é a
prioridade de desenvolvimento do painel. Sua fonte organizacional é
`OpenClaw-Dacora/docs/FRENTE_RA_REVISAO_ANALITICA_ASSISTIDA_2026-08-13.md`.
**RA1–RA5 estão publicadas; RA4 permanece parcial.** O acabamento do circuito
de recusa está em branch, ainda sem migration/publicação: fila e revisão passam
a explicar aguardando, processamento, falha e a nova versão que volta para
revisão humana, sem aprovação, fechamento ou envio automático. RA5 está em
`main/2a7dc4e`: página pública/PDF, aprovação e envio exigem o mesmo recibo AV4
exato. Vercel `success`; smoke autenticado desktop/celular passou sem mutação.
O primeiro fechamento humano real e o smoke positivo do link/PDF são o gate
operacional restante porque ainda não há relatório com recibo AV4 publicável;
depois de integrar fábrica, migration e portal vem RA6. Áudio continua
congelado até novo GO. A introdução segue como alvo principal; C1/C2/C3 são
insumo, não publicação independente. Cada fase RA deve acontecer em sessão
própria, na branch/worktree indicada pelo documento.

A RA não pertence a esta conversa nem a um modelo. Codex, Claude Code ou um
GPT customizado podem assumir uma fase compatível, mas Git, plano, estado e
handoff são a continuidade oficial. Executor sem acesso real ao checkout e aos
testes entrega proposta a revalidar. Antes de faltar contexto, pare a expansão
e registre branch, `HEAD`, diff, testes, efeitos externos e próximo gate.

Toda mudança de estado deve ser documentada na mesma sessão: implementação,
teste, commit, push, merge, publicação e validação em produção são eventos
distintos e não podem ser inferidos uns dos outros.

## Ajuste ativo — Instagram unificado dos mensais

Em 03/09/2026, a branch `codex/mensal-instagram-unificado-2026-09-03`
implementou o contrato em que o B1 **“O perfil do Instagram no mês”** pode
renderizar também o funil pago logo abaixo da faixa. A fonte da revisão
analítica recebe os dois recortes; `analise-instagram` deixa de ser uma seção
separada na montagem nova da fábrica. Smoke local não mutante passou em
1440×900 e 390×844, com uma seção e sem rolagem horizontal; `verifica:funil`,
`verifica:revisao`, lint e build completo também passaram. **Não está
publicado:** `main`, Vercel, Supabase, decisões editoriais e envios permanecem
intactos. Handoff canônico na fábrica:
`OpenClaw-Dacora/docs/HANDOFF_MENSAL_INSTAGRAM_E_DESTINOS_2026-09-03.md`.

## Escopo e segurança

- Preserve alterações de outras frentes e trabalhe em branch própria; não faça
  commit direto em `main`, push, publicação, alteração no Supabase ou envio de
  mensagem sem autorização explícita do PO.
- Decisão, recusa, criação de intenção de envio, worker e migrações do painel
  são fluxos governados. Não os acione, altere ou simule contra produção fora
  de uma autorização específica.
- Não deduza estado de relatório, destinatário, entrega ou dado ausente. Use as
  fontes e read-backs documentados no handoff vigente.

## Ferramentas homologadas em piloto

Estas referências não autorizam instalação, configuração nem execução por si
só. Antes de usá-las, confirme que a integração está disponível no ambiente e
aplique a regra de autorização da tarefa.

### Context7 — documentação atual

Use para consultar documentação oficial e versionada de dependências, APIs e
frameworks antes de implementar ou revisar mudanças. Registre a versão efetiva
presente em `package.json`/lockfile quando ela for relevante; Context7 não
substitui os contratos e convenções já definidos neste repositório.

### Serena — navegação semântica, piloto somente leitura

Serena está autorizado globalmente apenas para localizar símbolos, dependências
e referências. Não use capacidades de edição, renomeação, refactor ou escrita
automática até uma autorização posterior do PO. Confirme o escopo de acesso
antes de abrir arquivos sensíveis.

### Playwright MCP — smoke e regressão visual

Quando uma tarefa exigir prova reproduzível, use Playwright MCP para smoke
autenticado e regressão visual do painel e das rotas de relatório. Testes devem
ser não mutantes: não aprovar/recusar relatórios, não criar intenção de envio,
não acionar workers e não usar destinatários reais. Qualquer fluxo autenticado
ou acesso a produção continua sujeito ao gate específico do handoff.

### Revisão, continuidade e segurança

- **Plugin Codex no Claude Code:** segunda opinião e revisão adversarial quando
  solicitado pela fase; não substitui teste nem autorização.
- **DX:** usar os atalhos de handoff, investigação de CI, revisão de
  `CLAUDE.md` e redução de contexto quando disponíveis, preservando as fontes
  canônicas do projeto.
- **Security Guidance:** revisar o diff quando a fase tocar autenticação,
  autorização, conteúdo gerado ou rotas; registrar que o código pode ser
  enviado ao provedor configurado antes de usar a revisão por IA.
- **TencentDB-Agent-Memory:** somente avaliação no sandbox separado. É proibido
  configurar, iniciar ou integrar ao painel, OpenClaw ou produção sem novo GO.

## Verificação

Rode apenas os scripts pertinentes da raiz (`npm run verifica:*`, `npm run
build` ou `npm run lint`) e relate comandos, resultado e limitações. Não
declare validação visual, autenticada ou em produção sem evidência obtida na
rodada atual.

⚠️ **`npm run verifica:ra4` falha hoje, e a falha é PRÉ-EXISTENTE** (`recusa não
depende de análises prontas`: 502 onde espera 200). Ela vem do caminho da
recusa e pertence às branches `feat/recusa-causas-fabrica` /
`feat/recusa-causas-portal`. Conferido em 01/09/2026 contra a `main` anterior à
sessão: falha idêntico. **Não atribua essa falha à sua rodada nem tente
"consertá-la" de passagem.**

**`npm run verifica:cliente-enxuto`** (no `prebuild` desde 01/09/2026) fixa o
contrato do documento do cliente: as duas seções suspensas, a presença do dado
no snapshot, a numeração sem buraco e o botão de PDF — que existe só no link
do cliente e baixa o arquivo do servidor (ver "PDF do relatório mensal" abaixo).

## PDF do relatório mensal — UM gerador só (29/09/2026)

**O PDF nasce num lugar só: `api/relatorio-pdf.ts`**, que monta
`src/reports/pdf/RelatorioPdf.tsx` no servidor (fontes e logos embutidos em
`recursos-embutidos.ts`, miniaturas baixadas antes, duas passadas para o
sumário da capa). O botão "Exportar PDF" do link **baixa** esse arquivo, e a
rotina do Drive da fábrica (`OpenClaw-Dacora/src/lib/relatorio-pdf.js`)
**baixa o mesmo**. Decisão do PO: *"não era pra ter dois geradores de PDF"*.

- ⚠️ **Não volte a gerar PDF no navegador, nem a oferecer `window.print()`
  como PDF, nem a imprimir a página com o Chrome.** Os dois caminhos antigos
  (react-pdf no navegador desde 08/09 e impressão do Chrome no Drive desde
  21/09) foram removidos por produzirem dois documentos diferentes do mesmo
  relatório. Melhoria de layout do PDF mexe em `RelatorioPdf.tsx` e vale para
  o botão e para o Drive ao mesmo tempo. O `@media print` de `report.css`
  continua existindo só para quem apertar Ctrl+P na tela — não é produto.
- **Marca pela carteira** (`src/reports/marcas.ts`): `identidade.carteira ===
  'ALLGROTECH'` sai com logo e cores da Allgrotech, na página e no PDF;
  o resto é Dácora. Decisão do PO de 29/09/2026, que substituiu o "só Dácora"
  de 04/08. Nunca decida marca pelo nome do cliente.
- **Três armadilhas do motor `@react-pdf` medidas em 29/09**, travadas por
  `verifica:pdf-dedicado`: (1) `minHeight` em peça que o motor move de folha
  explode para milhões de pontos; (2) `lineHeight` na folha ou em peça `fixed`
  é remultiplicada a cada folha; (3) texto dentro de `<Svg>` corrompe a
  medição do que vem depois, e cabeçalho de tabela `fixed` falha — tabela
  longa é cortada em blocos com o próprio cabeçalho. Seção = título grampeado
  ao primeiro pedaço do conteúdo (`wrap={false}`), nunca `minPresenceAhead`.
- **Imports relativos com `.js`** em toda a cadeia de `api/relatorio-pdf.ts`
  (a Vercel compila arquivo por arquivo).
- Conferência visual: `npm run pdf:prototipos` gera os PDFs das fixtures em
  `output/pdf/` pelo mesmo caminho do servidor.

⚠️ **Ao conferir algo publicado, olhe o artefato que o NAVEGADOR aplica.** As
rotas de relatório são montadas no cliente: `curl` na página devolve só a casca,
e nem o bundle `index-*.js` nem o `index-*.css` contêm o relatório — ele vive em
chunk separado. Três falsos negativos saíram disso em 01/09/2026.
