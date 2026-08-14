# Handoff — provider das análises mensais: Flash, Pro e Sonnet

**Frente:** paralela à RA3; não é uma fase RA3.
**Branch original do provider:** `codex/ra-deepseek-provider`
**Branch do refino atual:** `codex/ra-contexto-formatacao`
**Base do refino atual:** `main/b174a3b`
**Produção no início desta rodada:** `main/b174a3b`, com Flash/Pro/Sonnet e UX RA já publicados.
**Escopo desta rodada:** contexto persistido em introdução + seções, concisão/formatação e redução da latência DeepSeek editorial.

## Contrato implementado

Introdução e análises por seção usam `api/_painel-analise-provider.ts`.

No modo padrão `automatico`, a ordem é:

1. DeepSeek V4 Flash;
2. DeepSeek V4 Pro, apenas se o Flash falhar tecnicamente ou entregar saída não aplicável;
3. Claude Sonnet, apenas se os dois DeepSeek falharem tecnicamente ou entregarem saída não aplicável.

A tela de revisão também oferece modos explícitos para benchmark humano:

- `deepseek_flash`: somente Flash, sem fallback;
- `deepseek_pro`: somente Pro, sem fallback;
- `sonnet`: somente Sonnet, sem fallback;
- `automatico`: Flash → Pro → Sonnet.

O modo selecionado vai no pedido apenas em ações de geração, é validado por whitelist no servidor e fica incorporado ao campo auditável `modelo` como `modo/provider/modelo`. Sugestões antigas no formato `provider/modelo` continuam legíveis na UI. **Trocar de modelo não altera nem apaga o Contexto do mês**: cada geração relê o texto persistido no servidor usando `relatorio_id + checksum`.

`MONTHLY_REPORT_ANALYSIS_PRIMARY_PROVIDER=sonnet` continua sendo rollback operacional do modo automático para Sonnet. `MONTHLY_REPORT_ANALYSIS_PROVIDER_ORDER` permite mudar a cadeia automática sem condicional por cliente.

## DeepSeek

Os dois modelos usam Chat Completions em **modo não-pensante** (`thinking.type=disabled`) para esta tarefa editorial. O teste real do PO com Dr. Lucas mostrou latência excessiva no V4 Pro; a inspeção do provider encontrou `thinking` habilitado por padrão no código, `reasoning_effort=high`, teto de saída amplo e timeout de 50 s. A documentação oficial do DeepSeek confirma que Flash e Pro suportam os modos thinking/non-thinking e descreve o Flash como a variante de resposta mais rápida. Como a tarefa é redação editorial sobre fatos já calculados — não raciocínio aberto nem uso de tools — o provider passou a desligar thinking tanto no Flash quanto no Pro. O teto de saída amplo permanece como proteção contra truncamento; não foi introduzido limite de caracteres.

O conteúdo útil continua vindo somente de `message.content`; `reasoning_content` nunca é persistido nem logado.

Configuração separada:

- `MONTHLY_REPORT_ANALYSIS_DEEPSEEK_FLASH_MODEL`
- `MONTHLY_REPORT_ANALYSIS_DEEPSEEK_FLASH_MAX_TOKENS`
- `MONTHLY_REPORT_ANALYSIS_DEEPSEEK_PRO_MODEL`
- `MONTHLY_REPORT_ANALYSIS_DEEPSEEK_PRO_MAX_TOKENS`

IDs previstos pela API oficial em 2026-08-13:

- `deepseek-v4-flash`;
- `deepseek-v4-pro`.

O teto padrão local permanece em 16.384 tokens por modelo. Quando um DeepSeek termina com `finish_reason=length`, aquele modelo recebe exatamente uma segunda tentativa desde o início com instrução de condensação. Não há loop. Se a segunda tentativa também truncar, a cadeia segue para a próxima etapa configurada.

## Sonnet

Sonnet continua configurado por `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL_RA2` e `ANTHROPIC_MODEL_RA3`, com teto padrão de 4.000 tokens. Em modo explícito `sonnet`, nenhum DeepSeek é tentado.

## Contexto do mês e causa da perda observada

A causa encontrada não era troca de modelo. A rota RA3 das **seções** já relia `relatorio_contextos_mes` no servidor antes de montar o prompt, mas a rota RA2 da **introdução** chamava `contextoDoSnapshot()` diretamente e nunca consultava essa tabela. Por isso um contexto salvo podia aparecer corretamente nas análises das seções e ser ignorado por **Melhorar análise**, independentemente de usar Pro, Flash ou Sonnet.

A correção unifica o contrato: a introdução agora relê o mesmo contexto persistido no servidor no momento da geração, incorpora `contextoDoMes` ao objeto enviado ao provider e calcula o hash de auditoria sobre esse mesmo objeto. Conteúdo `contexto` enviado pelo navegador continua ignorado. A UI deixa o contexto salvo em modo de leitura e oferece **Editar contexto**; Cancelar restaura o valor persistido e Salvar volta ao estado de leitura.

## Concisão e apresentação editorial

Os prompts de introdução e seções agora pedem seleção editorial, não corte mecânico. A introdução prioriza somente dois ou três achados; cada seção busca a conclusão mais útil em uma ou duas frases curtas, sem lista, sem repetir a tabela e sem encadear observações por ponto e vírgula. Não há limite artificial de caracteres.

Para sugestões antigas ou respostas que ainda venham como cadeia `frase; frase; frase`, a UI aplica uma normalização **somente de apresentação**, separando os trechos em parágrafos legíveis sem alterar o texto persistido. Parágrafos já produzidos pelo modelo são preservados.

## Persistência e fallback

Fallback só ocorre no modo automático e apenas por:

- credencial/modelo indisponível;
- timeout, rede, HTTP não-2xx ou envelope inválido;
- conteúdo vazio;
- `finish_reason` diferente de `stop` no DeepSeek;
- parser completo da operação não satisfeito;
- no Sonnet, `stop_reason` diferente de `end_turn`, vazio ou parser incompleto.

Qualidade editorial subjetiva não dispara fallback. O revisor compara, edita, aplica ou desfaz.

Nenhum texto parcial chega à RPC. Para RA3, o lote só persiste se contiver exatamente todas as seções-alvo; a RPC continua transacional.

## Auditoria e telemetria

O campo privado obrigatório `relatorio_analise_sugestoes.modelo` passa a guardar, para novas gerações, por exemplo:

- `automatico/deepseek/deepseek-v4-flash`;
- `automatico/deepseek/deepseek-v4-pro`;
- `automatico/sonnet/<modelo>`;
- `deepseek_flash/deepseek/deepseek-v4-flash`;
- `deepseek_pro/deepseek/deepseek-v4-pro`;
- `sonnet/sonnet/<modelo>`.

A UI mostra qual modo/modelo respondeu. A telemetria registra somente operação, tentativa, modo, provider/modelo, `finish_reason`, latência, contagens de tokens, custo retornado pelo provider quando disponível, status HTTP e motivo tipado do fallback. Prompt, relatório, resposta, `reasoning_content`, chaves e `service_role` não entram no log.

## Envs do recurso

Somente nomes; valores nunca entram no Git ou documentação:

- `MONTHLY_REPORT_ANALYSIS_DEEPSEEK_API_KEY`
- `MONTHLY_REPORT_ANALYSIS_PRIMARY_PROVIDER`
- `MONTHLY_REPORT_ANALYSIS_PROVIDER_ORDER`
- `MONTHLY_REPORT_ANALYSIS_DEEPSEEK_FLASH_MODEL`
- `MONTHLY_REPORT_ANALYSIS_DEEPSEEK_FLASH_MAX_TOKENS`
- `MONTHLY_REPORT_ANALYSIS_DEEPSEEK_PRO_MODEL`
- `MONTHLY_REPORT_ANALYSIS_DEEPSEEK_PRO_MAX_TOKENS`
- `MONTHLY_REPORT_ANALYSIS_SONNET_MAX_TOKENS`
- `MONTHLY_REPORT_ANALYSIS_PROVIDER_TIMEOUT_MS`

A variável antiga única `MONTHLY_REPORT_ANALYSIS_DEEPSEEK_MODEL` não é mais o contrato desta branch. Nenhuma variável `AI_PROVIDER` do OpenClaw é lida.

## Verificações desta retomada

- `npm run verifica:analise`: verde; cobre provider, contexto do mês server-side na introdução e nas seções, rejeição de contexto forjado no browser, edição/cancelamento/novo salvamento do contexto, concisão do prompt, formatação de ponto e vírgula, fallback e auditoria;
- `npm run verifica:revisao`: verde;
- `npm run build`: verde, incluindo `verifica:karyne-conversao`, `verifica:linguagem`, Vite client/SSR, prerender e bundle server;
- `npm run lint`: retorna somente as seis falhas TypeScript herdadas já documentadas no baseline; zero delas está nos arquivos desta entrega;
- `git diff --check`: verde;
- revisão de segurança manual: auth existente permanece antes da leitura/modelo; contexto da introdução e das seções é relido server-side; payload do browser não substitui contexto salvo; `modo` continua whitelistado; segredos seguem server-side; rota pública continua sem contexto interno; telemetria continua sem prompt/resposta/segredo.

A skill externa de Security Guidance não estava instalada/exposta no Bridge durante esta retomada (`count: 0`), portanto o gate foi executado manualmente. Para UX foram consultadas as skills `frontend-design` e `impeccable-design-polish`, preservando a direção Editorial de Performance e restringindo o refino aos controles de análise/contexto.

## Fechamento desta rodada

O PO autorizou explicitamente trabalhar até o fim e publicar em produção. A entrega funcional foi commitada em `992fa56` (`fix RA context and concise analysis UX`), integrada por fast-forward em `main` e enviada para `origin/main`. No estado integrado, `verifica:analise`, `verifica:revisao` e build passaram novamente. Produção respondeu HTTP 200 em `/painel-de-relatorios`; a API de introdução respondeu 401 sem sessão, preservando o gate; e o HTML público passou a servir `assets/index-DcWibYQd.js`, exatamente o bundle JS gerado pelo build integrado. Não houve alteração de env, migration, aprovação/recusa de relatório nem envio a cliente nesta entrega.

O smoke autenticado de uma geração real com V4 Pro não foi repetido automaticamente porque exigiria sessão humana e chamada paga sobre relatório real. A causa técnica da latência foi confirmada no código e alinhada à documentação oficial do DeepSeek; o ganho do novo modo não-pensante deve ser observado no próximo uso humano do Pro. O contrato de contexto, por outro lado, está coberto por regressão server-side: introdução e seções relêem o contexto persistido, e contexto forjado no navegador não substitui o salvo.

O redirect OAuth do Preview que bloqueou o smoke RA3 continua dependência separada e não será contornado. Voicebox/áudio está fora desta frente.
