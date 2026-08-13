# Handoff — DeepSeek primário nas análises mensais

**Frente:** paralela à RA3; não é uma fase RA3.  
**Branch do painel:** `codex/ra-deepseek-provider`  
**Base coordenada:** `afba341` (código RA3 funcional em `97505f1`)  
**Commit funcional inicial:** `d18b468`  
**Produção:** intocada.

## Contrato implementado

Introdução e análises por seção usam `api/_painel-analise-provider.ts`. A ordem normal é DeepSeek e, somente após falha técnica ou saída não aplicável, Claude Sonnet. `MONTHLY_REPORT_ANALYSIS_PRIMARY_PROVIDER=sonnet` faz o rollback operacional para Sonnet sem mudança de código; como variáveis Vercel são materializadas por deployment, a reversão exige redeploy do mesmo código.

DeepSeek recebe `max_tokens=16384`, thinking habilitado e `reasoning_effort=high`. O limite é 10,24 vezes o teto de 1.600 que causou o incidente real da introdução e 4,096 vezes o teto RA3 de 4.000, ainda muito abaixo da capacidade oficial do modelo. Sonnet permanece com `max_tokens=4000`. As duas funções Vercel têm `maxDuration=180`; cada chamada de provider termina em até 50 segundos.

Fallback Sonnet ocorre apenas nestes casos:

- credencial/modelo DeepSeek indisponível;
- timeout, erro de rede, JSON/envelope inválido ou HTTP não-2xx;
- conteúdo vazio;
- `finish_reason` diferente de `stop`, inclusive `content_filter`, `tool_calls`, `insufficient_system_resource` ou valor desconhecido;
- resposta com `stop` que não satisfaz o parser completo da operação.

Quando DeepSeek retorna `finish_reason=length`, existe exatamente uma segunda tentativa desde o início, com instrução de condensação. Se ela não termina completa, o fluxo chama Sonnet. Não há loop. Sonnet só é aceito com `stop_reason=end_turn`, texto não vazio e parser completo. Qualidade editorial subjetiva nunca aciona fallback.

Nenhum texto parcial chega à RPC. Para RA3, o lote só persiste se contiver exatamente todas as seções-alvo; a RPC continua transacional. O campo privado obrigatório `relatorio_analise_sugestoes.modelo` recebe `deepseek/deepseek-v4-pro` ou `sonnet/<modelo>`, sem fingir que Sonnet respondeu.

## Telemetria segura

Cada tentativa registra somente operação, número da tentativa, provider, modelo, `finish_reason`, latência, contagens de tokens quando presentes, status HTTP e motivo tipado do fallback. O evento final registra provider/modelo efetivos. Prompt, relatório, resposta, `reasoning_content`, chave e `service_role` nunca entram no log.

## Configuração Vercel

Nomes previstos exclusivamente no Preview da branch:

- `MONTHLY_REPORT_ANALYSIS_DEEPSEEK_API_KEY`
- `MONTHLY_REPORT_ANALYSIS_PRIMARY_PROVIDER`
- `MONTHLY_REPORT_ANALYSIS_DEEPSEEK_MODEL`
- `MONTHLY_REPORT_ANALYSIS_DEEPSEEK_MAX_TOKENS`
- `MONTHLY_REPORT_ANALYSIS_SONNET_MAX_TOKENS`
- `MONTHLY_REPORT_ANALYSIS_PROVIDER_TIMEOUT_MS`

`ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL_RA2` e `ANTHROPIC_MODEL_RA3` continuam preservadas e são a fonte do fallback. Nenhuma variável `AI_PROVIDER` do OpenClaw é lida.

## Banco

Não existe migration desta frente. Read-back remoto em `Dácora Reports` confirmou `secao`, `modelo` e `prompt_versao` como `NOT NULL`; RLS está ligada; `anon` e `authenticated` não têm `SELECT`; `service_role` tem a leitura server-side já governada. Criar coluna nova ou relaxar grants seria duplicação e ampliação de superfície sem necessidade.

## Verificações atuais

- `npm.cmd run verifica:analise`: verde; cobre DeepSeek completo, contexto grande, `length`, condensação limitada, HTTP, timeout, vazio, `finish_reason`, fallback Sonnet, rollback, falha dupla, lote RA3 completo e nenhuma persistência parcial.
- `npm.cmd run build`: verde fora da restrição de leitura do sandbox; pré-build, cliente, SSR, prerender, sitemap e bundle do servidor concluídos.
- `npm.cmd run lint`: seis falhas herdadas em componentes React. O mesmo comando no HEAD limpo RA3 reproduz exatamente as seis; nenhum erro aponta para arquivo desta frente.
- revisão de segurança manual: auth continua antes de leitura/modelo; segredos permanecem server-side; nenhuma rota pública ganhou provider, contexto ou sugestão; logs do adapter não contêm payload.

## Gates ainda abertos

- salvar as seis variáveis no escopo Preview da branch e confirmar apenas nome/escopo;
- push normal para gerar Preview e conferir deployment `READY`;
- uma chamada DeepSeek real completa para Karyne e uma para relatório não-Karyne/contexto maior;
- fallback Sonnet controlado em Preview;
- read-back das sugestões como revisáveis, com `modelo` correto, sem aplicação/aprovação/recusa/envio;
- smoke desktop e 390×844. O redirect OAuth do Supabase para o Site URL de produção é bloqueio RA3 separado e não será contornado;
- nenhuma replicação de env ou deploy de produção sem novo GO.
