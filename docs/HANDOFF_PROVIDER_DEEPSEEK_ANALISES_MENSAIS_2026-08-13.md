# Handoff — provider das análises mensais: Flash, Pro e Sonnet

**Frente:** paralela à RA3; não é uma fase RA3.
**Branch do painel:** `codex/ra-deepseek-provider`
**Base coordenada:** fechamento documental RA3 `afba341`
**Commit funcional inicial:** `d18b468`
**Commit funcional atual:** `04299ee`
**Produção:** intocada; branch local está 1 commit à frente do remoto e não foi pushada nesta retomada.

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

O modo selecionado vai no pedido apenas em ações de geração, é validado por whitelist no servidor e fica incorporado ao campo auditável `modelo` como `modo/provider/modelo`. Sugestões antigas no formato `provider/modelo` continuam legíveis na UI.

`MONTHLY_REPORT_ANALYSIS_PRIMARY_PROVIDER=sonnet` continua sendo rollback operacional do modo automático para Sonnet. `MONTHLY_REPORT_ANALYSIS_PROVIDER_ORDER` permite mudar a cadeia automática sem condicional por cliente.

## DeepSeek

Os dois modelos usam Chat Completions com thinking habilitado e `reasoning_effort=high`. O conteúdo útil vem somente de `message.content`; `reasoning_content` nunca é persistido nem logado.

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

- `npm.cmd run verifica:analise`: verde após migração das regressões RA2/RA3 para Flash/Pro; cobre cadeia automática, uma condensação por modelo, modos manuais sem fallback, parser incompleto, timeout, falha tripla e auditoria `modo/provider/modelo`;
- `npm.cmd run verifica:revisao`: verde;
- `npm.cmd run build`: verde após correção de um fechamento JSX incompleto deixado pela sessão interrompida;
- `npm.cmd run lint`: retorna somente as seis falhas React herdadas já documentadas no baseline RA3; zero erro em arquivo desta frente;
- `git diff --check`: verde antes do commit funcional;
- revisão de segurança manual: auth existente permanece antes da leitura/modelo; `modo` é whitelistado server-side; segredos seguem server-side; nenhuma rota pública ganhou provider/contexto/sugestão; telemetria não contém payload.

A skill externa de Security Guidance não estava instalada/exposta no Bridge durante esta retomada (`count: 0`), portanto o gate foi executado manualmente e deve ser repetido com a ferramenta se ela voltar a estar disponível antes de publicação.

## Gates ainda abertos

- configurar os envs novos somente no escopo Preview autorizado;
- push da branch e Preview `READY` — não realizado nesta retomada;
- uma chamada Flash real completa em Karyne e uma em relatório não-Karyne/contexto maior;
- uma comparação controlada Flash × Pro × Sonnet usando os modos explícitos e a mesma rubrica humana;
- fallback automático controlado em Preview;
- read-back das sugestões com `modelo` correto, sem aplicação/aprovação/recusa/envio;
- smoke desktop e 390×844;
- repetir Security Guidance se a ferramenta estiver disponível;
- nenhuma replicação de env, merge ou deploy de produção sem novo GO.

O redirect OAuth do Preview que bloqueou o smoke RA3 continua dependência separada e não será contornado. Voicebox/áudio está fora desta frente.
