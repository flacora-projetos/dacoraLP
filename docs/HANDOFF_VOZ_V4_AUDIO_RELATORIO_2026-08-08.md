# Handoff — V4: áudio no relatório web

**Repositório:** `dacoraLP`
**Branch de origem:** `codex/voz-v4-audio-relatorio`
**Integração:** merge `7591452` na `main`
**Estado:** capacidade do portal integrada, publicada e verificada em produção em 2026-08-09; nenhum relatório ou cliente foi ativado.

## O que esta fase entrega

O catálogo de relatórios ganhou um bloco genérico `AUDIO`. Ele é escolhido
pela montagem como qualquer outro bloco e não conhece cliente, carteira ou tipo
de relatório.

Quando o áudio está disponível, a página mostra controles nativos e acessíveis,
sem reprodução automática e com carregamento inicial limitado a metadados. A
página diz explicitamente que a leitura falada é complementar e que o texto
continua sendo a versão conferível do relatório.

Quando a montagem oferece áudio, mas a leitura não está disponível, o bloco
mostra o motivo em tom neutro e preserva o texto integral. Quando a montagem
aponta para um id que não existe, o catálogo declara erro de montagem; não
renderiza player vazio. Quando o cliente não oferece áudio, o bloco simplesmente
não entra na montagem.

## Contrato que a fábrica deve produzir

A montagem recebe uma entrada como esta:

```json
{
  "bloco": "AUDIO",
  "id": "ouvir-relatorio",
  "titulo": "Ouvir este relatório",
  "apoio": "Leitura em áudio do mesmo conteúdo apresentado nesta página.",
  "audio": "leitura_completa"
}
```

O registro disponível correspondente vive em `dados.audios`:

```json
{
  "leitura_completa": {
    "id": "leitura_completa",
    "estado": "disponivel",
    "src": "storage://relatorios-audios/cliente_slug/2026-07/v1/0123456789abcdef0123456789abcdef.ogg",
    "mimeType": "audio/ogg"
  }
}
```

Se a geração falhar ou não existir para aquela versão, a fábrica preserva o
bloco e envia o estado honesto:

```json
{
  "leitura_completa": {
    "id": "leitura_completa",
    "estado": "indisponivel",
    "motivo": "A leitura em áudio ainda não foi gerada para esta versão."
  }
}
```

O áudio deve ser gerado do texto determinístico do próprio relatório. Ele nunca
substitui esse texto e nunca recebe prosa paralela criada especialmente para a
voz. O arquivo precisa ser imutável e o nome final deve conter um digest
hexadecimal de 20 a 64 caracteres.

## Armazenamento e acesso

O snapshot persiste somente uma URI estável no formato:

```text
storage://relatorios-audios/<clienteSlug>/<AAAA-MM>/v<versão>/<digest>.<extensão>
```

Extensões aceitas pelo portal: `mp3`, `ogg`, `m4a`, `wav` e `webm`.
`versão` é o inteiro positivo da coluna `relatorios.versao`; não vem de
`conteudo.identidade` e não pode ser autocertificado pelo snapshot.

Na API autenticada do painel, `resolverAudiosPrivados` cria uma cópia do
snapshot, confirma cliente, competência e versão contra as colunas da linha e
troca a URI por uma URL assinada de uma hora. O snapshot persistido e o checksum
não mudam. Caminho de outro cliente ou versão, URL pronta no snapshot,
assinatura ausente ou falha do Storage viram estado `indisponivel`, nunca URL
quebrada nem vazamento silencioso.

Todo registro de `dados.audios` é normalizado antes de a resposta sair. Estado
desconhecido, MIME incompatível com a extensão, duração inválida e registro
`indisponivel` com campos de reprodução perdem `src`, `mimeType` e
`duracaoSegundos`. O componente repete a validação no navegador e só cria o
player para contrato estritamente válido.

O bucket esperado se chama `relatorios-audios`. Esta entrega não cria bucket,
política ou objeto remoto: banco e Storage continuam sob gate separado.

## Arquivos principais

- `src/reports/blocos/tipos.ts` — contrato `BlocoAudio` e `AudioRelatorio`;
- `src/reports/blocos/BlocoAudioRelatorio.tsx` — estados disponível e indisponível;
- `src/reports/blocos/catalogo.tsx` — resolução do bloco por configuração;
- `api/_audios-relatorio.ts` — validação e assinatura server-side;
- `api/painel-relatorio.ts` — aplica a assinatura antes de devolver a revisão;
- `src/reports/report.css` — apresentação responsiva e impressão sem controle morto;
- `scripts/verifica-painel-revisao.mts` — regressões de interface e isolamento.

## Evidência local

- `npm run verifica:painel`: passou;
- `npm run verifica:fila`: passou;
- `npm run verifica:refoco`: passou;
- `npm run verifica:revisao`: passou, incluindo player, ausência,
  indisponibilidade, ausência de autoplay, sanitização de contrato, assinatura,
  recusa cruzada e uso autoritativo da versão da linha no endpoint;
- `npm run build`: passou, incluindo SSR, pré-renderização e sitemap;
- `npm run lint`: permanece nas mesmas seis falhas TypeScript da base; nenhuma
  falha nova veio da V4.

Não houve smoke em navegador real porque nenhuma fixture pública pode conter
URL assinada duradoura e este checkout não usa credencial para fabricar uma
durante a demonstração. A estrutura renderizada e o CSS foram exercitados pela
regressão SSR; reprodução real depende do primeiro objeto de teste no bucket.

## Evidência de produção — 2026-08-09

- merge `7591452` enviado à `main`;
- Vercel marcou o deployment de produção como `success`;
- deployment imutável: `dacora-8o2e8lsiu-flavio-coras-projects.vercel.app`;
- deployment e domínio `www.dacora.com.br`: HTTP 200 na raiz;
- API `/api/painel-relatorio` sem sessão: HTTP 401 nos dois endereços, preservando acesso fechado;
- `npm run verifica:revisao` e build completo passaram novamente já no tronco.

## Gates que continuam fechados

1. A fábrica também foi integrada à `master` do `OpenClaw-Dacora`; falta provar
   o primeiro objeto somente depois da criação governada do Storage.
2. O bucket privado `relatorios-audios` ainda não foi criado nem validado.
3. O portal ainda não tem a rota externa W3 por token. A V4 funciona hoje na
   revisão autenticada; quando a W3 existir, ela deve reaproveitar o mesmo
   resolvedor depois de validar o token do relatório.
4. Nenhum relatório real foi alterado, nenhum snapshot foi carregado e nenhum
   banco ou objeto de Storage foi tocado.
5. Primeiro objeto sintético, reprodução autenticada e opt-in nominal continuam
   sob gates próprios.
