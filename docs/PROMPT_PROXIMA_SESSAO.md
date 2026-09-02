# Prompt para a próxima sessão — Data Hub Portal

Continue a frente **Data Hub no portal Dácora** a partir do estado de produção de 2026-08-26.

## Antes de agir

1. Carregue o runtime atual do Codex Ninja (`getCodexNinjaRuntime`, `include=all`).
2. Selecione o workspace `@projects/SITE DACORA LP/repo`.
3. Leia por inteiro `AGENTS.md` e `CLAUDE.md` e leia `docs/DATA_HUB_ESTADO_ATUAL.md`. Para Data Hub, esse arquivo é a continuidade canônica; não use o histórico de outras aplicações do portal para inferir estado.
4. Rode `git fetch origin --prune`, confirme branch/HEAD/status e preserve qualquer trabalho preexistente.
5. Não desenvolva diretamente em `main`; se houver mudança de código/docs, crie branch temática a partir de `origin/main` sincronizada.

## Estado confirmado ao encerrar a sessão anterior

- A `main` contém o commit funcional histórico `e158438 feat: align Data Hub portal with selected fields` e o portal publicado já usa `selectedFields`.
- A correção mais recente está localmente em `fix/data-hub-field-contracts`; confirme commit/working tree antes de continuar.
- O criador não possui seletor manual de nível. O grão é consequência dos campos selecionados.
- A prova de contratos de 2026-09-02 encontrou e corrigiu localmente a influência do `nivel` legado oculto e a perda de grão ao migrar definições legadas.
- Definições legadas passam a materializar o campo de identidade do grão antes de serem salvas como `selectedFields`.
- `npm run verifica:data-hub-casca`: OK; `npm run verifica:data-hub-spike`: OK; `npx tsc --noEmit` com heap 8192 MB: exit 0; `git diff --check`: exit 0.
- O backend em produção ainda está em `dacora-data-hub-00038-top`/`runtime:a8fbe2c`, anterior ao suporte a `selectedFields`. Produção está desalinhada ponta a ponta.
- O norte de produto é a expansão progressiva rumo às **611 capacidades úteis** do benchmark Stract, com grão/granularidade/compatibilidades; o portal não deve reduzir artificialmente esse catálogo.

## Próximo objetivo

1. Confirmar que as branches de correção de portal e backend estão integradas antes de qualquer smoke de contrato novo.
2. Alinhar as versões publicadas seguindo os gates de merge/push/deploy.
3. Validar o fluxo autenticado real do Data Hub, primeiro catálogo/listagem e depois uma extração field-centric controlada quando houver GO para efeito externo.
4. Manter a UI derivada do catálogo canônico do Hub à medida que a cobertura cresce rumo às 611 capacidades; não criar uma segunda fonte manual de regras no frontend.
5. Revisar desktop/móvel e mensagens de incompatibilidade a cada lote de expansão.

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
