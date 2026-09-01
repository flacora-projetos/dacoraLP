# Painel de aprovação de relatórios — onde a obra parou

**Rota:** `/painel-de-relatorios`
**Fases concluídas e publicadas:** P0 (fundação e login) · **P1 inteira —
carregador, fila e correção do refoco de janela** (seções 9, 11 e 11.7) ·
**P2 concluída e validada — relatório dentro da bancada, faixa responsiva e
smoke autenticado aprovados pelo Flávio em desktop e celular** ·
**D1/D2 — visão geral da operação, integrada e publicada em 2026-08-10** ·
**P3 — aprovar e recusar, integrada e publicada em 2026-08-11** (seção 13) ·
**P4 — ordens de correção e worker controlado, integrada e publicada** ·
**P5B — intenção segura de envio, integrada e publicada** (seção 15).
**Produção:** P0/P1 já estavam publicadas; a P2 foi integrada na `main` pelo
merge `335a2f5`, enviada ao GitHub e verificada em produção. Rota:
<https://www.dacora.com.br/painel-de-relatorios>.
O redesign compartilhado **Editorial de Performance** também foi aprovado pelo
Flávio e publicado; o checkpoint do código levado à produção é `61e27c8`.
**Prioridade vigente desde 2026-08-13:** a validação nominal da Fernanda fica
depois da frente **RA — Revisão Analítica Assistida dos Relatórios Mensais**,
organizada em
`OpenClaw-Dacora/docs/FRENTE_RA_REVISAO_ANALITICA_ASSISTIDA_2026-08-13.md`.
A introdução é o primeiro e mais importante alvo da caneta mágica.

> **Correção de 2026-08-16 — a limpeza C1/C2/C3 JÁ ESTÁ NA `main`, e este
> parágrafo dizia o contrário.** Ele afirmava que ela "continua sem publicação"
> e "não deve ser integrada nem publicada isoladamente". Conferido por dois
> métodos independentes: `d64d727`, `c115042` e `7cf92a2` são alcançáveis a
> partir de `main` (`git branch --contains` e `git merge-base --is-ancestor`),
> e a branch tinha **zero** commits fora dela. Como a `main` publica sozinha na
> Vercel, a limpeza está em produção. **Não republicar, não "retomar" — ela
> continua sendo insumo da RA, mas como trabalho FEITO.** A branch foi apagada
> na faxina de 16/08; o conteúdo permanece na `main`.
**RA1 concluída; RA2 publicada em produção, com correção do parser em branch, em 2026-08-13:** o fallback
abre com fatos atuais e a seleção do principal é independente da ordem. A rota
local de desenvolvimento `/painel-de-relatorios/revisao-local-ra1` consome
somente a fixture governada da Karyne, sem contexto ou variações injetados, não
consulta Supabase e não entra no build de produção. Regressão de revisão e build
passaram; o navegador local falhou ao iniciar, então não há alegação de smoke.
O estado é **RA2 concluída em produção; RA3 com migration e Preview concluídos, smoke autenticado bloqueado**. RA3 usa `codex/ra3-analises-secao`, base `7e9bc67`, e mantém a `main` intacta. Migration `20260813225317` foi conferida; commit `97505f1` está pushado e Preview `dpl_GwAPnqWzPv8JE6pE5WKkoW5vgqby` `READY`. B1–B6 têm função analítica compartilhada; B7/B8/AUDIO, indisponível e dado ausente não ganham caneta. O Supabase Auth devolve o OAuth ao Site URL de produção em vez do hostname de Preview; transportar sessão foi bloqueado e não contornado. Zero contexto/sugestão/evento RA3, decisão ou envio. ⚠️ **O trecho acima descreve 13/08 e ficou congelado ali — "RA3 continua aberta" e "mantém a `main` intacta" deixaram de ser verdade e foram corrigidos em 2026-08-16.** `codex/ra3-analises-secao` (`afba341`) está integrada na `main`, com zero commits fora dela, e a RA1–RA3 está publicada. O bloqueio do smoke autenticado em hostname de Preview era daquela rodada, não é pendência corrente.
**Provider e UX da RA atualizados em produção em `main/992fa56` (2026-08-13):** a revisão mantém a cadeia **DeepSeek V4 Flash → V4 Pro → Claude Sonnet** e modos explícitos auditáveis. O teste humano com Dr. Lucas revelou dois problemas distintos: V4 Pro lento e Contexto do mês ausente na introdução. A inspeção provou que as seções já reliam o contexto persistido server-side, mas **Melhorar análise** não consultava `relatorio_contextos_mes`; agora a introdução relê o mesmo contexto antes de cada geração, independentemente do modelo escolhido. DeepSeek editorial usa `thinking.type=disabled` para evitar raciocínio profundo desnecessário nessa redação; o teto amplo de tokens permanece e não há limite de caracteres. Prompts pedem dois ou três achados na introdução e uma ou duas frases úteis por seção; a UI formata cadeias legadas por ponto e vírgula sem alterar o texto persistido. Contexto salvo tem estado de leitura + **Editar contexto**, Cancelar e novo Salvar. `verifica:analise`, `verifica:revisao` e build passaram novamente após integração em `main`; smoke local respondeu 200; produção respondeu 200 no painel, 401 na API sem sessão e passou a servir o bundle `index-DcWibYQd.js` deste build. Lint mantém somente as seis falhas TypeScript herdadas. Segurança foi revisada manualmente porque Security Guidance segue indisponível. Contrato e evidência ficam em [`HANDOFF_PROVIDER_DEEPSEEK_ANALISES_MENSAIS_2026-08-13.md`](HANDOFF_PROVIDER_DEEPSEEK_ANALISES_MENSAIS_2026-08-13.md).
**AV2 Portal — integrada e publicada em produção em 2026-08-18 (`main/003255f`):** `feat/av2-portal-prontidao-aviso` religou a prontidão editorial ao modelo AV por identidade lógica (`cliente_slug + competencia + versao`), mantendo o legado para competências que ainda não passaram pela ponte. `revisao_necessaria` e divergência de checksum factual vencem sempre, inclusive no endpoint de aprovação; falha de leitura do modelo AV continua fail-closed. Aplicar/editar/dispensar registram também `registrar_revisao_editorial_atual`, e **Contexto do mês** registra também `salvar_contexto_editorial_relatorio` quando existe impressão digital factual; relatórios legados continuam operando pelo caminho antigo. A bancada avisa que a análise vale até a próxima atualização e usa `fontes[].coletadoEm` do snapshot corrente, nunca o relógio do navegador. Antes do push passaram `verifica:av2`, `verifica:ra4`, `verifica:analise`, `verifica:decisao`, `verifica:revisao`, `verifica:publico`, `git diff --check` e build; na `main`, `verifica:av2`, `verifica:revisao`, `verifica:publico` e build passaram novamente. O `lint` continua somente com os seis erros TypeScript herdados já registrados, sem erro AV2. Smoke visual local não mutante passou em 1440×900 e 390×844, com aviso/carimbo e zero overflow; depois do deploy, **smoke autenticado real em produção** abriu Hannover Fondue · agosto/2026 e repetiu aviso/carimbo e zero overflow nos dois tamanhos, sem acionar decisão, recusa, contexto, geração ou envio. O domínio passou a servir o bundle do build `index-BFo4hOZP.js` após o push. Nenhuma decisão real ou envio foi acionado.

**AV3 — histórico interno das análises, publicada em produção em 2026-08-18 (`main/9cfcc26`):** `/api/painel-historico-analises` é protegido por sessão + allow-list e resolve no servidor `cliente_slug + competencia + versao` a partir do relatório aberto. A faixa da revisão ganhou uma timeline `<details>` recolhida por padrão, agrupada por seção/introdução, mostrando estado, revisor, horário da revisão, checksum factual, coleta de referência e texto/decisão `sem_analise`. Falha da timeline não bloqueia relatório nem decisão. A migration `0017_av3_historico_coleta_referencia.sql` foi aplicada no Dácora Reports como `20260818195923 / av3_historico_coleta_referencia`; read-back confirmou `coletado_em_referencia timestamptz`, trigger de imutabilidade, RPC `security invoker`, `service_role/postgres` com execute e `anon/authenticated/public` sem execute, além de ausência de `SELECT` para `anon/authenticated`. Vercel concluiu o deploy com sucesso; o domínio serve o chunk `PainelRelatorios-BvvhrKyv.js`, que contém a chamada AV3. Smoke externo sem mutação confirmou painel 200, API AV3 401 JSON sem sessão e relatório público real 200 sem `historico`, `relatorio_revisoes_editoriais` ou `coletado_em_referencia`. O smoke visual autenticado não foi repetido nesta sessão porque não havia storage-state governado nem Chrome em modo de depuração; não houve contorno por cópia de perfil pessoal. `verifica:av3`, regressões AV2/análise/revisão/decisão/envio/público e build passaram; lint permanece apenas com os seis erros TypeScript herdados. Handoff canônico: `OpenClaw-Dacora/docs/HANDOFF_AV3_HISTORICO_INTERNO_2026-08-18.md`.

**AV4 — fechamento editorial e retenção, BANCO E PORTAL EM PRODUÇÃO em 2026-08-18 (`main/5b6a4a7`):** a aprovação final do painel chama `aprovar_e_fechar_relatorio_editorial`, ligando na mesma transação o checksum do documento, o checksum factual final e o GO humano. O eco informa antes da gravação que a ação é terminal, que o histórico interno nasce arquivado e que envio continua separado. A retenção usa a função privada já existente `/api/painel-historico-analises` com `modo=retencao`; descarte é ação separada, exige `DESCARTAR HISTORICO`, usa o ator da sessão e só declara sucesso após read-back. A faixa interna mostra retenção apenas em versão fechada/liberada ou enviada. O P5 traduz e mantém fail-closed `fechamento_editorial_pendente`. **No Dácora Reports (`xdvnybvflhmhescjjxip`) estão aplicadas `20260818213500_av4_fechamento_editorial_retencao` e `20260818214500_av4_hardening_acl_trigger_envio`, com read-back remoto concluído.** O primeiro deploy do portal (`ddda47e`) falhou antes de promoção porque a 13ª rota pública excedeu o teto de funções do plano; produção anterior permaneceu intacta. O hotfix `5b6a4a7` absorveu a retenção na função AV3 existente, restaurou 12 funções públicas e acrescentou regressão que fixa esse teto. `verifica:av4`, AV3, decisão, envio e build completo passaram; Vercel marcou o deployment `33qewHeunQhceFfGxZcm3igE4TPK` como `success`. Smoke externo não mutante confirmou raiz 200 e `GET /api/painel-historico-analises?modo=retencao&id=<uuid>` 401 `sem_sessao`, comprovando publicação e porta fechada. Nenhuma aprovação, descarte ou envio real foi executado. A validação humana controlada de um fechamento real permanece como próximo gate operacional, não como pendência de deploy. Handoff canônico: `OpenClaw-Dacora/docs/HANDOFF_AV4_FECHAMENTO_EDITORIAL_2026-08-18.md`.

**RA5 — recibo na página pública/PDF, EM PRODUÇÃO em 2026-08-20 (`main/2a7dc4e`):** a rota pública exige o recibo AV4 exato antes de devolver o snapshot que a mesma página imprime em PDF: identidade, checksum do documento, checksum factual e checksum aprovado precisam coincidir. Ausência ou divergência devolve indisponível; token, recibo e histórico interno não entram no JSON público. Vercel `success`; raiz/painel 200; credencial inválida 404 com `no-store`/`no-referrer`; smoke autenticado desktop + 390×844 passou sem mutação. O Playwright isolado não conseguiu reutilizar sessão governada, então a prova autenticada usou a janela Chrome aberta pelo PO. A leitura remota encontrou zero relatórios liberados com recibo AV4 publicável: o primeiro fechamento humano real e o smoke positivo do link/PDF são o gate operacional restante, sem fabricar aprovação. Handoff: `docs/HANDOFF_RA5_RECIBO_PUBLICO_PDF_2026-08-20.md`.

**Acabamento operacional RA4.2:** a fila não usa mais diálogos nativos para solicitar envio; ela abre modal próprio, informa erro, impede clique duplicado durante a ação e torna indisponibilidade P5 visível. A reabertura também captura falha de rede/servidor sem alerta nativo; erro SQL sem contrato conhecido tem regressão para 502 e `envio_ja_solicitado` é mantido como 409 sem reabertura. As ações da fila têm alvo mínimo de 44px. Isto não cria aprovação, intenção P5 nem envio no smoke.

**RA4 — fechamento editorial final:** a recusa agora registra escopo canônico (uma ou mais seções ou relatório inteiro), com motivo e eco literal; a RPC transacional prende esse escopo ao checksum e a leitura de volta o confere. Nova versão recebe diff interno estrutural, sem IA e sem expor snapshot antigo; falta de fonte vira “não foi possível comparar”. A observação pública é registro separado e versionado, editável apenas pela sessão governada e lida no relatório/PDF exclusivamente pela view fechada que exige aprovação e o recibo AV4 exato. A dispensa RA4.2 continua sendo a única saída “revisada sem análise”: não há segunda exceção, nem aprovação/fechamento/P5 automáticos. Migration remota `20260820182103_ra4_fechamento_editorial_final`; a validação de produção deste portal fica registrada no handoff da fábrica.

**Primeira fatia da RA4 publicada em produção em 2026-08-14 (`main/6b39e6c`):** a revisão privada recebe um resumo de prontidão editorial derivado das sugestões persistidas e dos espaços analíticos reais. `pronta` da sugestão é apenas **sugerida** até revisão humana; `aplicada`/`editada` contam como prontas. **Aprovar relatório** fica protegido na UI e no endpoint server-side enquanto houver análise obrigatória pendente; payload de prontidão enviado pelo navegador é ignorado. Aprovar não envia: depois do GO o modal oferece **Enviar agora** ou **Voltar para a fila**. Na fila, junto de `aprovado por…`, ficam **Voltar para edição** e **Enviar**. A migration `0013_ra4_reabrir_relatorio_para_edicao.sql` foi aplicada no Supabase de produção e o read-back confirmou tabela/RPC, `service_role` com execute e `anon/authenticated` sem execute. Reabrir preserva versão/checksum, audita a aprovação removida e falha fechado se já houver envio ou qualquer intenção P5. `verifica:ra4`, `verifica:decisao`, `verifica:fila`, `verifica:envio`, `verifica:revisao`, `verifica:analise` e build passaram. Um smoke pós-deploy encontrou 500 sem sessão em `/api/painel-decisao`; a causa foi acoplamento serverless a `src/painel/*.js`, corrigido em `6b39e6c`. Vercel marcou Production `success`; `www.dacora.com.br/painel-de-relatorios` responde 200 e as APIs privadas decisão/envio/reabertura respondem 401 sem sessão. **RA5: áudio congelado até segunda ordem** — o player/áudio existente permanece intacto, mas não haverá nova geração/integração de áudio na RA5 sem novo GO. Handoff canônico: `OpenClaw-Dacora/docs/HANDOFF_RA4_REVISAO_EDITORIAL_2026-08-13.md`.
**RM5 — nova ordem editorial dos mensais, implementada em branch isolada em 2026-08-14:** a frente `codex/relatorios-mensais-rm5`, baseada em `main/2780d91`, acrescenta ao catálogo o bloco genérico `FUNIL`, consumindo apenas taxas, etapas, gargalo e janela já calculados pela fábrica. A montagem nova continua declarativa e sem exceção por cliente: o resumo executivo permanece antes das seções; quando elegível, a leitura de funil abre o miolo; performance detalhada fica no centro; Instagram fecha antes do glossário. O bloco de Instagram imprime a janela recebida da fábrica e a observação do teto de 30 dias para novos seguidores. `verifica:funil`, `verifica:revisao`, `verifica:publico` e o build completo passaram. O `lint` permanece com exatamente as seis falhas TypeScript herdadas já registradas, sem erro novo desta frente. Smoke local com Playwright 1.55 + Chrome, sem mutação, validou o componente real em **1440×900** e **390×844**: dois funis renderizados, gargalo marcado, observação de 30 dias visível e `scrollWidth === clientWidth` nos dois tamanhos; no celular as etapas mudam para coluna. ⚠️ **A frase "esta branch ainda não foi enviada, integrada nem publicada; `main` e produção permanecem intactas" era verdade em 14/08 e virou mentira sozinha — corrigida em 2026-08-16.** `b12b9b1` está na `main` (merge `3bcf93c`) e a RM1–RM6 está em produção desde 14/08. **Não reintegrar.** Handoff canônico da frente: `OpenClaw-Dacora/docs/HANDOFF_ALTERACOES_RELATORIOS_MENSAIS_2026-08-14.md`.

**Menos texto repetido nos relatórios — em produção pelo merge `7c04703` (2026-08-15/16).** Medido antes de mexer, não estimado: na seção "Meta Ads em julho", que tem 6 números, **542 dos 1.003 caracteres eram texto de método**; em "Público frio", 72%. O problema não era o tamanho, era a repetição — três camadas diziam quase a mesma coisa antes do primeiro número. Cinco correções em `B1FaixaIndicadores`, `B3`–`B6`, `escopo.tsx`, `TabelaDeEntidades` e `componentes.tsx`: a etiqueta de escopo só aparece em recorte mais estreito que a conta; a fórmula desce para uma lista única ao pé da faixa; "Via Meta Ads" some quando a faixa inteira é de uma plataforma só; as notas de bloco ganharam fonte única (`NotasDoBloco`) e nascem recolhidas a partir de três; e o jargão interno (`camp_frio_video…`) saiu da página do cliente, seguindo no snapshot para auditoria. Resultado medido depois, na mesma página: **25.021 → 21.119 caracteres (−16%) sem perder um número**, seção de campanhas −43%, nenhum alvo de toque abaixo de 44px em 375px e nenhuma rolagem lateral. ⚠️ **A lista de fórmulas NUNCA é recolhida** — chegou a reusar `NotasDoBloco` e nasceu escondida atrás de um clique, justamente a fórmula do CPC, que não pode se esconder porque "cliques totais" e "cliques no link" dão R$ 0,40 e R$ 0,60 na mesma conta. Recolher é para nota descritiva, nunca para a conta de um número publicado.

**A abertura do resumo parou de anunciar o próprio texto — em produção pelo merge `cf6fb83` (2026-08-16).** Uma linha de contrato em `Esqueleto.tsx`, acompanhando a correção da fábrica: o "Resumo do mês" foi reprovado pelo PO (*"cheio de ponto e vírgula, sem design, sem coerência"* e *"o texto com fonte maior conta a mesma história do subtítulo"*). Saíram do texto impresso a entrega da plataforma — que é o conteúdo da faixa logo abaixo —, o preâmbulo *"O principal movimento observado foi:"* e a narração das tabelas. Nada saiu do `analysisContext`, que é o contexto da RA e continua completo. Detalhe e prévia com dado real: `OpenClaw-Dacora/docs/HANDOFF_RESUMO_DO_MES_LEGIVEL_2026-08-16.md`.

**Faxina de repositório em 2026-08-16.** O `dacoraLP` não tinha passado pela normalização que o `OpenClaw-Dacora` fez no mesmo dia e acumulava **24 branches locais, 24 no GitHub e 10 worktrees**. Estado atual: **uma branch (`main`), um worktree, zero branches de trabalho no remoto.** As 18 branches totalmente contidas na `main` foram apagadas; as 5 com commit próprio viraram tag `arquivo/…` **enviada ao GitHub antes** de qualquer remoção, então nada é irrecuperável — `arquivo/dimensao-criativo-pmax-2026-08-16`, `arquivo/ra4-2-acabamento-2026-08-16`, `arquivo/p6-historico-cliente-2026-08-16`, `arquivo/cobertura-sem-duplicata-2026-08-16` e `arquivo/painel-carteiras-atualidade-2026-08-12`. ⚠️ **A armadilha da junção do Windows estava armada de novo:** o worktree `ra3-dacoralp` tinha `node_modules` como **junção apontando para o `node_modules` do repositório principal**, e `git worktree remove --force` a seguiria, esvaziando o checkout que serve o desenvolvimento — o mesmo incidente de 08/08 e 12/08. A junção foi apagada primeiro com `rmdir` (remove o vínculo sem tocar no alvo) e o alvo foi conferido antes e depois: 220 itens e `.bin` presente nos dois momentos.

**Correção aprovada e integrada em 2026-08-07:** o merge `9e287b1` em `main`,
enviado ao GitHub na sequência autorizada, resolve caminhos privados
`storage://relatorios-miniaturas/...` somente depois
da autorização do painel. Karyne v3 tem 8/8 cards e Aviarte v3 tem 30/30 com
assinatura real, HTTP 200 e status traduzido/datado. A fila mostra somente a
versão 3 corrente e preserva as anteriores no banco para auditoria. O Flávio
confirmou que as imagens carregaram. Naquela entrega, os arquivos da P3 ficaram intocados.
**Áudio privado publicado e provado em 2026-08-09:** o merge `7591452`
acrescentou o bloco genérico `AUDIO` e o resolvedor privado sem retomar a P3. A
Vercel marcou o deployment de produção como concluído; domínio e deployment
responderam 200, e a API sem sessão permaneceu fechada em 401. O bucket privado
e relatórios exclusivamente sintéticos foram criados para o smoke autenticado.
Depois disso, Karyne virou o primeiro opt-in real: a versão 6 de julho foi
gravada como nova linha com áudio privado, preservando integralmente as versões
1–5. Isso não habilitou envio nem retomou a P3.
**Visão geral da operação (D1/D2), 2026-08-10 — integrada e publicada:** o
painel ganhou a aba **Visão geral** ao lado da Fila, com cobertura, estado da
fila, qualidade, retrabalho e prazo de liberação, e todo número abrindo a fila
já filtrada. Entrou na `main` pelo merge `6bc5b37`. Detalhe na seção 12.
**P3 concluída em 2026-08-11:** aprovar e recusar existem de ponta a ponta — migração aplicada,
endpoint que grava com read-back e auditoria, tela de revisão com eco literal
antes de gravar, e o estado `recusado` presente na fila e na visão geral. A
branch foi integrada e publicada. Esse era o estado no fechamento técnico da
fase; depois, o relatório Dr. Lucas v3 recebeu a primeira aprovação real, já
registrada na auditoria. Detalhe na seção 13 e no handoff vigente da fábrica.
**P4 e worker controlado integrados e publicados em 2026-08-11:** a recusa
cria a ordem ligada à versão/checksum e uma saída idempotente. O portal entrou
na `main` pelo merge `9c987b2` e mostra os estados reais `pendente`, `reservado`,
`enviando`, `enviado`, `incerto` e `falhou`. O worker da fábrica continua fora
do runtime e sem agenda; preview é o padrão e executar exige gate duplo. Nenhum
relatório real foi decidido e nenhuma mensagem foi enviada. Detalhe na seção 14.
**P5B integrada e publicada em 2026-08-11:** o
portal lê o contrato P5A somente no servidor, mostra o destinatário canônico
antes de oferecer **Enviar** e **Agora não**, cria uma intenção idempotente e só
usa a palavra “enviado” quando o read-back traz recibo confirmado. A migração da
fábrica está aplicada. A leitura remota de fechamento da fase ainda tinha zero
recipients; desde então, quatro destinatários canônicos foram sincronizados
(Karyne, Dr. Lucas, Zenun e Maria Nazaré), Dr. Lucas v3 tornou-se elegível e o
worker P5 entrou em execução controlada por heartbeat. Isso não prova envio ao
cliente: intenção, processamento, recibo e entrega real continuam estados
distintos. Detalhe na seção 15 e no handoff vigente da fábrica.
**Última atualização:** 2026-08-18

**Correção organizacional publicada em 2026-08-09 (`36824a6`):** a fila separa **mensais externos · carteira Dácora**, **mensais externos · carteira Allgrotech** e **mensais internos · Allgrotech** usando `identidade.carteira` e `identidade.produto`, nunca o nome do cliente. Snapshot legado sem esses campos fica numa seção explícita de classificação pendente. A mesma correção reconhece os resultados de contas com várias conversões (`*_resultado_grupo_N`) e remove a mensagem obsoleta de que falta definir o resultado no cadastro. Na leitura direta de 2026-08-10, o banco tinha 79 versões da competência 2026-07; as 34 correntes eram 19 Allgrotech e 15 Dácora, com 33 em `gerado` e a Karyne v6 em `liberado` com áudio privado. Naquela correção, a P3 permaneceu intocada.

O plano completo (as oito fases, o que o painel faz e por quê) vive no
`OpenClaw-Dacora`, em `docs/HANDOFF_PAINEL_APROVACAO_2026-08-06.md`. **Este
arquivo é o de continuidade:** ele diz o que existe, o que falta, e o que já
custou caro descobrir.

> ### Regra que vale para todas as fases
>
> Código e documentação são uma unidade de entrega. Ao terminar uma fase — **e
> também ao parar no meio dela** — atualize este arquivo e os documentos
> canônicos aplicáveis antes de validação, commit, merge ou push. Atualize a
> fonte vigente; não reescreva histórico concluído nem crie diário cumulativo.

> Na RA, a regra é ainda mais explícita: implementação, teste, commit, push,
> merge, publicação e validação em produção são eventos diferentes. Cada evento
> ocorrido deve ser registrado na mesma sessão; a ausência do registro significa
> que o estado não está comprovado.

> A frente não depende de esta conversa continuar aberta. Codex, Claude Code ou
> GPT customizado podem assumir uma fase, mas só Git + plano RA + este estado +
> handoff atualizado transferem fatos. Antes de faltar contexto, a sessão deixa
> checkpoint com branch/`HEAD`, diff, testes, efeitos externos e próximo gate;
> executor sem acesso ao checkout entrega proposta, não implementação provada.

---

## 1. Situação em uma frase

**A fila do mês está em produção e lê do banco os mensais externos e os quatro
pilotos internos da competência 2026-07.** A P2 está concluída e publicada: a fila abre o relatório completo
dentro da bancada, com deep-link e faixa responsiva;
carregamento ou erro nunca mostram controles de decisão. O Flávio concluiu e
aprovou o smoke autenticado em desktop e celular. O catálogo visual dos
relatórios foi redesenhado e publicado depois da P2, sem mudar snapshot,
checksum ou estado. A organização por carteira/produto está em produção desde
2026-08-09. A visão geral da operação entrou na `main` em 2026-08-10. O Gate 3
da Fernanda continua aberto para Karyne e Aviarte, mas só volta depois da etapa
RA aplicável. **A P3 foi concluída em
2026-08-11**, por autorização do Flávio, com migração aplicada, integração e
publicação; a primeira decisão real posterior foi a aprovação de Dr. Lucas v3
(seções 7 e 13).
As migrações `0006` e `0007` da P4 foram aplicadas e provadas no Supabase. O
portal foi integrado, publicado e conferido com sessão real sem decidir nenhum
relatório. A P5B foi integrada na `main`, publicada e conferida em produção sem
decidir ou enviar relatório real. A sessão autenticada anterior não estava
disponível nesta rodada; por isso o caminho autenticado ficou limitado às provas
por dublê, enquanto o gate de login e as negações `401` foram exercitados no site.

**Detalhe do mensal interno Allgrotech (A3), em branch em 2026-08-12:** até
aqui a fila já sabia classificar `identidade.produto === 'mensal_interno_allgrotech'`
(seção da correção de 2026-08-09, abaixo), mas abrir a linha caía em branco —
`RelatorioMontado.tsx` percorre `snapshot.montagem`, e o núcleo factual interno
não tem essa chave. Rota nova `/painel-de-relatorios/interno/:id`
(`src/pages/PainelRelatorioInterno.tsx` + `src/painel/DetalheInterno.tsx`),
endpoint novo `api/painel-relatorio-interno.ts` e resolvedor de miniatura
próprio `api/_miniaturas-interno.ts` — nenhum arquivo do fluxo de
decisão/envio (`api/painel-decisao.ts`, `api/_painel-decisao-regras.ts`,
`RevisaoMoldura.tsx`, `DecisaoDaRevisao.tsx`, `api/painel-envio.ts`) foi
tocado, e as regressões `verifica:decisao`, `verifica:revisao`,
`verifica:fila`, `verifica:visao-geral`, `verifica:painel` e `verifica:refoco`
continuam passando sem alteração. Provado com os 4 pilotos reais de julho/2026
(VetSell, Líder Rolamentos, Make Plant, Cria Fértil): `montarDetalheInterno` e
`resolverMiniaturasPrivadasInterno` lidos e assinados com sucesso contra o
Supabase real (26/26 miniaturas assinadas, 0 indisponível), e os 4 renderizam
sem erro pelo `react-dom/server`. Tela somente leitura — sem A4 (notas
humanas), A5 (PDF/link) ou A6 (envio); a escolha do produto sai só de
`identidade.produto`, nunca do slug/nome do cliente.

### Auditoria da fila corrente em 2026-08-09

A leitura inicial do banco encontrou 44 linhas, das quais 34 eram as versões
correntes de julho: 23 `small_cap`, cinco `ecommerce` e seis `servicos_leads`.
Dez avisos de coleta parcial Meta eram falsos positivos do consumidor: os
relatórios com várias conversões já publicavam cada resultado e cada ranking,
mas a fonte ainda verificava o ranking único obsoleto. A correção pertence à
fábrica no `OpenClaw-Dacora`. Depois da carga e da versão posterior da Karyne,
o banco passou a ter 79 versões em julho; as 34 correntes não contêm aviso de
coleta parcial nem mensagem de conversão pendente.

Não existe correção de palavras-chave pendente: o conector já entrega a lista e
a cobertura que dimensiona a diferença para o total da conta. Hannover e
Syntonics continuam sem resultado por produto em Performance Max, mas o PO
adiou essa ampliação em 2026-08-09 e ela não bloqueia esta publicação. O registro
está em `docs/PENDENCIA_ADIADA_CONECTOR_GOOGLE_PRODUTOS_PMAX_2026-08-09.md` no
`OpenClaw-Dacora`. **Isto descrevia 2026-08-09.** Em 2026-08-12 quatro
pilotos do mensal interno Allgrotech (VetSell, Líder Rolamentos, Make Plant,
Cria Fértil) foram gerados e persistidos, e a seção correspondente da fila já
os mostra; o que faltava era a tela de detalhe, entregue na A3 (nota acima).

### Checkpoint integrado da P2

Branch de origem `codex/p2-revisao-painel`, checkpoint de código `05323e2`,
integrada na `main` pelo merge `335a2f5`. A API de detalhe repete sessão e allow-list no
servidor e não devolve o token público. A revisão usa o mesmo snapshot e o mesmo
renderizador da página do cliente, traz sinais com alvo de seção, mantém a URL
`?relatorio=...` e preserva esse deep-link no retorno do Google. Os botões de
aprovar e recusar existem desabilitados, porque a mutação pertence à P3.

Passaram `npm run verifica:painel`, `npm run verifica:fila`,
`npm run verifica:refoco`, `npm run verifica:revisao` e o build completo. O
`lint` continua nos mesmos seis erros TypeScript preexistentes, sem erro novo
desta rodada. Um navegador real, em isolamento local e com leitura somente do
snapshot persistido, abriu Karyne e Aviarte em 1440×900 e 390×844: documento e
faixa presentes, zero erro de página e zero rolagem lateral. A Karyne exercitou
oito gráficos. Nenhum snapshot foi gravado no repositório e o arnês temporário
foi removido.

O primeiro teste humano autenticado encontrou dois defeitos: o servidor local
tinha sido iniciado antes do endpoint da P2 e devolvia a SPA no lugar da API;
depois do reinício, a Karyne quebrava porque o snapshot usa a fonte válida
`crm`, ausente do catálogo visual. O primeiro foi resolvido reiniciando o
servidor; o segundo está corrigido e coberto pela regressão no checkpoint
`05323e2`. Depois da correção, o Flávio reconfirmou fila → Karyne → voltar →
nomes clicáveis e repetiu o fluxo autenticado no celular. Os dois foram
validados; integração e push foram autorizados na sequência.

### Frente de voz — V4 publicada sem tocar na P3

A capacidade genérica de leitura em áudio foi implementada separadamente e
integrada à `main` pelo merge `7591452`, sem alterar o placeholder da P3. Ela acrescenta o bloco
configurável `AUDIO`, estados disponível/indisponível, controles acessíveis sem
autoplay e assinatura server-side de URI privada do Storage. O caminho é
isolado por cliente, competência e `v<versão>` vindos das colunas da linha; o
snapshot não certifica a própria identidade. Contrato malformado é sanitizado
antes da resposta e nunca monta player. O bucket privado e o player foram
provados em produção com um relatório exclusivamente sintético: uma única linha
v2 e um único OGG permanecem isolados para inspeção; a v1 de teste foi removida
depois de revelar codificação defeituosa no shell. Chrome desktop e 390 × 844
mostraram controles, sem autoplay, erro ou overflow. Isso não ativa cliente,
não carrega snapshot real e não antecipa a rota externa W3. Contrato,
evidências e gates: [`HANDOFF_VOZ_V4_AUDIO_RELATORIO_2026-08-08.md`](HANDOFF_VOZ_V4_AUDIO_RELATORIO_2026-08-08.md).

**Botão destacado publicado em 2026-08-09:** o bloco ganhou **“Ouvir a versão falada”**, com alternância para pausa, `aria-controls`/`aria-pressed`, controles nativos mantidos e nenhum autoplay. `verifica:revisao` e o build completo passaram depois do merge `1e8f4ba`; a Vercel concluiu o deployment da `main`. O bundle servido por `www.dacora.com.br` contém o botão e `aria-pressed`, sem `autoplay`; raiz HTTP 200 e API sem sessão HTTP 401. A fábrica publicou também a v3 exclusivamente sintética com a voz autorizada da Fernanda. A inspeção autenticada desse artefato sintético foi substituída pela validação humana da v6 real da Karyne, descrita abaixo, e não permanece como gate aberto.

**Piloto real Karyne e checksum alinhado:** a v6 `c8103cb6-e7fe-48e3-a9c1-a34d92e5a075` foi carregada e lida de volta com checksum `e090c5abe85965a2810467977b34f5ac`, bloco `AUDIO` disponível e URI privada. A v5 permaneceu intacta e tem o mesmo checksum porque somente a representação opcional mudou. O carregador agora aplica a neutralização estreita da fábrica: remove do cálculo apenas `dados.audios` e blocos `AUDIO`; regressões provam que mudar um número ou acrescentar qualquer outro bloco continua alterando o checksum.

**W3 externa implementada para o piloto da Karyne:** a rota
`/relatorios/<token>` e a API server-side correspondente leem somente versão
`liberado`, não revogada, não substituída e com o checksum do GO ainda atual.
Token, UUID e sinais internos da bancada não voltam no JSON; miniaturas e áudio
continuam privados e são assinados apenas na cópia de resposta. Página e API
impõem `noindex`, `no-store` e `no-referrer`. `verifica:publico`,
`verifica:revisao` e o build passaram. O merge `59c34dc` entrou em produção no
deployment `dpl_4kVJrSfCBDrKumY7aPYf5nW1NdTj`; o token real ficou bloqueado
antes do GO e abriu depois dele com áudio assinado. A primeira entrega à Karyne
foi confirmada e a reexecução ficou deduplicada. Recibo, migrações e evidência
sanitizada estão no handoff operacional do OpenClaw.

O primeiro request real da rota pública também expôs um aviso legado de
`url.parse()`. A assinatura de miniaturas e áudio passou a chamar diretamente a
API privada por `fetch`, e a própria rota deixou de consultar `req.query`, que
acionava o parser legado do adaptador Express: ambos os caminhos agora usam a
API WHATWG `URL`. O contrato privado de uma hora permanece o mesmo.

### Checkpoint visual publicado em 07/08/2026

A direção **Editorial de Performance** foi aplicada ao catálogo compartilhado,
validada em Karyne, Aviarte, Zenun e no cenário de quatro plataformas e
publicada na Vercel. O código do redesign está em `e4d6f13`; a aprovação e a
publicação foram registradas em `a181e73`; o checkpoint que levou o código
aprovado à produção é `61e27c8`. Evidências, before/after e critérios dos gates
ficam em `docs/design-relatorios-open-design/`.

O “aprovado pelo Flávio” neste registro é a decisão de produto, direção visual
e publicação dada pelo PO no chat; não significa revisão de código. A revisão
técnica, os testes e as evidências de produção são responsabilidade do agente.

Não foi criada página, tema ou exceção por cliente. A mudança é
apresentacional: não altera o conteúdo persistido nem exige novo GO para um
snapshot já aprovado.

### Correção dos criativos — aprovada pelo Flávio

O snapshot real passou a carregar caminho imutável do bucket privado, nunca o
link temporário da Meta. `api/painel-relatorio.ts` repete a autorização da P2 e,
antes de responder, valida que cada caminho pertence ao `cliente_slug` e à
competência da linha; só então cria uma URL assinada por uma hora. A operação
acontece numa cópia: banco e checksum continuam intactos. Caminho cruzado de
outro cliente é recusado e volta para o estado explícito sem miniatura.

As versões 3 de julho foram gravadas como `gerado` e lidas de volta: Karyne
`6176a8dd-294b-481a-ae41-153c07548271`, Aviarte
`3755f9ea-7bc1-4264-905f-0cbc0e196966`. O smoke direto do Storage fechou 8/8 e
30/30 imagens em HTTP 200, com status traduzido e datado em todos os cards.
Nenhum token público foi exibido ou reutilizado. Versões 1 e 2 permanecem intactas.
`npm run verifica:revisao` passou. A tentativa na porta 3001 caiu no `SITE_URL`
porque o callback local autorizado no Supabase é o da 3000. **A porta 3000 fica
reservada ao checkout em validação humana, não à P3 por identidade; a P3 só a
usa quando ela própria for o alvo autorizado do teste.** Por instrução do
Flávio, somente o processo local da P3 foi parado e este worktree assumiu a
porta; nenhum arquivo do checkout protegido foi alterado.

Antes da entrega ao Flávio, passaram as quatro regressões do painel e o build
completo. O `lint` continua somente nos seis erros React/TypeScript
preexistentes já registrados; esta entrega não acrescentou erro de tipagem.

A fila antes mapeava cada linha versionada do banco diretamente para a tela.
Por isso v1, v2 e v3 pareciam três relatórios. Agora ela consolida por
`cliente_slug + competencia` e escolhe a maior `versao`; o histórico continua
no banco e não vira trabalho duplicado.

---

## 1.2 A tabela tem dois clientes e três versões de cada — julho de 2026

Esta seção dizia o contrário até 2026-08-06, e a inversão é a notícia da
rodada: `public.relatorios` começou com Karyne e Aviarte v1. A correção dos
criativos acrescentou v2 e depois v3 sem sobrescrever histórico: hoje são seis
linhas, todas de `2026-07`, estado `gerado`. A fila mostra somente Karyne v3 e
Aviarte v3; v1/v2 continuam no banco para auditoria. Cada carga foi conferida
linha a linha contra o arquivo de origem — seção 9.5.

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

O login real, a fila e a revisão corrigida foram provados pelo Flávio em desktop
e celular. A configuração da seção 3.1 já foi feita.

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
| Tela autenticada com fila e revisão | `src/painel/PainelInicio.tsx` |
| Pele do painel (tokens `--dc-*`, densidade de ferramenta) | `src/painel/painel.css` |
| **Autorização por e-mail, no servidor** | `api/painel-sessao.ts` + `api/_painel-autorizacao.ts` |
| `noindex` por cabeçalho | `vercel.json` |
| Regressão da autorização | `scripts/verifica-painel-autorizacao.mts` (`npm run verifica:painel`) |
| **A fila do mês (P1)** | `src/painel/Fila.tsx`, montada em `src/painel/PainelInicio.tsx` |
| **A fila, no servidor** | `api/painel-fila.ts` + `api/_painel-fila-dados.ts` |
| **Carregador de snapshot** | `scripts/carrega-relatorio.mts` (`npm run carrega:relatorio`) |
| **Regressão da fila** | `scripts/verifica-painel-fila.mts` (`npm run verifica:fila`) |
| **Bancada e faixa responsiva da P2** | `src/painel/Revisao.tsx`, `src/painel/RevisaoMoldura.tsx` |
| **Detalhe protegido do relatório** | `api/painel-relatorio.ts` |
| **Regressão da revisão e da fonte CRM** | `scripts/verifica-painel-revisao.mts` (`npm run verifica:revisao`) |
| **Regra de versão corrente, compartilhada** | `api/_painel-versao-corrente.ts` |
| **Agregação da visão geral (D1)** | `api/_painel-visao-geral-dados.ts`, servida por `api/painel-fila.ts` |
| **Aba Visão geral, cartões e filtros (D2)** | `src/painel/VisaoGeral.tsx` + abas/filtros em `src/painel/Fila.tsx` |
| **Regressão da visão geral** | `scripts/verifica-painel-visao-geral.mts` (`npm run verifica:visao-geral`) |
| **Regras da decisão (P3), sem rede** | `api/_painel-decisao-regras.ts` |
| **Aprovar e recusar, no servidor** | `api/painel-decisao.ts` |
| **A decisão na tela, com eco e diálogo** | `src/painel/DecisaoDaRevisao.tsx`, montada por `src/painel/RevisaoMoldura.tsx` |
| **Regressão da decisão** | `scripts/verifica-painel-decisao.mts` (`npm run verifica:decisao`) |
| **Migração dos estados da P3** | `OpenClaw-Dacora/db/migrations/0005_painel_p3_aprovacao_recusa.sql` — aplicada em 2026-08-11 |
| **Contrato seguro da intenção de envio (P5B)** | `api/_painel-envio-regras.ts`, sem identificador bruto, token, referência interna ou chave idempotente no navegador |
| **Leitura e solicitação P5 server-side** | `api/painel-envio.ts`, depois da sessão e allow-list atuais |
| **Diálogo de envio depois do GO confirmado** | `src/painel/EnvioDaRevisao.tsx`, montado por `src/painel/RevisaoMoldura.tsx` |
| **Regressão e smoke com dublês da P5B** | `scripts/verifica-painel-envio.mts` (`npm run verifica:envio`) |
| **Detalhe do mensal interno Allgrotech (A3), em branch** | `src/pages/PainelRelatorioInterno.tsx`, `src/painel/DetalheInterno.tsx`, rota `/painel-de-relatorios/interno/:id` |
| **Leitura server-side do núcleo factual interno** | `api/painel-relatorio-interno.ts` + `api/_miniaturas-interno.ts` — somente leitura, sem verbo de decisão |

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

> **Todos os passos abaixo foram feitos.** Ficam registrados porque descrevem o
> desenho e servem de roteiro se algum dia for preciso refazer.

### 3.1 — FEITO: autorizar o endereço da prévia no Supabase

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

### 3.3 — FEITA na máquina e na Vercel

Ela está no `.env.local` e na Vercel, nos ambientes de Preview e Production.
Foi usada para carregar os dois relatórios e a função publicada da fila está de
pé. Em produção, sem sessão, a função responde `401 sem_sessao` antes de qualquer
leitura do banco.

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

### Passo C — Supabase, autorizar os endereços de volta (FEITO para produção, localhost e prévia)

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
| **A tela de barrado com um e-mail real** | provada no servidor (seção 5.2) e renderizada sem erro; não foi usada uma terceira conta Google real |

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

O evento repetido é comportamento da biblioteca; a recarga era nossa. Ao voltar
para a janela, o `gotrue-js` relê a sessão do armazenamento e emite `SIGNED_IN`
com **um objeto novo em memória**, embora pessoa e token sejam os mesmos. O
guard do `AuthContext` já impedia nova autorização e nova tela de espera, mas
precisava manter `setSessao` para não prender um token renovado.

A dependência escondida estava na fila: `buscar` dependia do objeto inteiro da
sessão, e o `useEffect` dependia de `buscar`. Objeto novo → callback novo → nova
consulta → esqueleto → tabela remontada. A correção em `Fila.tsx` depende apenas
do id estável da pessoa e lê o token atual por `ref`: refoco e refresh ficam
silenciosos; troca de pessoa e ação manual continuam usando a sessão atual.

Num painel de aprovação isso é pior que num app comum: quem está lendo um
relatório de 17 seções, rola até a metade, troca de aba para conferir um número
no Meta e volta — **perde o lugar**. O guard do `AuthContext` e a estabilidade da
busca em `Fila.tsx` são duas metades da mesma proteção; remover qualquer uma
reabre o defeito.

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
5. **A tela autenticada da P0 nasceu vazia de propósito.** A P1 substituiu esse
   vazio pela fila real depois que `public.relatorios` recebeu Karyne e Aviarte.
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

1. **Desbloquear a origem autenticável da RA3 somente com novo GO:** autorizar o hostname do Preview no redirect do Supabase Auth ou outra origem autenticável; depois executar o smoke persistente desktop/celular/PDF. Migration e Preview já estão concluídos; aprovação, recusa e envio continuam fora.
2. **Introdução primeiro:** ela é a peça de maior impacto para o cliente e o
   primeiro alvo da caneta mágica. A sugestão assistida aparece somente na tela
   de revisão, nunca no relatório já aprovado ou público.
3. **C1/C2/C3 preservada como insumo:** não integrar/publicar isoladamente a
   branch `codex/limpeza-relatorios-gate3`; absorver o que for útil na fase RA
   correspondente e validar a página inteira.
4. **P3–P5 continuam operacionais:** Dr. Lucas v3 já teve decisão real; quatro
   recipients foram sincronizados e o worker P5 roda sob controle. Nenhum desses
   fatos autoriza decisão, recusa, correção ou envio adicional nesta frente.
5. **Gate 3 da Fernanda depois da RA aplicável:** validar nominalmente Karyne e
   Aviarte já com a experiência analítica definida, sem confundir GO visual com
   autorização de publicação ou envio.
6. **P6 permanece fora desta entrega. P7 foi retirada da frente pela
   coordenação** e não deve ser reintroduzida como pendência.
7. **Karyne v8/v9:** não há pendência técnica do painel registrada para essas
   versões; qualquer decisão ou envio real continua sujeito aos gates de negócio.

**Dashboard operacional — D0 fechado pelo Flávio e D1/D2 integradas na `main`
em 2026-08-10** (merge `6bc5b37`). O que existe está na seção 12. As fases D3
(tempos de ciclo, aprovação e recusa) e D4 (evolução entre competências)
continuam dependentes de evidência suficiente: **D3 já recebeu sua primeira
matéria-prima com a aprovação real de Dr. Lucas v3**, mas um evento isolado não
forma uma métrica operacional útil; D4 depende de uma segunda competência real.
Nada disso entra por inferência, e o dashboard
continua sem transformar relatório fechado em BI ao vivo. Especificação:
`OpenClaw-Dacora/docs/HANDOFF_DASHBOARD_OPERACIONAL_RELATORIOS_2026-08-10.md`.

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

> **A regra que sai daí vale muito além do carregador, e a P3 tropeçaria nela
> se ninguém avisasse:** o checksum é a impressão digital **do arquivo que a
> fábrica gerou**, e só pode ser recalculado a partir dele. Para responder *"o
> relatório mudou desde o GO?"*, compare a **coluna** `aprovado_checksum` com o
> checksum da nova geração — **nunca** recalcule a partir do `conteudo` lido do
> banco.
>
> **A P3 obedeceu, e em três lugares** (seção 13): a função do banco carimba
> `aprovado_checksum = r.checksum`, a própria coluna da linha travada; o
> endpoint compara coluna com coluna no read-back; e a tela recebe o checksum
> persistido em vez de calcular qualquer coisa. **Não existe, em nenhum dos
> três, um `sha256(conteudo)`** — e a regressão trava isso.

**O efeito colateral:** aquela primeira carga deixou uma linha órfã no banco,
de uma execução que terminou em erro. Ela foi removida e a carga refeita do
zero com o script corrigido, para o procedimento documentado valer como está
escrito. **Quem vir uma carga falhar depois do `✔ Gravado`, confira a tabela
antes de rodar de novo** — a versão repetida vai ser recusada, e a recusa é
correta.

---

## 11. A fila do mês (P1) — o que ela faz e o que foi medido

**Só leitura.** Não existe botão de aprovar, recusar ou enviar, e a ausência é
a decisão: aprovar sem o relatório na tela é o que este painel existe para
impedir, e um botão na lista convida exatamente a isso. Isso é a P2/P3.

Quem calcula é o servidor (`api/_painel-fila-dados.ts`); a tela apresenta.

### 11.1 A ordem, que é a entrega inteira da fase

Duas camadas, nesta ordem: **primeiro o que espera decisão** (um relatório já
enviado não pede nada de ninguém, por mais sinais que tenha); **dentro de cada
faixa, o mais pesado primeiro**. Alfabético é só desempate, para a lista não
dançar entre dois carregamentos.

Os sinais e seus pesos: coleta com falha (50), investimento ausente (40),
plataforma sem evento de resultado definido (30), seções indisponíveis
(20 + 5 por seção extra), variação forte contra o mês anterior (12).

### 11.2 Cinco regras da casa que a fila herda, e por quê

1. **Ausência não vira zero.** Sem nenhum investimento apurado, a célula é um
   traço. `R$ 0,00` ali afirmaria que o cliente não gastou nada no mês — uma
   frase sobre o negócio dele, dita por engano.
2. **Só faixas de PLATAFORMA entram na soma.** A Aviarte tem, além do Meta
   inteiro, faixas por grupo de campanha, todas com uma métrica chamada
   "Investimento". Somar tudo mostraria o mês em dobro e nada pareceria errado.
3. **Resultado NÃO soma entre plataformas.** Investimento soma porque dinheiro
   gasto não se sobrepõe; resultado não, porque a mesma venda pode ser
   atribuída pelo Meta e pelo Google ao mesmo tempo. A fila mostra lado a lado,
   dizendo de onde vem cada um: `Meta 158 · Google 60,09 compras`.
4. **Comparação proibida continua proibida.** Quando o relatório marca uma
   comparação como não permitida (mês incompleto, valor travado em faixa), a
   fila não a faz por fora.
5. **Estado com forma E texto, nunca só cor** — círculo vazado, losango,
   círculo cheio, traço; e o texto por extenso, com quem aprovou e quando.

### 11.3 A conversão fracionada do Google

O Google Ads atribui conversões em pedaços: uma venda tocada por três anúncios
vira frações de crédito, e o mês fecha em `60,089809`. Na fila, **as casas
decimais só aparecem quando existem** — `16,00` vira `16`, `60,089809`
continua `60,09`. Nenhum número é arredondado para caber; só param de ser
escritos zeros que não informam. Quando há fração, o detalhe da célula diz por
quê, senão a pessoa acha que a plataforma contou errado.

Isso vive em `Fila.tsx` e **não** em `src/reports/format.ts` de propósito:
aquele arquivo formata o relatório que vai ao cliente, que já está fechado.

### 11.4 O celular, com números medidos

A Fernanda revisa no celular, então isto foi medido e não estimado. **Em 375px
a tabela pedia 517px de largura e só cabiam 341 — e o que ficava para fora era
a coluna de SINAIS**, ou seja, exatamente a informação pela qual a fila existe,
atrás de uma rolagem lateral que ninguém adivinha.

Correção: abaixo de 820px, **três** colunas saem da grade (estado,
investimento, resultado) e voltam como linhas de apoio sob o nome do cliente,
deixando cliente e sinais. Depois disso: 375px cabe sem rolagem lateral
nenhuma, e a página nunca rola de lado em nenhuma largura testada (375, 414,
768, 820, 830, 1024, 1280, 1600).

> **O corte é 820px, e não os 767px de costume.** Com as cinco colunas a tabela
> só passa a caber a partir de 800px; em 768 — o iPad em retrato — faltavam
> 26px. Um corte em 767 deixaria justamente esse aparelho no pior dos dois
> mundos. **O número saiu de medir, não de escolher pelo nome do aparelho.**

Densidade conferida: **linha de 48px no desktop**, dentro da faixa de 44–52 do
handoff.

### 11.5 O que foi provado, e como

`npm run verifica:fila` — a lógica pura (números, sinais, ordem), o endpoint
inteiro com o Supabase dublado, **e a tabela desenhada**.

| O quê | Como |
|---|---|
| A ordem por atenção, com o enviado no fim e o alfabeto só como desempate | fila de 5 clientes montada no teste |
| Ausência não vira zero; grupo de campanha não entra na soma | casos próprios |
| Comparação proibida não vira sinal; plataforma não contratada não vira ruído | casos próprios |
| **Quem não passa na porta não chega perto do banco** | as consultas são contadas: sem sessão, e-mail fora da lista ou provedor errado → **zero chamadas ao banco** |
| A coluna `token` nunca é pedida | a URL de cada consulta é inspecionada |
| Sem a chave de serviço, falha alto — nunca cai para a chave pública | a chave é removida do ambiente e o resultado é 500, não fila vazia |
| Competência torta é recusada antes de virar consulta | `2026-13` e uma tentativa de injeção |
| Mês vazio explica; banco vazio explica outra coisa | HTML renderizado, sem `<table>` nos dois |
| Tabela de verdade, com `scope`, `caption` e estado por forma+texto | HTML renderizado |
| Nenhum botão de aprovar/recusar/enviar nesta tela | HTML renderizado |

**Além da regressão**, o endpoint real foi rodado contra o **banco real** com os
dois relatórios, com só a sessão dublada: resposta 200, `no-store`, **2,2 KB**
para o navegador (o `conteudo` de ~50 KB por relatório fica no servidor), e
nem o token nem o conteúdo inteiro na resposta.

E o pacote publicado (`npm run build`) foi varrido: o e-mail pessoal do Flávio
não aparece; a chave de serviço **não** aparece — só o **nome** da variável,
dentro do texto que a tela mostra quando ela falta, o que é o comportamento
desejado.

### 11.6 O que NÃO foi provado

O fluxo autenticado completo da P2 saiu desta lista: depois da correção, o
Flávio validou desktop e celular.

### 11.7 A recarga ao trocar de janela — corrigida e com regressão

`npm run verifica:refoco` monta a `FilaComSessao` real num DOM isolado e conta
as consultas. Ele prova quatro contratos:

1. sessão relida como objeto novo, com a mesma pessoa e o mesmo token, não
   consulta nem remonta a fila;
2. token renovado também não consulta sozinho;
3. a próxima ação manual usa o token renovado, não o antigo;
4. trocar de pessoa é mudança real e consulta novamente.

O teste falhou antes da correção com duas consultas no refoco e passou depois.
Na publicação de 2026-08-06, o build completo passou, as doze rotas públicas
responderam `200`, o painel manteve `X-Robots-Tag: noindex, nofollow, noarchive`
e `/api/painel-sessao` e `/api/painel-fila` responderam `401 sem_sessao`, sem
devolver item de cliente.

### 11.8 A Karyne não dependia do Supabase do site para abrir

O diagnóstico leu, sem alterar, as duas linhas do `Dácora Reports` e montou os
dois snapshots no navegador. A revisão não faz chamada ao projeto da Karyne:
os dados do funil já estão congelados no snapshot. A quebra acontecia porque
três blocos desse snapshot declaram `plataforma: "crm"`, valor produzido pelo
gerador do `OpenClaw-Dacora`, mas o `PlataformaId` e o tema visual deste
repositório ainda não conheciam `crm`. `preenchimentoBarra` recebia a fonte e
tentava ler `textura` de uma série inexistente.

O checkpoint `05323e2` incluiu `crm` no contrato, no nome exibido e no tema,
mais regressão direta para o preenchimento. A mesma rodada eliminou a rolagem
horizontal móvel causada pelos rótulos de unidade e pela tabela de campanhas.
Karyne passou com oito gráficos em desktop e celular; Aviarte passou nos dois
tamanhos. Nenhum banco remoto foi alterado.

### 11.9 Vigência histórica da Karyne — resolvida na fábrica e travada no portal

A fábrica já resolve a definição de resultado por **vigência**: até 21/06/2026 a
campanha principal da Meta contava conversas iniciadas; desde 22/06/2026 a
landing page usa `offsite_conversion.fb_pixel_custom`. No Google, a ação antiga
`Contato WhatsApp` também dá lugar a `22-06 - Whatsapp LP de Leads` pela mesma
regra temporal. Junho é misto nas duas plataformas.

Em 12/08/2026 foi encontrado um desvio exclusivamente na demonstração legada
`karyne-montada-2026-07.ts`: ela ainda carregava a hipótese antiga hardcoded e
bypassava a resolução já corrigida na fábrica. O hotfix sincronizou o fixture
com o contrato validado: Meta janeiro–julho = **108, 138, 164, 237, 248, 85,
22**; Google = **30, 33, 35, 39, 28, 36, 16**; julho mostra 22 leads no Meta e
16 no Google. Junho preserva explicitamente 80 conversas + 5 leads no Meta e
30 da ação antiga + 6 da nova no Google.

A regressão `verifica:karyne-conversao` entra no `prebuild`: o deploy falha se
mensagens voltarem a ser o KPI primário de julho, se a ação nova for retroagida
ou se junho deixar de respeitar as duas vigências. A comparação mensal continua
usando o resultado governado total do mês anterior (`85` Meta / `36` Google em
junho); **não foi criada exceção 6/6**. Como junho mistura duas definições de
resultado, a leitura da demo explica explicitamente que a queda de volume e a
alta do custo por lead refletem também a mudança de funil para leads mais
qualificados. A partir de agosto, a comparação tende a voltar a ser homogênea
naturalmente. A fábrica continua sendo a fonte de verdade; o portal não deve
manter uma segunda definição de conversão.

### 11.10 O hotfix parou no meio da página — corrigido em 12/08

**A correção de 11.9 trocou o número na faixa de indicadores e deixou o número
antigo em dois blocos que afirmam, por escrito, que fecham com essa faixa.** A
página publicada dizia 16 leads no Google e, mais abaixo:

- a **tabela de grupos de anúncios** somava 21 conversões e R$ 47,67 de custo
  por conversão, com a definição *"a soma fecha com o total da conta"*;
- a **série diária** somava 21 e a observação afirmava *"A soma dos dias é 21, o
  mesmo total de conversões da seção do Google acima"*.

Junto vinha um segundo desvio: as **bases de comparação de junho** ficaram nos
valores antigos. A faixa comparava contra R$ 792,40 no Meta e R$ 948,15 no
Google, enquanto a evolução do ano — corrigida no mesmo hotfix — mostrava
R$ 1.200,58 e R$ 722,77 para o mesmo mês. O custo por lead de junho no Meta
(R$ 10,73) não saía de nenhum dos dois: não era derivável de nada impresso na
página.

Hoje a faixa, a tabela de grupos e a série diária fecham nos mesmos 16 leads e
no mesmo R$ 62,56; as bases de junho são as da evolução do ano, com as variações
recalculadas a partir do próprio par valor/base. A tabela de palavras-chave, que
declara cobertura parcial e não fecha por natureza, foi trazida de 15 para 11
resultados: 15 de 16 faria a lista parcial responder por 94% dos resultados com
60% do investimento.

**A lição, e é a razão de a regressão ter mudado de forma:** a trava de 11.9
conferia um bloco de cada vez e passou verde com a página se contradizendo. O
que o cliente lê é a página inteira, então o cruzamento é que precisa ser
provado. `verifica:karyne-conversao` passou a exigir, além do que já exigia:

1. a soma das linhas da tabela de grupos fecha com o total dela **e** com a
   faixa, em investimento, cliques e resultado;
2. o custo por resultado de cada linha é mesmo investimento ÷ resultado;
3. a soma da série diária é o resultado da faixa **e** a frase impressa na tela
   diz essa soma — a observação é conferida contra o dado, não escrita à mão;
4. tabela parcial declara cobertura e nunca passa o total da conta;
5. as bases de junho da faixa são as mesmas da evolução do ano, e o custo por
   resultado de junho sai do investimento e do resultado daquele mês;
6. toda variação impressa sai do próprio par valor/base, na casa decimal que
   cada métrica publica.

Cada uma dessas seis travas foi provada quebrando o dado de propósito e
conferindo que a regressão reprova.

Dois defeitos menores da mesma rodada foram fechados junto:

**O comentário do código afirmava um caso que não existe mais.** O bloco acima
de `evolucaoMeta` dizia que março não teve veiculação e que a série exercitava
ali a diferença entre ausência e zero — o dado governado veiculou nos sete
meses, e o comentário virou falso sem ninguém mexer nele. Foi reescrito para
descrever a série que existe (a observação de vigência mês a mês) e para apontar
onde a distinção **de fato** aparece na página: os dias 19 e 20 da série diária,
que interrompem a linha, e o grupo de anúncios pausado, com zero medido em
investimento e resultado mas CTR e CPC não aplicáveis. Não inventar um mês vazio
só para exercitar a regra.

**O glossário explicava a mesma coisa duas vezes.** Ao trocar `mensagens` por
`conversoes` na montagem, a lista colidiu com um `conversoes` que já estava lá —
e `termosDoGlossario` não deduplicava, então o cliente lia "Conversões" e "Custo
por conversão" repetidos, com aviso de chave repetida no React. **A correção foi
no catálogo, não na montagem da Karyne:** repetição some na primeira ocorrência
dentro de `termosDoGlossario`, o que vale para todo cliente, inclusive os que
ainda não existem. A lista da Karyne foi limpa junto, para a configuração dizer
o que quer dizer. As duas pontas têm regressão — a montagem não pode repetir, e
o catálogo tem que deduplicar mesmo se ela repetir —, e as duas foram provadas
quebrando o código de propósito. O glossário na tela passou de 9 termos com 2
repetidos para 7 sem repetição.

**Estado: publicado em produção em 12/08/2026**, com autorização do Flávio, pela
branch `fix/karyne-fechamento-blocos`. Build limpo, 3 rotas institucionais
pré-renderizadas e relatórios fora do sitemap.

---

## 12. A visão geral da operação (D1 e D2)

**Estado: integrada na `main` pelo merge `6bc5b37`, publicada e validada pelo
Flávio em 2026-08-11.** A rota, o `noindex`, o fechamento das APIs sem sessão e
o site institucional foram conferidos em produção. O smoke humano registrado
não detalhou aparelho nem navegador, portanto não amplia a evidência para uma
cobertura específica de desktop e celular.

### 12.1 As decisões do Flávio que a definiram (D0, 2026-08-10)

| Pergunta | Decisão |
|---|---|
| Onde fica | **Aba na mesma rota**, ao lado da Fila — não é página separada |
| Quando construir | **Agora**; é só leitura e ajuda na conferência em curso |
| O que mostra | Cobertura, onde a fila parou, qualidade **e** retrabalho |
| Prazo | **Dia 5 do mês seguinte é o limite de LIBERAÇÃO** |

O dia 5 mede liberação, **não geração** — ele corrigiu isso explicitamente
enquanto a fase era construída. Gerar é trabalho interno; o marco combinado é o
documento estar liberado.

### 12.2 O que ela responde, e o que ela se recusa a responder

Quatro indicadores no topo (relatórios do mês, esperando revisão, com sinal de
atenção, prazo) e seis distribuições: carteira, finalidade, formato, estado,
tipo de sinal e retrabalho. **Todo número abre a fila já filtrada** — é isso
que a impede de virar uma segunda lista paralela.

**Ela não soma performance entre clientes.** Não há total de investimento da
carteira, de leads nem de receita, e a própria tela escreve isso. Leads de
clientes diferentes têm definições diferentes; empilhá-los daria um número
grande e sem significado. A regressão trava a frase: apagá-la quebra o teste.

### 12.3 Cinco decisões que mudam números, e ficam registradas

1. **A regra de versão corrente virou módulo próprio** (`_painel-versao-corrente.ts`).
   Enquanto a fila era a única leitora, ela morava dentro de `montarFila`. Duas
   cópias da mesma regra é como a fila e o resumo passariam a discordar sobre
   quantos relatórios existem no mês — **cada um passando no próprio teste**. A
   regressão amarra os dois ao mesmo número.
2. **A visão geral sai da MESMA leitura da fila**, no mesmo endpoint. Um
   endpoint separado significaria outra consulta de ~2 MB, outra porta de
   autorização e — pior — dois retratos de momentos diferentes: uma carga
   entrando no meio faria o resumo dizer 34 e a fila mostrar 35.
3. **O prazo conta a PRIMEIRA liberação, não a da versão corrente.** Medindo a
   corrente, uma correção liberada depois transformaria um mês pontual em mês
   atrasado — o painel passaria a punir o ato de consertar. Retrabalho é medido
   à parte, que é onde essa informação pertence.
4. **"Ainda não liberado" é dito separado de "liberado com atraso".** Os dois
   perderam a data, mas um está pronto e chegou tarde e o outro não saiu.
5. **O formato é string livre, não união fechada dos três de hoje.** Um formato
   novo saindo da fábrica cairia, numa união fechada, no balde de "não
   declarado" — e o painel acusaria falta de classificação num relatório que se
   classificou muito bem.

### 12.4 O que o prazo mostra hoje, e por que

Medido no banco em 2026-08-10, competência 2026-07: **0 liberados no prazo, 1
liberado com atraso, 33 ainda não liberados** — as três parcelas fecham com os
34 relatórios. A única liberação registrada é a Karyne v6, do piloto W3.

Isto está escrito aqui porque um cartão vermelho sem explicação leva a próxima
sessão a procurar defeito onde não há: **não é falha do dashboard nem da
fábrica; é a etapa de liberação ainda não ter acontecido pelo painel.**

**O que mudou em 2026-08-11:** o botão de liberar passou a existir (P3, seção
13), e a migração já foi aplicada. **Os números acima continuam iguais** até
alguém decidir de verdade. Nenhum relatório real foi aprovado ou
recusado nesta rodada, de propósito — o Flávio adiou a P3 duas vezes dizendo
que *"aprovar pressupõe formato estável"*, e construir o botão não é o mesmo
que usá-lo. Quando as primeiras liberações acontecerem, **estes números se
mexem sozinhos**: o cartão mede `aprovado_em`, e a P3 grava exatamente essa
coluna. Não existe segunda regra de prazo a manter em dia.

### 12.5 O que passou

As regressões do painel e o build completo — 3 rotas institucionais
pré-renderizadas, sitemap com 3 URLs e nenhuma rota de relatório dentro dele. O
pacote publicado não contém o e-mail pessoal do Flávio;
`SUPABASE_SERVICE_ROLE_KEY` aparece só como **nome**, dentro do texto que a tela
mostra quando ela falta — o mesmo caso já registrado na seção 11.5.

**Smoke humano:** o Flávio abriu e validou a visão geral em 2026-08-11. Como o
registro não identifica aparelho e navegador, não se afirma cobertura específica
de desktop e celular.

> **Correção de tipagem, feita em 2026-08-11.** A regressão da visão geral usava
> `CampoDeFiltro` sem importar o tipo; a importação foi corrigida antes da P3.
> O `lint` voltou aos **seis erros TypeScript preexistentes** em
> `src/painel/telas.tsx`, `src/reports/{ConfrontoMidiaLoja,Esqueleto,RelatorioMensal}.tsx`
> e `src/reports/blocos/{B1FaixaIndicadores,B3EvolucaoMensal}.tsx`. A P3 não
> acrescentou erro de tipagem.

---

## 13. Aprovar e recusar (P3)

**Estado: concluída em 2026-08-11, com sete regressões e o build passando. A
migração foi aplicada no Supabase, a implementação integrada na `main` e
publicada; nenhum relatório real foi aprovado ou recusado.**

O Flávio autorizou construir a fase. Ele **não** autorizou usá-la, e a
diferença é o argumento com que ele mesmo adiou a P3 duas vezes: *"não é
problema, estamos validando layout e dados, não dá pra aprovar nada nessa
fase"*. Carimbar um "sim" em documento que ainda vai mudar é pior que não ter
carimbo. Por isso esta rodada não tocou em nenhuma linha do banco.

### 13.1 O placeholder foi substituído por migração de verdade

O arquivo vazio `supabase/migrations/20260807001052_painel_p3_aprovacao_recusa.sql`,
que vivia não rastreado neste checkout, **foi removido**. As migrações deste
produto moram todas no `OpenClaw-Dacora`, em `db/migrations/`, ao lado das
quatro que já existiam — manter uma quinta em outro repositório criaria dois
lugares para procurar o histórico do banco.

A migração real é `0005_painel_p3_aprovacao_recusa.sql` e faz três coisas:

1. **as três colunas do "não"** — `recusado_por`, `recusado_em`,
   `recusa_motivo`;
2. **o estado `recusado`**, acrescentado ao `check` de `estado`, mais três
   restrições: recusa completa ou recusa nenhuma (com motivo de no mínimo 10
   caracteres depois de aparado), recusado exige registro, e recusado nunca
   carrega carimbo de aprovação nem de envio;
3. **`public.decidir_relatorio(...)`**, que trava a linha, confere e grava
   numa transação só, com `security invoker` e execução concedida apenas ao
   `service_role`. A `service_role` já tem `BYPASSRLS` e privilégios da tabela;
   elevar para o dono da função seria poder desnecessário.

Ela é **idempotente de propósito** (`drop constraint if exists` antes de cada
`add`, `add column if not exists`): uma segunda execução não pode falhar no meio
deixando metade das restrições no lugar. A aplicação remota ficou registrada no
histórico do Supabase como `20260811101858_painel_p3_aprovacao_recusa`.

### 13.2 Por que a decisão inteira acontece no banco

Poderia ser uma sequência de `UPDATE` no servidor. Não é, e a razão é a lição
central deste projeto: **só a correção que torna o erro impossível não
regride**. Com a decisão dentro de uma função, não existe janela em que o
estado já mudou e o carimbo ainda não — e é exatamente nessa janela que nasce
um relatório `liberado` sem GO amarrado ao documento.

O servidor faz **uma escrita e uma leitura**, e a regressão conta as chamadas
para garantir que continua assim.

### 13.3 O checksum, e a armadilha que a seção 9.6 anunciava

A seção 9.6 avisava que a P3 tropeçaria no `jsonb` se ninguém contasse. Ela não
tropeçou, e a proteção está em três lugares:

- na função do banco, `aprovado_checksum` recebe **`r.checksum`** — a própria
  coluna da linha travada, nunca o parâmetro que veio de fora;
- o `p_checksum_visto`, que é o checksum que estava **na tela** de quem
  decidiu, é comparado com a **coluna**. Divergiu, a decisão é recusada com a
  frase *"este relatório mudou desde que você o abriu"* e nada é gravado;
- o read-back do servidor compara **coluna com coluna**.

**Em nenhum dos três existe um `sha256(conteudo)`.** Se existisse, toda
aprovação seria reprovada para sempre, porque o `jsonb` devolve as chaves em
outra ordem.

### 13.4 O eco, e por que ele não é enfeite

Nenhum clique grava direto. O painel escreve, em português e **em código**, o
que vai ser registrado — cliente, competência, versão, impressão digital, quem
assina e, na recusa, o motivo inteiro — e só grava depois que a pessoa confirma
aquele texto. É a mesma disciplina da edição governada de cadastro no
`OpenClaw-Dacora`: o mal-entendido aparece antes da escrita, em vez de virar
silêncio.

A recusa abre **diálogo próprio**, com foco preso dentro, `Esc` fechando e o
foco voltando ao botão que o abriu. O motivo é obrigatório em três camadas
independentes — o botão de confirmar fica desabilitado, o servidor recusa antes
de tocar o banco, e o banco recusa por restrição. Nenhuma delas confia nas
outras.

### 13.5 Quem decidiu vem da sessão, sempre

O corpo do pedido **não tem campo de identidade**, e se tivesse seria ignorado:
`lerPedido` só extrai id, decisão, checksum e motivo. O `p_quem` que chega ao
banco é o e-mail resolvido por `conferirAcesso`, no servidor. A regressão manda
de propósito um `quem: 'invasor@exemplo.com'` no corpo e prova que ele não
aparece em lugar nenhum da chamada.

### 13.6 O estado `recusado` aparece nas DUAS telas

Um estado que existe numa tela e some na outra é pior que estado nenhum. Ele
entrou em quatro lugares, e a regressão trava os quatro:

- **na fila**, com forma própria (quadrado vazado na cor de sinal, girado) e
  texto por extenso — "recusado por Fernanda · 11/08" —, com o motivo no
  detalhe da célula;
- **na ordem da fila**, logo depois de "esperando revisão" e **antes** de
  liberado e enviado: recusado é trabalho aberto, só que fora do painel.
  Empurrá-lo para o fim faria o "não" sumir de vista;
- **no resumo do mês**, contado separadamente;
- **na visão geral**, na fatia "onde a fila parou", com rótulo próprio e na
  mesma ordem da fila. A regressão confere que as fatias **fecham com o
  total** — um estado novo fora da conta seria um relatório desaparecendo do
  resumo.

A regra de "qual é a versão corrente" continua num módulo só
(`_painel-versao-corrente.ts`). **Nenhuma terceira cópia foi criada.**

### 13.7 O que passou

`npm run verifica:decisao` (novo) mais as seis anteriores — `painel`, `fila`,
`revisao`, `refoco`, `publico`, `visao-geral` — e o `npm run build` completo,
com 3 rotas institucionais pré-renderizadas e sitemap de 3 URLs. O `lint`
continua **nos seis erros preexistentes** medidos no tronco limpo (ver a
correção de tipagem na seção 12.5); esta entrega não acrescentou nenhum.

A regressão nova prova, sem banco e sem conta Google:

| O quê | Como |
|---|---|
| Sem sessão, fora da lista, por outro provedor ou por método errado | **zero chamadas ao banco** nos quatro casos |
| Pedido torto (uuid inválido, decisão desconhecida, sem checksum, motivo curto) | recusado **antes** de tocar a tabela |
| Quem decidiu vem da sessão | identidade forjada no corpo é ignorada; duas sessões gravam aprovadores diferentes |
| O checksum da tela viaja como guarda | `p_checksum_visto` é o da coluna; a divergência vira 409 em português, com `gravado: false` |
| Uma escrita, uma leitura | as chamadas são contadas; a única com corpo é a função do banco |
| Read-back que não bate **não** vira sucesso | cinco formas de quebrar, todas viram 502 dizendo o que não bateu |
| Repetir a mesma decisão | responde 200 dizendo "já estava registrada assim", sem duplicar |
| Sem chave de serviço | falha alto — nunca cai para a chave pública |
| A fila continua sem botão de decisão | HTML renderizado, sem "Aprovar" nem "Recusar" |
| Rótulo que diz o objeto | `aria-label="Aprovar o relatório de Cliente Exemplo, julho de 2026"` |
| Sem canal de decisão, botão desabilitado | a moldura desenhada fora do painel mantém os dois botões inertes |

E, num DOM de verdade (`jsdom`), o fluxo do clique — porque HTML estático prova
o que está desenhado, não o que acontece quando alguém clica:

| O quê | Como |
|---|---|
| O primeiro clique **não grava**, mostra o eco | nada sai; `Cancelar` fecha sem gravar |
| Confirmar grava | e a aprovação sai **sem motivo** |
| A recusa abre diálogo com `aria-modal` | e `Registrar recusa` nasce desabilitado |
| Motivo curto continua barrado | o contador diz quantos caracteres faltam |
| `Esc` fecha sem gravar | o diálogo some e nada é enviado |
| O motivo chega aparado | espaços em volta não viram parte do texto registrado |

### 13.8 O que NÃO foi conferido, e por quê

| Não conferido | Motivo |
|---|---|
| O fluxo autenticado ponta a ponta, com conta Google real | exige as contas do Flávio ou da Fernanda, que quem escreve o código não tem e não deve ter |
| Aprovar ou recusar um relatório real | **proibido nesta rodada, de propósito** — ver a abertura desta seção |
| O diálogo da recusa no celular | o CSS acompanha a faixa fixa já validada, mas nada foi medido em aparelho |

**Prova remota da função:** duas linhas sintéticas foram criadas dentro de uma
transação como `service_role`; uma percorreu a aprovação e outra a recusa. Os
carimbos, checksum, motivo e estados foram conferidos antes do `ROLLBACK`, que
deixou zero resíduo. Os grants medidos ficaram `anon=false`,
`authenticated=false`, `service_role=true`, com `security_definer=false`.

### 13.9 Uma decisão que fica registrada como escolha, não como esquecimento

**Aprovar e recusar são terminais dentro do painel: não existe "desfazer".** Um
relatório recusado não pode ser aprovado depois, e vice-versa. O caminho de
correção é o que o handoff já previa — **gerar uma versão nova na fábrica**,
que entra como `versao + 1` e vira a corrente na fila.

Isso é deliberado: um botão de desfazer transformaria a auditoria em rascunho,
e a pergunta *"o que exatamente foi aprovado, e por quem?"* deixaria de ter
resposta única. O custo é que uma recusa por engano exige regerar. O eco antes
de gravar existe justamente para tornar esse engano caro de cometer.

**Se o Flávio preferir outro desenho, é decisão dele** — e muda a migração, não
só a tela.

## 14. Ordem de correção e saída interna controlada (P4)

**Estado: integrada e publicada em 2026-08-11. Migrações aplicadas e provadas no
Supabase; portal na `main` pelo merge `fed25f2`, deployment de produção
`dpl_4UhnKg1aAGJfzDcYeooAajJLEhfs` em estado `READY` e smoke autenticado
somente leitura concluído. Nenhum relatório real foi aprovado ou recusado e
nenhuma mensagem foi enviada.**

A menor P4 coerente mantém a P3 como única porta de decisão. O gatilho da recusa
cria na mesma transação:

1. uma ordem durável, única por `relatorio_id`, amarrada ao id, versão, checksum,
   cliente, competência, motivo, pessoa e horário da recusa;
2. uma entrada idempotente na outbox interna, que nasce `pendente` e aponta para
   `dacora_semanais.recipients` em vez de copiar um id de grupo.

Os estados inicialmente publicados da ordem são fatos observáveis:
`aguardando_nova_versao` e `nova_versao_gerada`. Inserir uma versão posterior
do mesmo cliente/competência marca a ordem como atendida; isso não afirma que a
correção ficou certa, não aprova o documento e não envia nada. O painel apenas lê a view privada
`painel_relatorios_com_correcao`, exige ordem + outbox no read-back da recusa e
expõe a pendência na fila/revisão. A edição e a regeneração continuam na
fábrica/agentes.

Os SQLs canônicos são
`OpenClaw-Dacora/db/migrations/0006_painel_p4_ordens_correcao.sql` e
`0007_painel_p4_hardening.sql`, aplicados no histórico remoto como
`20260811111316_painel_p4_ordens_correcao` e
`20260811111506_painel_p4_hardening`. A segunda migração revogou os default
privileges extras medidos no projeto e acrescentou os índices pedidos pelos
advisors para as FKs compostas.

A prova sintética executou a recusa pela função P3, repetiu a mesma decisão e
inseriu uma versão 2. O resultado foi: primeira decisão nova, retry reconhecido,
uma ordem, uma notificação, transição de `aguardando_nova_versao` para
`nova_versao_gerada`, view com os dois registros e destino
`dacora_semanais.recipients`. O sub-bloco foi revertido e as três contagens
residuais ficaram zero. `anon` e `authenticated` mediram zero privilégio; o
`service_role` ficou somente com o necessário. No domínio real, a rota do painel
respondeu `200`, as APIs sem sessão permaneceram em `401` e a sessão autorizada
carregou a revisão e a visão geral.

### 14.1 Worker idempotente da saída interna

O worker entrou na `master` do `OpenClaw-Dacora` pelo merge `7b2fc2f`; a
migração remota é
`20260811114936_painel_p4_notification_worker`. A reivindicação é atômica com
`FOR UPDATE SKIP LOCKED` e a máquina de estados é:

`pendente → reservado → enviando → enviado`, com `falhou` somente antes do
transporte e `incerto` quando o efeito pode ter acontecido sem recibo inequívoco.
`enviando` e `incerto` nunca voltam automaticamente à fila. O destino é
resolvido no `config/reports.json` existente e persistido antes do efeito; o
banco não ganhou id hard-coded. `enviado` exige `messageId` e read-back idêntico.

O comando `npm run reports:corrections:notify` é preview somente leitura. A
execução exige ao mesmo tempo `--execute` e
`REPORT_CORRECTION_NOTIFICATION_EXECUTOR_ENABLED=true`; fallback por CLI fica
proibido. Nenhuma agenda foi criada, o runtime não foi reiniciado e nenhum
envio foi executado. A prova sintética foi revertida: destino inválido e recibo
ausente foram bloqueados, a segunda reserva e o retry depois de `incerto`
retornaram zero, e as contagens reais finais permaneceram em zero.

O portal passou a aceitar e explicar os seis estados pelo merge `9c987b2`; o
deployment de produção `dpl_A2BFqpqWbEJZAfHLt99EziTXLpoR` ficou `READY`. A rota
respondeu `200` com `noindex` e as duas APIs sem sessão responderam `401`.
Qualquer mensagem real permanece uma operação governada posterior, não um
efeito automático desta publicação.

### 14.2 Circuito da correção em branch — 20/08/2026

O acabamento P4/RA4 está implementado em branches da fábrica e do portal, mas
**não foi integrado, migrado no Supabase nem publicado**. A migration da fábrica
passa a expor `em_processamento` e `falhou`, reserva concorrente com recibo
exato e associa a ordem também à nova versão. O portal lê esses fatos e deixa
claro: aguardando correção, correção em processamento, correção que exige
atenção ou nova versão disponível para revisão humana. Esta última continua
`gerado`: nunca é aprovada, fechada editorialmente ou enviada automaticamente.
O painel não inventa diff; ele só apresenta o vínculo determinístico existente.

Regressões locais de decisão, fila e revisão, além do build completo, passaram.
O próximo gate é aplicar a migration da fábrica com read-back antes de publicar
este portal; ativar o executor, reiniciar runtime, recusar/aprovar ou enviar um
relatório continuam decisões separadas. Handoff: `OpenClaw-Dacora/docs/HANDOFF_CIRCUITO_RECUSA_RELATORIOS_2026-08-20.md`.

## 15. Intenção de envio ao cliente (P5B)

> **Atualização vigente de 2026-08-13:** os parágrafos abaixo preservam a prova
> do fechamento original da fase em 2026-08-11. Depois deles, quatro recipients
> canônicos foram sincronizados, Dr. Lucas v3 tornou-se elegível e o worker P5
> passou a executar por heartbeat controlado. Não houve autorização nesta sessão
> para nova decisão, intenção ou envio; consulte o handoff vigente da fábrica.

**Estado: integrada na `main` pelo merge normal `4ad29ee`, corrigida contra o
contrato remoto em `4045c6e` e publicada. Nenhum relatório real foi aprovado,
recusado ou colocado na fila de envio.**

O contrato veio da fábrica, hoje em `origin/master` no commit `0aefcf5`. A
migração remota
`20260811163152_painel_p5_intencoes_envio` foi aplicada e teve read-back
aprovado. A leitura direta desta publicação encontrou 102 linhas na view, zero
recipients sincronizados, zero destinos prontos e zero itens acionáveis. O único
registro de intenção visível é o recibo legado do W3; o worker P5 não foi
executado, não está no runtime e não tem agenda.

O portal ganhou `GET/POST /api/painel-envio`. As duas operações repetem a sessão
e a allow-list existentes antes de falar com o Supabase; `service_role` fica no
servidor. A leitura consulta `relatorio_p5_portal`. A solicitação chama
`relatorio_p5_solicitar_envio` com o id, o checksum visto e o e-mail resolvido
pela sessão no servidor, e depois relê a view. A resposta ao navegador é uma
projeção estreita: não inclui id bruto do grupo, token, referência interna,
`envio_id` nem chave idempotente.

`EnvioDaRevisao` é irmão da decisão na faixa de revisão e só é montado depois de
o read-back P3 devolver `liberado` ou `enviado`. A view ainda governa se a ação
pode aparecer. Quando pode, o diálogo escreve o nome canônico do destinatário
antes dos botões **Enviar** e **Agora não**. **Agora não** apenas fecha o diálogo:
não chama API, não cria intenção e volta a aparecer quando a revisão é reaberta.
Clique duplo é contido na interface e a deduplicação definitiva continua sendo
a intenção durável da RPC. Checksum obsoleto, destino ausente ou não
sincronizado e read-back divergente falham fechados.

Na revisão de integração, a introspecção da view remota encontrou
`destinatario_sincronizado_em` como timestamp, em vez do booleano fabricado pelo
dublê inicial. O commit `4045c6e` alinhou a regra e a regressão ao contrato real.
Com os contadores acima, nenhuma linha oferece ação: a P5 falha fechada sem
inventar destinatário nem exibir **Enviar**.

Os estados apresentados são `pendente`, `reservado`, `enviando`, `confirmado`,
`incerto` e `falhou`. O painel só diz **Enviado** quando a view devolve ao mesmo
tempo `envio_estado=confirmado`, `confirmado_em` e o envelope persistido de
envio; qualquer divergência reprova o read-back. Não existe editor de snapshot,
undo, P6, P7, D3 ou D4 nesta entrega.

Validação após o merge em 2026-08-11: `npm run verifica:envio` e as sete regressões do
painel/relatório passaram; `npm run build` passou incluindo cliente, SSR,
prerender, sitemap e bundle do servidor. O lint global continua com as mesmas
seis falhas anteriores em `telas.tsx` e cinco blocos de relatório, sem falha em
arquivo da P5B. O smoke desta rodada usou dublês de sessão, view e RPC e provou o
diálogo, **Agora não** sem mutação, retry idempotente, checksum obsoleto e recibo
divergente. O deployment de código
`6zqAZFsMMNaqEDVWduDKhxE639fS` ficou `READY` em
<https://dacora-2wf0wi7ce-flavio-coras-projects.vercel.app>; o domínio respondeu
`200` com `noindex`, e as APIs sem sessão responderam `401`. O navegador
disponível não tinha sessão autenticada: desktop e celular ficaram no login, sem
erro de console nem rolagem lateral. Assim, o smoke autenticado real não foi
alegado e o diálogo acionável permanece provado somente por dublê. Clicar em
**Enviar**, sincronizar recipients ou executar/agendar o worker exige outro gate.

---

## 10. Achado fora do escopo, para quem cuidar do `OpenClaw-Dacora`

Esta sessão trabalhou só no `dacoraLP` e não tocou no outro repositório. Fica
registrado aqui para outra sessão levar:

> O projeto Supabase `Dácora Reports` está com **cadastro por e-mail e senha
> ligado e aberto** (`disable_signup: false`). Não abre buraco no painel — o
> código recusa quem não entrou pelo Google —, mas é uma porta sem uso num
> projeto que só devia aceitar Google. Vale desligar (passo E da seção 3).

---

**Verificador de tipos verde e ligado à publicação (2026-08-20, branch `fix/typecheck-verde`, aguardando GO).**
Faltava `@types/react`/`@types/react-dom` no projeto — sem eles o `tsc` rodava cego e as
"seis falhas TypeScript herdadas" citadas várias vezes acima eram sintoma da ausência, não
código errado. Com os tipos instalados o `lint` foi para **0 erros**, e o `lint` passou a
integrar o `prebuild`: ⚠️ **daqui em diante um erro de tipo bloqueia a publicação na
Vercel**. As quatro worktrees AV antigas do portal também foram removidas.
Detalhe, medição e o que ficou de fora:
[`HANDOFF_TYPECHECK_VERDE_2026-08-20.md`](HANDOFF_TYPECHECK_VERDE_2026-08-20.md).

---

## 11. Rotas privadas deixaram de receber a home (2026-08-20)

Abrir o painel ou o relatório de um cliente entregava **24 KB da home
institucional** antes do app — daí o flash. Junto vinham o `<title>` de venda,
o preload em prioridade alta da imagem do banner (competindo com o código do
relatório) e o **Google Analytics + Pixel do Facebook disparando `PageView` na
página privada do cliente**.

O build passa a emitir `dist/app.html`, uma casca de 2 KB sem home, sem
rastreador e sem preload de marketing; `vercel.json` manda
`/painel-de-relatorios(/.*)?` e `/relatorios/(.*)` para ela. A home e as duas
páginas institucionais não mudaram.

Regressão em `scripts/verifica-casca-privada.mjs`, dentro do `build`, sobre o
artefato construído — com a metade negativa que exige a home **continuar**
pré-renderizada e com rastreadores. Detalhe:
[`HANDOFF_CASCA_PRIVADA_2026-08-20.md`](HANDOFF_CASCA_PRIVADA_2026-08-20.md).

---

## 12. Data Hub ganhou casca e criador local (2026-08-23)

A rota `/data-hub` deixou de ser só o teste de canal e passou a ter a forma do
produto: navegação entre **Relatórios** e **Data Hub**, lista de extrações com
estado vazio que explica a causa, e um criador em esteira de quatro etapas —
origem, campos, período e revisão — com resumo persistente ao lado.

Nada disso fala com backend remoto. O catálogo é controlado, vive em
`src/pages/data-hub-catalogo.ts` e se declara demonstrativo; nenhum nome ou ID
real de cliente entra ali. Um rascunho concluído existe só na memória da aba, e
a tela diz isso com todas as letras — lista que parece salva e some no F5 é pior
do que lista vazia.

As regras de produto ficaram no catálogo, não espalhadas na tela: combinação
impossível é recusada com o motivo e a saída ("breakdown demográfico não existe
no nível conta, use Campanha, Conjunto ou Anúncio"), **sem trocar a escolha do
usuário por baixo**; consulta de volume alto recebe aviso com recomendação, mas
não é bloqueada, porque a decisão é de quem opera; e a natureza dos campos
sobrevive até a revisão, avisando que alcance, frequência e métricas calculadas
não se somam entre linhas.

Os componentes de apresentação ficam em `src/pages/data-hub-extracoes.tsx`,
separados da página, para poderem ser renderizados em teste sem carregar CSS nem
contexto de sessão. `DataHub.tsx` continua dona do provedor de autenticação, do
portão e do diagnóstico de canal.

Regressão em `scripts/verifica-painel-data-hub-casca.mts`
(`npm run verifica:data-hub-casca`): asserções puras sobre as regras do catálogo
mais render de HTML real da lista vazia, da lista com rascunho e do criador —
incluindo a checagem de que a fase **não** acrescentou nenhuma chamada de rede.

Uma auditoria de acessibilidade sobre a tela nova encontrou um defeito e três
riscos, todos corrigidos antes do merge: o foco do teclado se perdia ao alternar
entre lista e criador — quem navega por Tab voltava ao topo da página —, a troca
de etapa não era anunciada, o aviso de rascunho local nascia junto com o próprio
`role="status"` (nó recém-inserido que vários leitores de tela não anunciam), e
as mensagens de impedimento viviam só no resumo lateral, sem ligação com o campo
que as causou. Agora cada `<select>` com problema recebe `aria-invalid` e aponta,
via `aria-describedby`, para a mensagem no resumo — dita uma vez só, não duas.

O PO validou a tela no Preview da Vercel em 2026-08-23, com a ressalva explícita
de que o teste que vale para ele é com **contas reais**, na fase do catálogo real.
Esta validação libera a frente para seguir; não é aprovação final da tela.

---

## 13. Data Hub — contrato `selectedFields` e UX publicados (2026-08-26)

O portal do Data Hub foi alinhado ao contrato canônico de seleção por campos. A
criação/edição de extrações deixou de pedir **nível** manual: o grão é deduzido
pela própria seleção. O catálogo do portal passou a expor também os campos de
hierarquia (`date`, `account_id`, `campaign_id`, `campaign_name`, `adset_id`,
`adset_name`, `ad_id`, `ad_name`) e normaliza campos de criativo para a forma
`creative.*` ao construir `selectedFields`.

No salvamento novo, `src/pages/data-hub-extracoes.tsx` envia `selectedFields` e
remove do payload os campos legados `entityLevel`, `fields`, `creativeFields` e
`breakdowns`. `src/pages/DataHub.tsx` mantém compatibilidade de leitura/edição
com definições antigas que ainda cheguem nesse formato.

A UX foi revisada com as skills compartilhadas `frontend-design`,
`impeccable-design-polish`, `web-design-guidelines` e
`vercel-react-best-practices`. A revisão eliminou linguagem que induzia uma
escolha manual de nível, passou a mostrar **grão deduzido**, preservou ligação
dos erros com os controles e acrescentou `name`/`autocomplete` aos controles
alterados. A auditoria estática da frente não encontrou `div`/`span` clicável,
remoção de outline, `transition: all` nem o antigo seletor `id="nivel"` na UI.

Validação da entrega: `npm run verifica:data-hub-casca` passou; `git diff
--check` passou; lint/typecheck passou com heap ampliado; a varredura do diff
não encontrou segredo óbvio. O commit funcional é `e158438` (`feat: align Data
Hub portal with selected fields`), integrado em `main` e enviado a `origin/main`.
A Vercel publicou o deployment `dpl_7JVd4pcC61vBLefL1N8KjYiZuf1W` com estado
`Ready`. Smoke externo pós-deploy confirmou `/data-hub` com HTTP 200 e headers
de rota privada (`private, no-store`, `noindex`, `no-referrer`); a chamada sem
sessão a `/api/data-hub/catalog` respondeu 401 `sem_sessao`, preservando o gate.

**Próximo gate operacional:** validar o fluxo autenticado do Data Hub com conta
real, sem assumir sucesso por causa do smoke público. Primeiro faça leitura do
catálogo e das extrações existentes; depois valide criação/edição e o contrato
`selectedFields`. Executar uma extração real (`POST .../run`) ou produzir saída
real no destino é efeito operacional e deve ser tratado separadamente, com GO
explícito antes da mutação. Não reintroduza `entityLevel` como escolha de UX.

---

## 14. Documento do cliente enxuto e botão de PDF (2026-09-01)

**Decisão do PO, no dia do primeiro envio real pós-RA5:** *"A versão pro cliente
não deve ter qualidade e origem de dados e nem oportunidade e próximos passos;
pra ter isso precisamos melhorar demais ainda, então vamos retirar esse mês pra
poder mandar pros clientes."*

`Oportunidades e próximos passos` (destaques, pontos de atenção, próximos
passos) e `Qualidade e origem dos dados` (as fontes consultadas) deixam de ser
publicadas. A porta é a constante `SECOES_SUSPENSAS_PARA_O_CLIENTE`, em
`src/reports/Esqueleto.tsx`.

⚠️ **Nada foi apagado do snapshot.** `leitura.destaques`, `leitura.atencao`,
`leitura.proximosPassos` e `fontes` continuam gravados, na auditoria e no
contexto analítico. A decisão é sobre **publicar**, não sobre coletar — quem
"limpar" o snapshot quebra auditoria e a análise assistida. O código das duas
seções continua no arquivo porque a decisão é *"ainda não"*, não *"nunca"*:
voltar é virar a constante.

⚠️ **Vale igualmente na revisão do painel, de propósito.** Quem aprova está
aprovando o que o cliente vai receber; mostrar ao revisor uma seção que não
será entregue tornaria a revisão a leitura de outro documento. A qualidade das
fontes continua disponível ao revisor pelos sinais e pelo contexto factual da
faixa de revisão.

A numeração das seções é posicional, então ela se refez sozinha — a regressão
prova que não ficou buraco.

**O botão "Exportar PDF" passou a existir.** A documentação falava em "PDF"
desde a RA5 e **nunca houve botão**: o PDF sempre foi a impressão desta mesma
página (`@media print` em `report.css`), alcançável só por Ctrl+P. A capacidade
existia; o acesso, não. `window.print()` reusa as regras de impressão que já
tiram a revisão interna do documento do cliente.

⚠️ **O próprio botão entra na lista de `@media print`**, senão sairia desenhado
dentro do PDF.

**Provas:** `npm run verifica:cliente-enxuto` (novo, no `prebuild`) exige a
ausência das duas seções, a presença do dado no snapshot, a numeração sem
buraco, a presença do botão e o sumiço dele na impressão — com prova negativa
de que a varredura do CSS não dá positivo para qualquer coisa. Três mutações
aplicadas uma a uma, todas pegas. Os 12 verificadores existentes do relatório e
do painel passam; `npm run build` completo verde.

---

## 15. O PDF passou a refletir o relatório (2026-09-01)

O PO imprimiu o primeiro PDF e reprovou: *"não reflete o relatório, ficou meio
incompleto e estranho, deveria ser uma versão, pode até ser diferente mas que
reflita o relatório"*. **Quatro causas somadas**, todas medidas na página real
de produção, não deduzidas:

1. **Os cinco `<details>` de dados dos gráficos nascem FECHADOS**, e a regra de
   impressão escondia `.dc-grafico__dados:not([open])`. Cada seção de gráfico
   ia ao papel **sem número nenhum**.
2. **O SVG do Recharts não se remede na repaginação.** Medido no relatório
   real: 110px de largura, um deles com 22px. O que sobrava na seção era um
   desenho torto.
3. **Rolagem lateral não existe no papel.** `.dc-grafico__dados-rolagem` ocupava
   643px dentro de uma faixa de 110px, e `.dc-campanhas` também transbordava —
   na tela é uma barra de rolagem, impresso é número cortado sem aviso.
4. **Não havia `@page`**, então a margem era a que cada navegador quisesse.

**A correção segue o que o PO autorizou — "pode ser diferente, mas que
reflita":** no papel, **o gráfico sai e a tabela dele entra**. A tabela tem
exatamente os mesmos números, imprime de forma determinística e não depende de
medição; a leitura em texto (`.dc-grafico__leitura`) continua, então a seção
mantém o que o desenho contava. É a mesma escolha que o glossário e as notas já
faziam — **só o gráfico tinha ficado de fora**.

⚠️ **Forçar `display` no FILHO é o que faz o conteúdo de um `<details>` fechado
aparecer**; o navegador o esconde por dentro e a marca `open` não é alcançável
por CSS.

**Duas armadilhas de teste apareceram nesta rodada e valem mais que a correção:**

- **A varredura do CSS achava zero blocos e toda asserção de ausência passava
  por vacuidade.** A causa era casar `
\}` num arquivo gravado com CRLF. Hoje
  a varredura é `[
]+` e há uma asserção explícita de que ela achou algo.
- **O comentário que documenta uma regra entrava na captura do seletor dela.**
  Os comentários agora saem antes do parse. Este repositório já tinha registrado
  essa armadilha em outra trava, e ela custou uma rodada assim mesmo.

**Provas:** `npm run verifica:cliente-enxuto` fixa o contrato de impressão
(gráfico oculto, tabela forçada visível, sumário oculto, overflow aberto,
`@page` presente) com prova negativa contra a regra que causava o defeito.
**Cinco mutações aplicadas uma a uma, todas pegas.** Os 13 verificadores do
relatório e do painel passam; `npm run build` completo verde.

