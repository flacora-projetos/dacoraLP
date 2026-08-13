# Instruções para Claude Code — SITE DÁCORA LP

Leia [`AGENTS.md`](AGENTS.md) por inteiro antes de qualquer ação; ele é a fonte
de verdade compartilhada com Codex. Em trabalho no painel de relatórios, leia
também `docs/PAINEL_PROGRESSO.md` e o handoff da fábrica que ele aponta.

A prioridade atual é a frente **RA — Revisão Analítica Assistida**, organizada
em `OpenClaw-Dacora/docs/FRENTE_RA_REVISAO_ANALITICA_ASSISTIDA_2026-08-13.md`.
A correção percentual RA2 está pronta, aguardando nova revisão e smoke autenticado/humano em `codex/ra2-caneta-introducao`, limitada à caneta da introdução antes da aprovação. `2,5%`, `2,0%` e `33,3%` agora são aceitos apenas quando derivam do contexto percentual governado; `7,7%` continua recusado. O backend permanece handler Vercel autenticado: relê snapshot com service role, monta `analysis_context_v1` server-side e chama Sonnet direto sem tools; caneta não reutiliza Ozzy, não cria Edge Function e não confia em contexto do navegador. Migration, push, Preview remoto, decisão, envio e publicação seguem fora. A introdução é o alvo principal da caneta mágica; C1/C2/C3 não deve ser
publicada separadamente. Cada fase roda em sessão própria e registra, em tempo
real, implementação, teste, commit, push, merge, publicação e validação em
produção como estados diferentes.

Tokens e contexto são finitos: esta sessão não é dona da frente. Codex, Claude
Code ou GPT customizado podem continuar uma fase compatível, mas só Git, plano,
estado e handoff carregam fatos oficiais. Antes de faltar contexto, interrompa
escopo novo e registre branch, `HEAD`, diff, testes, efeitos e próximo gate.
Saída de executor sem acesso real ao repositório/testes é proposta a revalidar.

## Ferramentas de uso preferencial

- **Context7:** consultar documentação oficial e atual, conferindo a versão
  efetiva em `package.json`/lockfile quando isso afetar a implementação.
- **Serena:** piloto global estritamente somente leitura para navegar por
  símbolos e referências. Não editar, renomear ou refatorar por Serena.
- **Playwright MCP:** smoke autenticado e regressão visual quando a tarefa
  pedir essa prova. O teste deve ser não mutante: não decidir relatório, criar
  intenção de envio, acionar worker ou interagir com destinatário real.
- **Plugin Codex no Claude Code:** segunda opinião/revisão adversarial quando a
  fase pedir, sem substituir testes e gates.
- **DX:** handoff, investigação de CI, revisão deste arquivo e redução de
  contexto, sempre atualizando a fonte canônica.
- **Security Guidance:** revisão de risco em diffs sensíveis, com aviso de que
  o conteúdo pode ser enviado ao provedor configurado.
- **TencentDB-Agent-Memory:** apenas no sandbox já separado; nenhuma integração
  com este repositório ou produção sem novo GO.

Disponibilidade da ferramenta e autorização específica continuam necessárias;
estas orientações não instalam nem configuram nada. Para regras de segurança,
gates e verificação, siga `AGENTS.md`.
