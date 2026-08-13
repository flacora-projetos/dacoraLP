# Instruções para agentes — SITE DÁCORA LP

Leia este arquivo por inteiro antes de atuar no repositório. Para qualquer
trabalho no painel de relatórios, leia também `docs/PAINEL_PROGRESSO.md` e o
plano/handoff canônico indicado nele no repositório `OpenClaw-Dacora`.

## Prioridade ativa — frente RA

A frente **RA — Revisão Analítica Assistida dos Relatórios Mensais** é a
prioridade de desenvolvimento do painel. Sua fonte organizacional é
`OpenClaw-Dacora/docs/FRENTE_RA_REVISAO_ANALITICA_ASSISTIDA_2026-08-13.md`.
A **RA2 está em nova correção de produto após o terceiro bloqueio real**. O parser deixou de ser o problema; a saída do Sonnet passou a morrer na regex que exigia correspondência literal de cada número. Decisão do Flávio: o modelo deve ler o que o relatório já escreveu e propor a melhor introdução; a comparação lado a lado e a revisão humana são o gate. A branch agora remove o veto numérico tanto da geração quanto da edição e amplia o pacote server-side com destaques, atenção, próximos passos, seções, tabelas, evolução mensal, quebras e séries. Assets/paths continuam fora; auth, checksum e auditoria permanecem. `verifica:analise`, `verifica:revisao` e build completo passaram; ainda não publicado neste marco. Sem decisão ou envio. A introdução do relatório é o primeiro e mais importante alvo da caneta mágica;
C1/C2/C3 são insumo subordinado, não uma publicação independente. Cada fase RA
deve acontecer em sessão própria, na branch/worktree indicada pelo documento.

A RA não pertence a esta conversa nem a um modelo. Codex, Claude Code ou um
GPT customizado podem assumir uma fase compatível, mas Git, plano, estado e
handoff são a continuidade oficial. Executor sem acesso real ao checkout e aos
testes entrega proposta a revalidar. Antes de faltar contexto, pare a expansão
e registre branch, `HEAD`, diff, testes, efeitos externos e próximo gate.

Toda mudança de estado deve ser documentada na mesma sessão: implementação,
teste, commit, push, merge, publicação e validação em produção são eventos
distintos e não podem ser inferidos uns dos outros.

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
