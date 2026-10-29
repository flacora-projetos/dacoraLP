# Reuniões — abrir no conteúdo da equipe, 29/10/2026

## Problema e autorização

O PO abriu Cria Fértil e Avlon e viu páginas aparentemente vazias. Os dois encontros têm quatro seções internas, mas a abertura inicial estava sempre na visão compartilhada, que está vazia. Isso foi confirmado por leitura do Dácora Reports e pelo código vigente.

Após a explicação de que o próximo passo era corrigir a abertura e depois preparar com briefing/histórico, o PO respondeu **“pode seguir”** em 29/10/2026. GO para correção, testes, publicação e verificação; não autoriza ampliar acesso ou compartilhar dados internos.

## Resultado preparado

- Equipe abre no Roteiro da equipe; convidado abre somente no compartilhado.
- Escolha manual de visão é preservada em renovação de token e atualização periódica. Outro encontro volta ao padrão correspondente à identidade.
- Se o compartilhado estiver vazio, a página explica que a pauta ainda não foi compartilhada; a equipe recebe indicação do roteiro interno.
- Mudança de perfil para convidado força a visão compartilhada mesmo se o componente ainda contiver detalhe anterior em memória. O BFF permanece como autoridade e não foi alterado.
- Nenhuma escrita de conteúdo, convite, reunião, nota, permissão ou banco. Os três encontros importados permanecem intactos.

## Validação

`npm run verifica:reunioes` inclui teste novo em jsdom montando o componente real: abertura da equipe, opção compartilhada, renovação, troca de encontro, rebaixamento de perfil e convidado. O teste só admite GET e usa dados sintéticos. O verificador anterior continua provando PostgreSQL local, isolamento, autoria, repetição e convites. `npm run lint` e `npm run build` completos com prebuild passaram, saída 0.

Playwright MCP com o componente real servido por Vite local e respostas de teste: 1440×1000 e 390×844, sem rolagem horizontal, conteúdo interno na abertura da equipe e ausente no convidado; mensagem explícita para pauta compartilhada vazia. Capturas de teste em `C:\Users\Flávio Corá\.codex\visualizations\2026\10\29\01a18819-8472-7060-a54a-cf4a4a695d8a`, arquivos `portal-abertura-desktop.png` e `portal-abertura-celular.png`. Não são prova de login real ou deploy.

Revisão de segurança pelo executor: modo efetivo derivado do perfil conferido, sem fallback interno para convidado; sem tocar autenticação/BFF, RLS ou resposta pública; texto privado não incorporado em fixture/HTML público. Nenhum editor ou campo compartilhado salva automaticamente.

React instalado pelo lockfile; referência oficial consultada para persistência de estado na mesma montagem: https://react.dev/reference/react/useState. Não foi adicionada dependência.

## Publicação e retorno

Branch `codex/reunioes-abertura-equipe-20261029`, base `5b567eb`. Validado localmente, aguardando publicação neste registro inicial. Conferir commit/deployment/aliases após merge e abrir os encontros reais como equipe em computador/celular. Convidado/isolações locais não equivalem a login novo da Fernanda.

Retorno: reverter somente o diff de apresentação e republicar se houver regressão; nenhuma restauração de banco/notas é necessária. A preparação da agenda/histórico está no OpenClaw, em frente separada, e não é ativada por esse deploy.

## Limpeza

Servidor de smoke local na porta 8774 e arquivo HTML de bancada são temporários; encerrar/remover antes de retirar a worktree. Dependências, builds e cópia descartável saem depois de salvar/integrar, sem seguir junções. Capturas são entregáveis privados; checkout principal e worktrees paralelas ficam preservados.
