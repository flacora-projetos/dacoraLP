# Handoff — V4: áudio no relatório web

**Repositório:** `dacoraLP`
**Branch de origem:** `codex/voz-v4-audio-relatorio`
**Integração:** merge `7591452` na `main`
**Estado:** capacidade base integrada e publicada em 2026-08-09; o botão destacado pedido depois pelo PO está implementado e validado somente nesta branch local, sem novo merge, push ou deploy. Nenhum relatório ou cliente foi ativado.

## O que esta fase entrega

O catálogo de relatórios ganhou um bloco genérico `AUDIO`. Ele é escolhido
pela montagem como qualquer outro bloco e não conhece cliente, carteira ou tipo
de relatório.

Quando o áudio está disponível, a página mostra o botão destacado **“Ouvir a versão falada”** e preserva os controles nativos e acessíveis,
sem reprodução automática e com carregamento inicial limitado a metadados. O botão alterna reprodução e pausa, com estado exposto por `aria-controls` e `aria-pressed`. A
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
  "titulo": "Ouvir a versão falada",
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

O bucket esperado se chama `relatorios-audios`. Ele foi criado e validado em
2026-08-09 como privado, limitado a 25 MiB e somente `audio/ogg`. O smoke
operacional preserva um único objeto e uma única linha exclusivamente
sintéticos; nenhum relatório de cliente foi alterado.

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

O primeiro smoke em navegador real foi concluído depois da criação governada
do objeto sintético. A URI permaneceu privada no snapshot e foi resolvida pela
API autenticada para uma assinatura curta; nenhuma fixture ou URL assinada foi
commitada.

Depois da ressalva do PO, `npm run verifica:revisao` e o build completo passaram novamente com o botão destacado, alternância de reprodução/pausa e os controles nativos preservados. Essa segunda validação é local e não muda a evidência de produção abaixo.

## Evidência de produção — 2026-08-09

- merge `7591452` enviado à `main`;
- Vercel marcou o deployment de produção como `success`;
- deployment imutável: `dacora-8o2e8lsiu-flavio-coras-projects.vercel.app`;
- deployment e domínio `www.dacora.com.br`: HTTP 200 na raiz;
- API `/api/painel-relatorio` sem sessão: HTTP 401 nos dois endereços, preservando acesso fechado;
- `npm run verifica:revisao` e build completo passaram novamente já no tronco.
- bucket `relatorios-audios`: `public: false`, limite 25 MiB e MIME
  `audio/ogg`; acesso anônimo/público ao objeto recusado, listagem anônima vazia;
- relatório sintético v2 `ce4ec080-9137-42d5-a9b0-ba71471ed5fc`, sem dado de
  cliente, com um único objeto de 139.381 bytes e assinatura `OggS`;
- revisão autenticada em Chrome desktop e 390 × 844: controles presentes,
  `autoplay: false`, 0:00, `readyState: 4`, duração 34,7565 s, sem erro e sem
  overflow horizontal;
- a v1 sintética que revelou erro de codificação do shell foi removida com seu
  objeto após o read-back da v2. A v2 permanece isolada para inspeção do PO.

## Gates que continuam fechados

1. O portal ainda não tem a rota externa W3 por token. A V4 funciona hoje na
   revisão autenticada; quando a W3 existir, ela deve reaproveitar o mesmo
   resolvedor depois de validar o token do relatório.
2. O botão destacado desta branch ainda precisa de autorização específica para merge/deploy.
3. A v3 sintética com a voz autorizada da Fernanda ainda não existe; produção continua servindo somente a v2 sintética anterior.
4. Nenhum relatório real foi alterado e nenhum cliente foi habilitado.
5. A escolha nominal do primeiro cliente, o primeiro snapshot real e a primeira
   entrega continuam sob gates próprios.
6. A linha e o objeto sintéticos v2 podem ser removidos depois da revisão; o
   bucket privado deve permanecer para a operação futura.
