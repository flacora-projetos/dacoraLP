# Instruções para Claude Code — SITE DÁCORA LP

Leia [`AGENTS.md`](AGENTS.md) por inteiro antes de qualquer ação; ele é a fonte
de verdade compartilhada com Codex. Em trabalho no painel de relatórios, leia
também `docs/PAINEL_PROGRESSO.md` e o handoff da fábrica que ele aponta.

A prioridade atual é a frente **RA — Revisão Analítica Assistida**, organizada
em `OpenClaw-Dacora/docs/FRENTE_RA_REVISAO_ANALITICA_ASSISTIDA_2026-08-13.md`.
RA1–RA3 estão concluídas e publicadas; o refino RA3 de contexto/provider está em produção. **A primeira fatia da RA4 está em produção no `main/6b39e6c` desde 2026-08-14.** Ela calcula prontidão editorial no servidor e bloqueia aprovação com análises obrigatórias pendentes. Aprovar não envia; após o GO, o modal oferece **Enviar agora** ou **Voltar para a fila**. Na fila, junto de `aprovado por…`, ficam **Voltar para edição** e **Enviar**. A migration RA4 de reabertura está aplicada no Supabase; reabrir preserva versão/checksum, audita a aprovação removida e só é permitido antes de qualquer intenção P5; enviado permanece imutável. Produção: Vercel `success`, painel 200 e APIs privadas decisão/envio/reabertura 401 sem sessão. **Decisão de produto de 2026-08-18: a frente AV — Análise Viva e Fechamento Editorial é pré-requisito obrigatório da RA5.** Dados do mês continuam vivos; análise humana vale para o snapshot factual em que foi escrita; fato novo exige revisão e preserva a versão anterior como histórico interno; o cliente recebe no fechamento somente dados finais + análise final aprovada. **RA5 está não iniciada e bloqueada até AV1–AV4; áudio continua congelado até segunda ordem. AV1 está implementada e validada localmente no OpenClaw, mas a migration `0015` ainda NÃO foi aplicada no Supabase remoto e exige GO explícito; o runtime do painel ainda não mudou.** Fonte canônica: `OpenClaw-Dacora/docs/HANDOFF_RESULTADO_CAMPANHAS_RELATORIOS_2026-08-18.md` e `OpenClaw-Dacora/docs/HANDOFF_AV1_ANALISE_VIVA_2026-08-18.md`. A introdução continua sendo o alvo principal da caneta mágica; C1/C2/C3 não deve ser
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
