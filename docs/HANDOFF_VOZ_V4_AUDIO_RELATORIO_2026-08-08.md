# Handoff — V4: áudio no relatório web

**Repositório:** `dacoraLP`  
**Branch:** `codex/voz-v4-audio-relatorio`  
**Base:** `origin/main` em `2fcb9e5`  
**Estado:** capacidade do portal implementada e validada localmente; não integrada e não publicada.

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
    "src": "storage://relatorios-audios/cliente_slug/2026-07/relatorio-id/0123456789abcdef0123456789abcdef.mp3",
    "mimeType": "audio/mpeg",
    "duracaoSegundos": 154
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
storage://relatorios-audios/<clienteSlug>/<AAAA-MM>/<relatorioId>/<digest>.<extensão>
```

Extensões aceitas pelo portal: `mp3`, `ogg`, `m4a`, `wav` e `webm`.

Na API autenticada do painel, `resolverAudiosPrivados` cria uma cópia do
snapshot, confirma cliente e competência no caminho e troca a URI por uma URL
assinada de uma hora. O snapshot persistido e o checksum não mudam. Caminho de
outro cliente, URL pronta no snapshot, assinatura ausente ou falha do Storage
viram estado `indisponivel`, nunca URL quebrada nem vazamento silencioso.

O bucket esperado se chama `relatorios-audios`. Esta branch não cria bucket,
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
  indisponibilidade, ausência de autoplay, assinatura e recusa cruzada;
- `npm run build`: passou, incluindo SSR, pré-renderização e sitemap;
- `npm run lint`: permanece nas mesmas seis falhas TypeScript da base; nenhuma
  falha nova veio da V4.

Não houve smoke em navegador real porque nenhuma fixture pública pode conter
URL assinada duradoura e este checkout não usa credencial para fabricar uma
durante a demonstração. A estrutura renderizada e o CSS foram exercitados pela
regressão SSR; reprodução real depende do primeiro objeto de teste no bucket.

## Gates que continuam fechados

1. A fábrica ainda precisa gerar o arquivo, armazená-lo e preencher o contrato.
2. O bucket privado `relatorios-audios` ainda não foi criado nem validado.
3. O portal ainda não tem a rota externa W3 por token. A V4 funciona hoje na
   revisão autenticada; quando a W3 existir, ela deve reaproveitar o mesmo
   resolvedor depois de validar o token do relatório.
4. Nenhum relatório real foi alterado, nenhum snapshot foi carregado, nenhum
   banco foi tocado e nenhum deploy foi feito.
5. A branch não deve ser enviada ao GitHub sem gate: este projeto cria preview
   automática por branch, e o push conta como publicação.

