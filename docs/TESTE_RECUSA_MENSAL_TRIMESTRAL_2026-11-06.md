# Teste local da recusa mensal e trimestral

## Escopo e revisão

Etapa pequena autorizada pelo PO em 06/11/2026, após a atualização local da fábrica. Cópia gerenciada em `C:/Users/Flávio Corá/.codex/worktrees/trimestral-recusa-local/trimestral-validacao-20261106`, branch `codex/trimestral-recusa-falha-local-20261106`, base `b5f61c254bfbed8118aa9f413302d5e12765a786`. Originais e cópia de validação anteriores preservados.

Esta etapa acrescenta cenários no verificador existente. `api/`, `src/`, manifesto e lockfile permanecem idênticos à base. O teste chama o endpoint real com autenticação, HTTP e banco inteiramente dublados. Nenhuma conexão real é feita pelo fetch do teste. Não houve decisão em relatório real, envio, push, PR, deploy ou operação na VPS.

## Prova obtida

| Cenário | Resposta | Chamada de decisão no dublê |
|---|---|---|
| Mensal, causa automática válida e consulta normal | 200, gravado true e read-back validado | Uma |
| Mensal, HTTP 503 apenas na consulta adicional de identidade | 502, decisao_indisponivel, gravado false | Zero |
| Mensal, erro de rede apenas nessa consulta | 502, decisao_indisponivel, gravado false | Zero |
| Trimestral com causa automática | 409, recusa_trimestral_somente_manual | Zero |
| Trimestral com causa manual válida | 200, gravado true, roteamento manual e read-back validado | Uma |

O dublê da RPC continua respondendo normalmente nas duas falhas isoladas. Os cenários positivos exercitam a mesma resposta da RPC e provam a continuidade até a conferência de volta. A condição de falha ocorre somente no GET de `relatorios` que seleciona `cliente_slug`, antes da decisão. As proteções de sessão, checksum, motivo, causas estruturadas e read-back continuam cobertas pelo verificador existente.

## Conclusão e menor próximo escopo

A dependência adicional confirmada em `api/painel-decisao.ts`, `recusaTrimestralSemCausaManual`, pode interromper também a recusa de um mensal, mesmo com a RPC disponível. O endpoint falha fechado e informa que a decisão não foi registrada. Isso confirma a ressalva de disponibilidade, sem provar perda de dados ou gravação parcial.

Os dois cenários de falha são diagnóstico do comportamento atual. Sua passagem não representa correção nem aprovação dessa dependência como requisito definitivo. Ao corrigir, atualizar as expectativas para o caminho seguro escolhido, mantendo as provas negativas de que identidade indisponível não libera uma correção automática trimestral.

A próxima etapa é corrigir localmente o caminho compartilhado preservando a identificação confiável do produto e a recusa exclusivamente manual do trimestral. Não usar identidade enviada pelo navegador nem simplesmente ignorar uma leitura indisponível. Uma causa manual já garante o roteamento seguro independentemente do produto, o que permite avaliar a remoção dessa consulta nesse caminho. A recusa automática exige verificar o contrato do banco antes de escolher a solução. Mudança operacional depende de GO específico, pedido separadamente ao PO nesta sessão.

## Verificações e limpeza

- Node 24.8.0 e npm 11.6.0. Dependências próprias por `npm ci --ignore-scripts`, sem junção. Manifesto e lockfile inalterados.
- `npm run verifica:decisao` passou com os cenários novos e os anteriores.
- `npm run verifica:trimestral` passou com dados sintéticos, incluindo privacidade, página, fila, análises e PDF.
- `npm run lint` passou.
- As prévias sintéticas geradas pelo verificador são descartáveis e serão removidas ao encerrar, após esta consolidação. A worktree permanece como destino dos testes e da continuação local ainda não publicada.

Nenhuma verificação visual, autenticada ou operacional em produção foi declarada nesta etapa. Os bloqueios de piloto e ativação continuam no plano da fábrica.
