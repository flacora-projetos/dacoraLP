# Teste local da recusa mensal e trimestral

## Correção vigente, autorizada em 06/11/2026

O PO respondeu **“Autorizar correção local”** ao pedido específico. O diagnóstico anterior está em `f83faa7`. A correção permanece na mesma branch/worktree local. O portal remove a consulta adicional e mantém a RPC transacional e o read-back. A restrição `recusa_trimestral_somente_manual`, preparada na candidata da fábrica em `db/migrations/20261106160000_trimestral_recusa_manual.sql`, exige ordem manual para a chave com sufixo exato `__trimestral`, inclusive se o roteamento fosse nulo.

O vínculo composto já existente entre ordem e relatório impede forjar a chave. A RPC existente calcula o roteamento a partir das causas validadas, e qualquer causa manual torna a ordem inteira manual. O gatilho existente cria a ordem na mesma transação da decisão. A restrição desfaz a transação inteira quando a ordem seria automática. Nenhuma função, permissão, tabela ou privilégio novo foi criado. O portal traduz a violação para o mesmo erro legível HTTP 409.

### Prova de integração

O novo `scripts/verifica-recusa-trimestral-banco.mts` recebe explicitamente a pasta `db/migrations` da candidata da fábrica. Os 35 SQLs versionados são carregados em PGlite em memória. A RPC real roda como `service_role` com BYPASSRLS, conforme o contrato existente, sem `security definer`. Apenas autenticação e transporte HTTP são dublados. A URL de teste é conferida e nenhuma requisição externa é enviada.

| Cenário | Resultado corrigido |
|---|---|
| Mensal automático normal, ou com HTTP 503/erro de rede preparado na consulta removida | 200, zero consultas extras, uma ordem, uma notificação e read-back válido |
| Trimestral automático | 409, gravado false, envelope inteiro idêntico ao anterior, zero ordens/notificações |
| Trimestral manual ou combinação de causas automática e manual | 200, uma ordem manual |
| Alterar ordem trimestral para automatic ou null | Restrição impede |
| Forjar chave mensal na ordem trimestral | Chave estrangeira composta recusa |
| Chave terminando em __trimestral_extra | Não é confundida com trimestral |

Mutação local da regra para permitir tudo fez o trimestral automático retornar 200 onde a prova exige 409. O teste reprovou, e o arquivo SQL foi restaurado byte a byte antes da rodada final.

Comando executado na raiz da candidata do portal.

```powershell
npm run verifica:recusa-trimestral-banco -- 'C:/Users/Flávio Corá/.codex/worktrees/trimestral-atualizacao-local/OpenClaw-Dacora/db/migrations'
```

Passaram o teste SQL, `verifica:decisao`, `verifica:trimestral`, `lint` e o build integral, incluindo prebuild, prerenderização e empacotamento do servidor. PGlite já estava no manifesto/lockfile, sem dependência nova. O manifesto acrescenta apenas o comando de integração. Os verificadores com dublês foram atualizados para a tradução da restrição, mas a prova de segurança também roda no SQL real em memória.

### Publicação futura e rollback

**Aplicar e conferir a restrição no Dácora Reports antes de publicar este portal**, com GO operacional específico. Publicar a remoção da consulta sem a regra permitiria criar uma ordem trimestral automática por chamada direta. O SQL está na candidata da fábrica, por isso os dois PRs precisam ser revisados em conjunto. Aplicar esse SQL revisado é um passo separado antes da publicação do portal, mesmo antes de integrar o restante da fábrica.

Depois da aplicação autorizada, conferir nome, expressão e validação da restrição. Só então publicar o portal e depois a fábrica com rotinas trimestrais desligadas. Rollback futuro começa pelo portal anterior, com a consulta protetora, preservando a restrição no banco. Não retirar essa proteção enquanto houver portal novo em execução.

Nada foi aplicado remotamente. Sem push, PR, deploy, VPS, .env, relatório real, mensagem ou Drive. Prévias/builds próprios serão removidos ao encerrar. A worktree fica como destino da candidata não publicada, com suas dependências para continuação, até integração ou arquivamento autorizado.

## Diagnóstico anterior, preservado como evidência de f83faa7

O texto abaixo registra a etapa anterior à autorização de correção e não descreve o código corrigido.

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
