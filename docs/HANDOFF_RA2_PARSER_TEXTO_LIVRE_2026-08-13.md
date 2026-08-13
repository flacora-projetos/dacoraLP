# Handoff — RA2: texto livre do provider

**Estado:** correção local na branch `codex/ra2-texto-livre-provider`, criada de
`dacoraLP/main/c5e6407`. A produção recusou a chamada autenticada do relatório
`9918bac9-6686-49e4-b1e6-3d6a5225a722` com HTTP 422 `saida_invalida`; não houve
aprovação, recusa, solicitação de envio, envio, merge, push ou deploy nesta
correção.

## Problema confirmado

O endpoint publicado ainda instruía Sonnet a responder JSON estrito, extraía
apenas o primeiro bloco `text` e descartava a proposta se o JSON não fosse
aplicável ou se passasse de 3.500 caracteres. Isso transformava conteúdo
editorial útil em erro técnico, apesar de a revisão humana já ser o gate.

## Correção entregue localmente

- o prompt pede texto puro, pronto para comparação humana;
- JSON permanece uma compatibilidade opcional: `{"texto":"..."}` válido é
  extraído, mas markdown, chaves, cercas ou JSON imperfeito caem no texto bruto;
- todos os blocos textuais não vazios do provider são preservados, na ordem;
- geração e edição não têm mais veto editorial de 3.500 caracteres; resposta
  realmente vazia continua inválida;
- autenticação, allowlist, leitura server-side por service role, estado/checksum,
  RPC de auditoria e os fluxos aplicar/editar/desfazer permanecem inalterados.

## Regressões e verificação

- `npm.cmd run verifica:analise` passou, cobrindo texto puro, múltiplos blocos,
  markdown/chaves, JSON válido, JSON imperfeito, texto acima de 3.500 caracteres,
  vazio real, autenticação, checksum e persistência editorial.
- `npm.cmd run verifica:revisao` passou.
- `npm.cmd run build` passou, incluindo prebuild, SSR, prerender e sitemap.
- `npm.cmd run lint` mantém seis erros TypeScript preexistentes fora de RA2;
  nenhum erro novo surgiu no endpoint, parser ou componente alterado.

## Revisão de segurança manual

Security Guidance não estava exposto nesta sessão. A revisão manual confirmou
que a alteração não amplia o corpo aceito do navegador nem envia segredo ou
contexto do cliente pelo browser: autenticação e allowlist continuam antes da
leitura, service role e chave Anthropic continuam somente no handler, e o modelo
recebe exclusivamente o contexto reconstruído no servidor. A mudança remove
somente filtros editoriais que descartavam texto útil; checksum/estado e
auditoria continuam protegendo a revisão.

## Próximo gate

Revisar o diff, registrar a atualização no índice canônico da fábrica e obter
GO específico para integrar/publicar. Depois, repetir o teste autenticado em
desktop e celular sem aprovar, recusar ou enviar relatório real. RA3 permanece
bloqueada.
