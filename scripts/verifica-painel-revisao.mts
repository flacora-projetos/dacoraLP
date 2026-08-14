/** Regressão da P2: endpoint protegido + documento e faixa desenhados. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import handler, { montarRelatorioParaRevisao } from '../api/painel-relatorio.ts';
import { resolverAudiosPrivados } from '../api/_audios-relatorio.ts';
import { resolverMiniaturasPrivadas } from '../api/_miniaturas-relatorio.ts';
import { RevisaoMoldura } from '../src/painel/RevisaoMoldura.tsx';
import { afirmacoesDaIntroducaoRevisada } from '../src/painel/revisaoAnalise.ts';
import BlocoAudioRelatorio from '../src/reports/blocos/BlocoAudioRelatorio.tsx';
import { renderizarBloco } from '../src/reports/blocos/catalogo.tsx';
import type { BlocoAudio, DadosDeBloco } from '../src/reports/blocos/tipos.ts';
import { criarChartTheme, preenchimentoBarra } from '../src/reports/charts/chartTheme.ts';
import { nomePlataforma } from '../src/reports/componentes.tsx';
import { karyneMontada202607 } from '../src/reports/fixtures/karyne-montada-2026-07.ts';
import { checksumDoConteudo } from './checksum-relatorio.mts';

const fonteRevisaoLocal = readFileSync(new URL('../src/pages/PainelRevisaoLocal.tsx', import.meta.url), 'utf8');
assert.match(fonteRevisaoLocal, /karyneMontada202607/, 'a rota local precisa partir da fixture governada');
assert.doesNotMatch(fonteRevisaoLocal, /snapshot\.analysisContext\s*=/, 'a rota local não pode injetar contexto analítico manual');
assert.doesNotMatch(fonteRevisaoLocal, /967\.73|1100\.5/, 'a rota local não pode reintroduzir bases inventadas');

const ID = '11111111-1111-4111-8111-111111111111';
const { publicacao: _publicacao, ...conteudoDaFixture } = karyneMontada202607;
const conteudo = {
  ...conteudoDaFixture,
  identidade: {
    ...conteudoDaFixture.identidade,
    relatorioId: 'relatorio-exemplo-2026-07',
    clienteSlug: 'cliente_exemplo',
    clienteNome: 'Cliente Exemplo',
  },
};

const linha = {
  id: ID,
  cliente_slug: 'cliente_exemplo',
  competencia: '2026-07',
  versao: 1,
  estado: 'gerado',
  gerado_em: '2026-08-01T10:00:00Z',
  checksum: 'checksum-persistido-de-exemplo',
  aprovado_por: null,
  aprovado_em: null,
  aprovado_checksum: null,
  enviado_em: null,
  enviado_para: null,
  substituido_por: null,
  conteudo,
};

{
  const base: any = structuredClone(conteudo);
  const comAudio: any = structuredClone(base);
  comAudio.montagem = [
    { bloco: 'AUDIO', id: 'ouvir-relatorio', audio: 'leitura_completa' },
    ...comAudio.montagem,
  ];
  comAudio.dados.audios = {
    leitura_completa: {
      id: 'leitura_completa',
      estado: 'disponivel',
      src: 'storage://relatorios-audios/cliente_exemplo/2026-07/v1/exemplo.ogg',
      mimeType: 'audio/ogg',
    },
  };

  assert.equal(
    checksumDoConteudo(comAudio),
    checksumDoConteudo(base),
    'a representação opcional de áudio não pode mudar o checksum das afirmações',
  );

  const numeroAlterado: any = structuredClone(comAudio);
  numeroAlterado.dados.faixas.faixa_meta.metricas[0].valor.valor = 123456;
  assert.notEqual(
    checksumDoConteudo(numeroAlterado),
    checksumDoConteudo(comAudio),
    'um número do relatório precisa continuar mudando o checksum',
  );

  const blocoDesconhecido: any = structuredClone(comAudio);
  blocoDesconhecido.montagem.push({ bloco: 'FUTURO', id: 'nao-neutralizar' });
  assert.notEqual(
    checksumDoConteudo(blocoDesconhecido),
    checksumDoConteudo(comAudio),
    'a neutralização deve ser estreita e exclusiva do bloco AUDIO',
  );
}

const relatorio = montarRelatorioParaRevisao(linha);
assert.ok(relatorio, 'a linha válida precisa montar a revisão');
assert.deepEqual(
  afirmacoesDaIntroducaoRevisada('Primeiro achado.\n\nSegundo achado.\n\nTerceiro achado.').map((item) => item.texto),
  ['Primeiro achado.', 'Segundo achado.', 'Terceiro achado.'],
  'a introdução aplicada precisa preservar os parágrafos para manter a hierarquia tipográfica do resumo original',
);
assert.equal(relatorio.snapshot.publicacao.checksum, linha.checksum, 'checksum precisa vir da coluna persistida');
assert.equal(relatorio.snapshot.identidade.clienteNome, 'Cliente Exemplo');
assert.equal(montarRelatorioParaRevisao({ ...linha, conteudo: null }), null);

{
  const fonteRevisao = readFileSync(new URL('../src/painel/Revisao.tsx', import.meta.url), 'utf8');
  assert.match(fonteRevisao, /Modelo de IA/);
  assert.match(fonteRevisao, /Usado nas próximas sugestões de revisão/);
  assert.doesNotMatch(fonteRevisao, /Modelo para a proxima geracao|Comparacao manual/);
}

{
  const comContexto: any = structuredClone(relatorio);
  comContexto.snapshot.analysisContext = {
    versao: 'analysis_context_v1',
    competencia: '2026-07',
    fatos: [{
      id: 'meta_investimento', plataforma: 'meta', tipo: 'investimento', rotulo: 'Investimento', unidade: 'brl', atual: 1234.5,
      competenciaBase: '2026-06', base: 1000, variacao: 0.2345,
    }],
    relacoes: [{
      tipo: 'cpm_entrega', plataforma: 'meta', sustentadaPor: ['meta_cpm', 'meta_impressoes'],
      texto: 'CPM subiu enquanto as impressões caíram.',
    }],
    limitacoes: [{ id: 'meta_cpc', motivo: 'comparacao_indisponivel' }],
  };
  const htmlContexto = renderToStaticMarkup(createElement(MemoryRouter, null,
    createElement(RevisaoMoldura, { relatorio: comContexto }, createElement('div', null, 'Documento')),
  ));
  assert.match(htmlContexto, /O que a análise recebeu/);
  assert.match(htmlContexto, /Investimento.*R\$\s*1\.234,50.*base R\$\s*1\.000,00.*variação \+23,5%/);
  assert.match(htmlContexto, /CPM subiu enquanto as impressões caíram/);
}

const dadosVazios: DadosDeBloco = {
  faixas: {},
  tabelas: {},
  evolucoesMensais: {},
  rankingsCriativos: {},
  quebras: {},
};

const configAudio: BlocoAudio = {
  bloco: 'AUDIO',
  id: 'ouvir-relatorio',
  titulo: 'Ouvir a versão falada',
  apoio: 'O texto completo permanece na página.',
  audio: 'leitura_completa',
};

{
  const htmlDisponivel = renderToStaticMarkup(createElement(BlocoAudioRelatorio, {
    audio: {
      id: 'leitura_completa',
      estado: 'disponivel',
      src: 'https://exemplo.supabase.co/storage/assinado.mp3',
      mimeType: 'audio/mpeg',
      duracaoSegundos: 154,
    },
  }));
  assert.match(htmlDisponivel, /<audio[^>]*controls=""[^>]*preload="metadata"/);
  assert.match(htmlDisponivel, /Ouvir a versão falada/);
  assert.match(htmlDisponivel, /aria-controls="audio-leitura_completa"/);
  assert.match(htmlDisponivel, /aria-pressed="false"/);
  assert.ok(!htmlDisponivel.includes('autoplay'), 'o relatório nunca pode iniciar áudio sozinho');
  assert.ok(htmlDisponivel.includes('Duração: 2:34'));
  assert.ok(htmlDisponivel.includes('O áudio é complementar'));

  const htmlIndisponivel = renderToStaticMarkup(createElement(BlocoAudioRelatorio, {
    audio: {
      id: 'leitura_completa',
      estado: 'indisponivel',
      motivo: 'A leitura ainda não foi gerada para esta versão.',
    },
  }));
  assert.ok(htmlIndisponivel.includes('Leitura em áudio indisponível'));
  assert.ok(htmlIndisponivel.includes('relatório escrito continua completo'));
  assert.ok(!htmlIndisponivel.includes('<audio'));

  for (const audioInvalido of [
    {
      id: 'leitura_completa',
      estado: 'erro',
      src: 'https://exemplo.supabase.co/storage/audio.mp3',
      mimeType: 'audio/mpeg',
    },
    {
      id: 'leitura_completa',
      estado: 'disponivel',
      src: 'https://exemplo.supabase.co/storage/audio.mp3',
      mimeType: 'text/html',
    },
    {
      id: 'leitura_completa',
      estado: 'disponivel',
      src: 'https://exemplo.supabase.co/storage/audio.mp3',
      mimeType: 'audio/mpeg',
      duracaoSegundos: 0,
    },
  ]) {
    const htmlInvalido = renderToStaticMarkup(createElement(BlocoAudioRelatorio, {
      audio: audioInvalido as any,
    }));
    assert.ok(!htmlInvalido.includes('<audio'), 'contrato inválido não pode montar player');
    assert.ok(htmlInvalido.includes('Leitura em áudio indisponível'));
  }

  const htmlAusente = renderToStaticMarkup(createElement(
    'div',
    null,
    renderizarBloco(configAudio, {
      dados: dadosVazios,
      theme: criarChartTheme('B'),
      rotulosPlataforma: {},
    }),
  ));
  assert.ok(htmlAusente.includes('não existe neste relatório'));
  assert.ok(htmlAusente.includes('erro de montagem'));
}

{
  const caminho = 'cliente_exemplo/2026-07/123/0123456789abcdef0123.jpg';
  const comMiniatura: any = structuredClone(conteudo);
  comMiniatura.dados.rankingsCriativos = {
    ranking_meta: {
      criativos: [{
        miniatura: { src: `storage://relatorios-miniaturas/${caminho}`, alt: 'Criativo 123' },
      }],
    },
  };
  const resolvido = await resolverMiniaturasPrivadas(
    comMiniatura,
    { clienteSlug: 'cliente_exemplo', competencia: '2026-07' },
    { assinar: async caminhos => [{ path: caminhos[0], signedUrl: 'https://exemplo.supabase.co/storage/assinada.jpg' }] },
  );
  assert.equal(
    resolvido.dados.rankingsCriativos.ranking_meta.criativos[0].miniatura.src,
    'https://exemplo.supabase.co/storage/assinada.jpg',
  );
  assert.equal(
    comMiniatura.dados.rankingsCriativos.ranking_meta.criativos[0].miniatura.src,
    `storage://relatorios-miniaturas/${caminho}`,
    'assinar para o navegador não pode alterar o snapshot persistido',
  );

  const invasao = structuredClone(comMiniatura);
  invasao.dados.rankingsCriativos.ranking_meta.criativos[0].miniatura.src =
    'storage://relatorios-miniaturas/outro_cliente/2026-07/123/0123456789abcdef0123.jpg';
  let tentouAssinar = false;
  const recusado = await resolverMiniaturasPrivadas(
    invasao,
    { clienteSlug: 'cliente_exemplo', competencia: '2026-07' },
    { assinar: async () => { tentouAssinar = true; return []; } },
  );
  assert.equal(tentouAssinar, false, 'um relatório não pode assinar a imagem de outro cliente');
  assert.equal(recusado.dados.rankingsCriativos.ranking_meta.criativos[0].miniatura, null);
}

{
  const caminho = 'cliente_exemplo/2026-07/v1/0123456789abcdef0123456789abcdef.mp3';
  const comAudio: any = structuredClone(conteudo);
  comAudio.dados.audios = {
    leitura_completa: {
      id: 'leitura_completa',
      estado: 'disponivel',
      src: `storage://relatorios-audios/${caminho}`,
      mimeType: 'audio/mpeg',
      duracaoSegundos: 154,
    },
  };

  const resolvido = await resolverAudiosPrivados(
    comAudio,
    { clienteSlug: 'cliente_exemplo', competencia: '2026-07', versao: 1 },
    { assinar: async caminhos => [{ path: caminhos[0], signedUrl: 'https://exemplo.supabase.co/storage/audio-assinado.mp3' }] },
  );
  assert.equal(
    resolvido.dados.audios.leitura_completa.src,
    'https://exemplo.supabase.co/storage/audio-assinado.mp3',
  );
  assert.equal(
    comAudio.dados.audios.leitura_completa.src,
    `storage://relatorios-audios/${caminho}`,
    'assinar o áudio para o navegador não pode alterar o snapshot persistido',
  );

  const invasao = structuredClone(comAudio);
  invasao.dados.audios.leitura_completa.src =
    'storage://relatorios-audios/outro_cliente/2026-07/v1/0123456789abcdef0123456789abcdef.mp3';
  let tentouAssinar = false;
  const recusado = await resolverAudiosPrivados(
    invasao,
    { clienteSlug: 'cliente_exemplo', competencia: '2026-07', versao: 1 },
    { assinar: async () => { tentouAssinar = true; return []; } },
  );
  assert.equal(tentouAssinar, false, 'um relatório não pode assinar o áudio de outro cliente');
  assert.equal(recusado.dados.audios.leitura_completa.estado, 'indisponivel');
  assert.equal(recusado.dados.audios.leitura_completa.src, undefined);

  const outraVersao = structuredClone(comAudio);
  outraVersao.dados.audios.leitura_completa.src =
    'storage://relatorios-audios/cliente_exemplo/2026-07/v2/0123456789abcdef0123456789abcdef.mp3';
  const versaoRecusada = await resolverAudiosPrivados(
    outraVersao,
    { clienteSlug: 'cliente_exemplo', competencia: '2026-07', versao: 1 },
    { assinar: async () => { throw new Error('não deveria assinar outra versão'); } },
  );
  assert.equal(versaoRecusada.dados.audios.leitura_completa.estado, 'indisponivel');

  const urlDuradoura = structuredClone(comAudio);
  urlDuradoura.dados.audios.leitura_completa.src = 'https://privado.exemplo.com/audio.mp3';
  const semPersistirUrl = await resolverAudiosPrivados(
    urlDuradoura,
    { clienteSlug: 'cliente_exemplo', competencia: '2026-07', versao: 1 },
    { assinar: async () => { throw new Error('não deveria assinar URL pronta'); } },
  );
  assert.equal(semPersistirUrl.dados.audios.leitura_completa.estado, 'indisponivel');
  assert.equal(semPersistirUrl.dados.audios.leitura_completa.src, undefined);

  for (const registroInvalido of [
    {
      id: 'leitura_completa',
      estado: 'indisponivel',
      motivo: 'Ainda não foi gerado.',
      src: 'https://privado.exemplo.com/audio.mp3',
      mimeType: 'audio/mpeg',
      duracaoSegundos: 154,
    },
    {
      id: 'leitura_completa',
      estado: 'erro',
      src: 'storage://relatorios-audios/outro_cliente/2026-07/v1/0123456789abcdef0123456789abcdef.mp3',
      mimeType: 'audio/mpeg',
    },
    {
      id: 'leitura_completa',
      estado: 'disponivel',
      src: `storage://relatorios-audios/${caminho}`,
      mimeType: 'text/html',
    },
    {
      id: 'leitura_completa',
      estado: 'disponivel',
      src: `storage://relatorios-audios/${caminho}`,
      mimeType: 'audio/mpeg',
      duracaoSegundos: -1,
    },
  ]) {
    const entradaInvalida = structuredClone(comAudio);
    entradaInvalida.dados.audios.leitura_completa = registroInvalido;
    let assinouInvalido = false;
    const saidaInvalida = await resolverAudiosPrivados(
      entradaInvalida,
      { clienteSlug: 'cliente_exemplo', competencia: '2026-07', versao: 1 },
      { assinar: async () => { assinouInvalido = true; return []; } },
    );
    const audioSanitizado = saidaInvalida.dados.audios.leitura_completa;
    assert.equal(assinouInvalido, false, 'registro inválido não pode chegar ao assinador');
    assert.equal(audioSanitizado.estado, 'indisponivel');
    assert.equal(audioSanitizado.src, undefined);
    assert.equal(audioSanitizado.mimeType, undefined);
    assert.equal(audioSanitizado.duracaoSegundos, undefined);
  }

  const versaoInvalida = await resolverAudiosPrivados(
    comAudio,
    { clienteSlug: 'cliente_exemplo', competencia: '2026-07', versao: 0 },
    { assinar: async () => { throw new Error('versão inválida não pode assinar'); } },
  );
  assert.equal(versaoInvalida.dados.audios.leitura_completa.estado, 'indisponivel');
  assert.equal(versaoInvalida.dados.audios.leitura_completa.src, undefined);

  const colecaoInvalida = structuredClone(comAudio);
  colecaoInvalida.dados.audios = ['https://privado.exemplo.com/audio.mp3'];
  const colecaoSanitizada = await resolverAudiosPrivados(
    colecaoInvalida,
    { clienteSlug: 'cliente_exemplo', competencia: '2026-07', versao: 1 },
    { assinar: async () => { throw new Error('coleção inválida não pode assinar'); } },
  );
  assert.deepEqual(colecaoSanitizada.dados.audios, {}, 'coleção inválida precisa sair vazia');
}

const tema = criarChartTheme('B');
assert.equal(nomePlataforma('crm'), 'CRM', 'a fonte CRM precisa ter nome legível');
assert.equal(
  preenchimentoBarra(tema, 'crm'),
  tema.series.crm.cor,
  'um bloco real vindo do CRM precisa ter preenchimento no catálogo visual',
);
const cssRelatorio = readFileSync(new URL('../src/reports/report.css', import.meta.url), 'utf8');
assert.match(
  cssRelatorio,
  /@media \(max-width: 639px\)[\s\S]*?\.dc-grafico__unidade\s*\{[\s\S]*?white-space:\s*normal;[\s\S]*?@media \(max-width: 639px\)[\s\S]*?\.dc-tabela-dados thead th\s*\{[\s\S]*?position:\s*static;/,
  'rótulo e cabeçalho da tabela não podem alargar a página no celular',
);
assert.match(
  cssRelatorio,
  /@media \(max-width: 639px\)[\s\S]*?\.dc-campanha__nome\s*\{[\s\S]*?overflow-wrap:\s*anywhere;[\s\S]*?\.dc-tabela-campanhas\s*\{[\s\S]*?table-layout:\s*fixed;/,
  'a tabela de campanhas precisa caber na revisão móvel',
);

function desenhar(valor: any): string {
  return renderToStaticMarkup(
    createElement(
      MemoryRouter,
      null,
      createElement(
        RevisaoMoldura,
        { relatorio: valor },
        createElement('div', null, createElement('section', { id: 'qualidade' }, 'Documento carregado')),
      ),
    ),
  );
}

const html = desenhar(relatorio);
assert.ok(html.includes('<article'), 'o documento precisa estar dentro da bancada');
assert.ok(html.includes('<aside'), 'faltou a faixa de revisão');
assert.ok(html.includes('Cliente Exemplo'));
assert.ok(html.includes('Aprovar relatório') && html.includes('Recusar com motivo'));
// A moldura é desenhada aqui SEM canal de decisão, e nesse modo os dois botões
// continuam desabilitados. Depois da P3 isso deixou de ser "a decisão ainda não
// existe" e passou a ser um contrato: botão habilitado sem para onde gravar é
// pior que botão desabilitado, porque quem clica acredita ter decidido.
// O caminho habilitado é provado em `npm run verifica:decisao`.
assert.equal((html.match(/ disabled=""/g) ?? []).length, 2, 'sem canal de decisão, os botões ficam desabilitados');
assert.ok(html.includes('href="#'), 'sinal de atenção precisa navegar para a seção relevante');
assert.ok(html.includes('id="qualidade"') || html.includes('id="resumo"'), 'o alvo precisa existir no relatório');
assert.ok(html.includes('href="/painel-de-relatorios"'), 'faltou voltar para a fila por navegação semântica');
assert.ok(!html.includes('O que a análise recebeu'), 'o contexto interno não pode aparecer sem a moldura de revisão');

// FLUTUANTE, sempre — nunca preso no topo do documento, senão relatório
// longo obriga a rolar até lá para voltar (pedido do Flávio, 2026-08-12).
assert.ok(
  html.includes('dcp-revisao__navegacao dcp-revisao__navegacao--flutuante'),
  'o "voltar para a fila" da revisão precisa ficar flutuante antes da aprovação',
);

/* "VOLTAR PARA A FILA" DEVOLVE A MESMA FILA, NÃO O MÊS CORRENTE (2026-08-12).
   A fila guarda competência/aba/filtros na própria URL (`Fila.tsx`); a volta
   só funciona se pegar exatamente essa URL de volta, tirando só `relatorio`.
   Sem isso, mudar de mês, abrir um relatório e voltar cai de novo em agosto —
   exatamente a reclamação do Flávio. */
{
  const desenharComUrl = (caminho: string) =>
    renderToStaticMarkup(
      createElement(
        MemoryRouter,
        { initialEntries: [caminho] },
        createElement(
          RevisaoMoldura,
          { relatorio },
          createElement('div', null, createElement('section', { id: 'qualidade' }, 'Documento carregado')),
        ),
      ),
    );

  const htmlComEstado = desenharComUrl(
    `/painel-de-relatorios?relatorio=${ID}&competencia=2026-06&aba=fila&carteira=DACORA`,
  );
  assert.ok(
    htmlComEstado.includes(
      'href="/painel-de-relatorios?competencia=2026-06&amp;aba=fila&amp;carteira=DACORA"',
    ),
    'o "voltar para a fila" perdeu a competência, a aba ou o filtro que estavam na URL',
  );
  assert.ok(
    !htmlComEstado.includes(`relatorio=${ID}`),
    'o "voltar" não pode carregar o relatório que acabou de ser fechado',
  );
}

const semConteudo = desenhar(null);
assert.ok(semConteudo.includes('conteúdo do relatório não foi carregado'));
assert.ok(!semConteudo.includes('Aprovar relatório'));
assert.ok(!semConteudo.includes('Recusar com motivo'));

const fetchOriginal = globalThis.fetch;
let chamadasAoBanco: string[] = [];
let chamadasAoStorage: Array<{ url: string; corpo: any }> = [];

function dublar(usuario: unknown | null, linhas: unknown[] = [linha]) {
  chamadasAoBanco = [];
  chamadasAoStorage = [];
  globalThis.fetch = (async (entrada: any, init?: RequestInit) => {
    const url = String(entrada);
    if (url.includes('/auth/v1/user')) {
      return usuario
        ? new Response(JSON.stringify(usuario), { status: 200, headers: { 'content-type': 'application/json' } })
        : new Response('{}', { status: 401 });
    }
    if (url.includes('/storage/v1/object/sign/relatorios-audios')) {
      const corpo = JSON.parse(String(init?.body ?? '{}'));
      chamadasAoStorage.push({ url, corpo });
      return new Response(JSON.stringify(
        (corpo.paths ?? []).map((path: string) => ({
          error: null,
          path,
          signedURL: `/object/sign/relatorios-audios/${path}?token=teste`,
        })),
      ), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    chamadasAoBanco.push(url);
    return new Response(JSON.stringify(linhas), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  }) as typeof fetch;
}

async function chamar({
  usuario,
  id = ID,
  metodo = 'GET',
  linhas = [linha],
}: {
  usuario: unknown | null;
  id?: string;
  metodo?: string;
  linhas?: unknown[];
}) {
  dublar(usuario, linhas);
  const capturado: any = { status: 0, corpo: null, cabecalhos: {} };
  const req: any = {
    method: metodo,
    headers: { authorization: usuario ? 'Bearer token-de-teste' : undefined },
    query: { id },
  };
  const res: any = {
    setHeader(nome: string, valor: string) {
      capturado.cabecalhos[nome.toLowerCase()] = valor;
      return res;
    },
    status(status: number) {
      capturado.status = status;
      return res;
    },
    json(corpo: any) {
      capturado.corpo = corpo;
      return res;
    },
  };
  await handler(req, res);
  return capturado;
}

process.env.SUPABASE_URL = 'https://exemplo.supabase.co';
process.env.SUPABASE_ANON_KEY = 'chave-publica-de-teste';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'chave-de-servico-de-teste';
process.env.PAINEL_EMAILS_AUTORIZADOS = 'pessoa.autorizada@exemplo.com';

const autorizada = {
  id: 'usuario-exemplo',
  email: 'pessoa.autorizada@exemplo.com',
  app_metadata: { provider: 'google', providers: ['google'] },
  user_metadata: { full_name: 'Pessoa Exemplo' },
};

{
  const resposta = await chamar({ usuario: null });
  assert.equal(resposta.status, 401);
  assert.equal(chamadasAoBanco.length, 0, 'sem sessão não pode consultar o relatório');
  assert.equal(resposta.corpo.relatorio, undefined, 'a recusa não pode vazar dado de cliente');
}
{
  const resposta = await chamar({ usuario: autorizada, id: 'id-inválido' });
  assert.equal(resposta.status, 400);
  assert.equal(chamadasAoBanco.length, 0, 'id inválido precisa parar antes do banco');
}
{
  const resposta = await chamar({ usuario: autorizada });
  assert.equal(resposta.status, 200);
  assert.equal(resposta.corpo.relatorio.conteudoCarregado, true);
  assert.equal(resposta.corpo.relatorio.clienteNome, 'Cliente Exemplo');
  assert.equal(chamadasAoBanco.length, 2, 'a revisão lê o relatório e o estado editorial privado');
  assert.ok(chamadasAoBanco.some((url) => url.includes('/relatorio_analise_sugestoes?')), 'a RA4 precisa carregar a prontidão editorial');
  assert.ok(chamadasAoBanco.every((url) => !url.includes('token')), 'a credencial pública não pode ser consultada na revisão');
  assert.equal(resposta.corpo.relatorio.revisaoEditorial.disponivel, true);
  assert.equal(resposta.corpo.relatorio.revisaoEditorial.podeAprovar, false, 'sem análises revisadas a aprovação começa protegida');
  assert.match(resposta.cabecalhos['cache-control'], /no-store/);
}
{
  const comAudio: any = structuredClone(linha);
  comAudio.conteudo.identidade.relatorioId = 'id-autodeclarado-ignorado';
  comAudio.conteudo.dados.audios = {
    leitura_completa: {
      id: 'leitura_completa',
      estado: 'disponivel',
      src: 'storage://relatorios-audios/cliente_exemplo/2026-07/v1/0123456789abcdef0123456789abcdef.mp3',
      mimeType: 'audio/mpeg',
    },
  };
  const resposta = await chamar({ usuario: autorizada, linhas: [comAudio] });
  assert.equal(resposta.status, 200);
  assert.equal(chamadasAoStorage.length, 1, 'o endpoint precisa assinar o caminho da versão da linha');
  assert.deepEqual(chamadasAoStorage[0].corpo.paths, [
    'cliente_exemplo/2026-07/v1/0123456789abcdef0123456789abcdef.mp3',
  ]);
  assert.match(resposta.corpo.relatorio.snapshot.dados.audios.leitura_completa.src, /token=teste/);

  const caminhoAutodeclarado: any = structuredClone(comAudio);
  caminhoAutodeclarado.conteudo.identidade.relatorioId = 'outro-relatorio';
  caminhoAutodeclarado.conteudo.dados.audios.leitura_completa.src =
    'storage://relatorios-audios/cliente_exemplo/2026-07/outro-relatorio/0123456789abcdef0123456789abcdef.mp3';
  const recusada = await chamar({ usuario: autorizada, linhas: [caminhoAutodeclarado] });
  assert.equal(recusada.status, 200);
  assert.equal(chamadasAoStorage.length, 0, 'id do snapshot não pode autorizar o próprio caminho');
  assert.equal(recusada.corpo.relatorio.snapshot.dados.audios.leitura_completa.estado, 'indisponivel');
  assert.equal(recusada.corpo.relatorio.snapshot.dados.audios.leitura_completa.src, undefined);
}
{
  const versaoInvalida: any = { ...linha, versao: 0 };
  const resposta = await chamar({ usuario: autorizada, linhas: [versaoInvalida] });
  assert.equal(resposta.status, 422);
  assert.equal(chamadasAoStorage.length, 0, 'versão inválida precisa falhar antes do Storage');
}
{
  const resposta = await chamar({ usuario: autorizada, linhas: [] });
  assert.equal(resposta.status, 404);
  assert.equal(resposta.corpo.relatorio, undefined);
}
{
  const resposta = await chamar({ usuario: autorizada, linhas: [{ ...linha, conteudo: null }] });
  assert.equal(resposta.status, 422);
  assert.equal(resposta.corpo.relatorio, undefined);
}

globalThis.fetch = fetchOriginal;
console.log('OK — revisão do painel: acesso fechado, snapshot, miniaturas e áudio privado validados');
