# Prompt para a próxima sessão — Data Hub Portal

Continue a frente **Data Hub no portal Dácora** a partir do estado de produção de 2026-08-26.

## Antes de agir

1. Carregue o runtime atual do Codex Ninja (`getCodexNinjaRuntime`, `include=all`).
2. Selecione o workspace `@projects/SITE DACORA LP/repo`.
3. Leia por inteiro `AGENTS.md` e `CLAUDE.md` e leia a seção mais recente de Data Hub em `docs/PAINEL_PROGRESSO.md`.
4. Rode `git fetch origin --prune`, confirme branch/HEAD/status e preserve qualquer trabalho preexistente.
5. Não desenvolva diretamente em `main`; se houver mudança de código/docs, crie branch temática a partir de `origin/main` sincronizada.

## Estado confirmado ao encerrar a sessão anterior

- `main == origin/main` no commit funcional `e158438646a008e83b94fcb24c6c693cbb42482a` (`feat: align Data Hub portal with selected fields`), antes do commit documental de handoff desta sessão.
- O portal foi publicado na Vercel; deployment funcional confirmado: `dpl_7JVd4pcC61vBLefL1N8KjYiZuf1W`, estado `Ready`.
- `/data-hub` respondeu HTTP 200 em produção com `private, no-store`, `noindex` e `no-referrer`.
- `/api/data-hub/catalog` sem sessão respondeu HTTP 401 `sem_sessao`; o gate privado está preservado.
- A UX foi revisada com `frontend-design`, `impeccable-design-polish`, `web-design-guidelines` e `vercel-react-best-practices`.
- O criador não possui mais seletor manual de nível. O grão é deduzido pelos campos selecionados.
- Novas definições usam `selectedFields`; o salvamento remove `entityLevel`, `fields`, `creativeFields` e `breakdowns` do payload novo.
- A leitura/edição continua compatível com definições legadas.
- `npm run verifica:data-hub-casca` passou; `git diff --check` passou; lint/typecheck passou com `NODE_OPTIONS=--max-old-space-size=8192`; secret scan do diff não encontrou segredo óbvio.

## Próximo objetivo

Validar o **fluxo autenticado real do Data Hub** no portal, começando por operações read-only:

1. confirmar catálogo real e contas disponíveis;
2. confirmar listagem de extrações e formato retornado (`selectedFields` versus legado);
3. revisar no navegador autenticado desktop e viewport móvel o criador/edição, sem executar extração nem produzir saída real;
4. verificar que combinações inválidas, mensagens de erro, grão deduzido e resumo permanecem coerentes com o catálogo real;
5. somente depois decidir o próximo passo de mutação.

## Gates

- Não execute extração real, não escreva em Google Sheets/destino, não altere conta/campanha e não produza outro efeito externo sem GO explícito do PO.
- Merge em `main`, push que dispare deploy e nova publicação também exigem GO explícito.
- Smoke autenticado deve ser não mutante até novo GO.
- Não invente contas, IDs, catálogo, payloads ou resultados. Diferencie CONFIRMADO / INFERIDO / NÃO VERIFICADO.

## Arquivos centrais

- `src/pages/DataHub.tsx`
- `src/pages/data-hub-extracoes.tsx`
- `src/pages/data-hub-catalogo.ts`
- `src/pages/data-hub.css`
- `scripts/verifica-painel-data-hub-casca.mts`
- `docs/PAINEL_PROGRESSO.md`

Siga o fluxo ENTENDER → LOCALIZAR → LER → EXECUTAR → TESTAR → VALIDAR → ENTREGAR. Se encontrar divergência entre este prompt e Git/produção, Git + respostas reais + documentação canônica prevalecem; atualize o handoff antes de encerrar.
