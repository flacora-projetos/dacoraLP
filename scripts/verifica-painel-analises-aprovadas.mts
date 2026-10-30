/**
 * Regressão de 07/10/2026: depois de aprovado, o painel mostra as análises que
 * o cliente lê. Antes, os editores sumiam e nada entrava no lugar — quem
 * aprovava via a página sem análise e achava que tinha perdido o trabalho
 * (Dácora, setembro v2). Prova o caminho inteiro: leitura das views públicas,
 * a ligação no endpoint e o desenho na tela.
 */
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import handler, { lerDocumentoAprovado } from '../api/painel-relatorio.ts';
import { RevisaoApresentada } from '../src/painel/Revisao.tsx';
import { karyneMontada202607 } from '../src/reports/fixtures/karyne-montada-2026-07.ts';

const ID = '11111111-1111-4111-8111-111111111111';
const CHECKSUM = 'checksum-persistido-de-exemplo';
const ANALISE = 'Texto aprovado que o cliente lê na seção.';
const INTRODUCAO = 'Introdução aprovada pela revisora.';
const OBSERVACAO = 'Recado aprovado para o cliente.';
const config = { urlSupabase: 'https://exemplo.supabase.co', chaveDeServico: 'chave-de-servico-de-teste' };
const fetchOriginal = globalThis.fetch;
const { publicacao: _publicacao, ...conteudo } = karyneMontada202607 as any;
const primeiroBloco = `bloco:${conteudo.montagem.find((bloco: any) => bloco.bloco !== 'AUDIO').id}`;

let chamadas: string[] = [];
function dublar({ falharViews = false, linha }: { falharViews?: boolean; linha?: unknown } = {}) {
  chamadas = [];
  globalThis.fetch = (async (entrada: any) => {
    const url = String(entrada);
    chamadas.push(url);
    const json = (corpo: unknown, status = 200) => new Response(JSON.stringify(corpo), { status, headers: { 'content-type': 'application/json' } });
    if (url.includes('/auth/v1/user')) {
      return json({ id: 'u', email: 'pessoa.autorizada@exemplo.com', app_metadata: { provider: 'google', providers: ['google'] } });
    }
    if (url.includes('relatorio_analises_publicadas')) {
      return falharViews ? json({}, 500) : json([{ secao: primeiroBloco, texto: ANALISE }, { secao: 'introducao', texto: INTRODUCAO }]);
    }
    if (url.includes('relatorio_observacoes_publicas_liberadas')) {
      return falharViews ? json({}, 500) : json([{ secao: primeiroBloco, texto: OBSERVACAO }]);
    }
    if (url.includes('painel_relatorios_com_correcao')) return json([linha]);
    return json([]);
  }) as typeof fetch;
}

/* 1. Só lê depois da aprovação, e só das views amarradas ao fechamento. */
{
  dublar();
  assert.equal(await lerDocumentoAprovado({ id: ID, checksum: CHECKSUM, estado: 'gerado' }, config), null);
  assert.equal(chamadas.length, 0, 'relatório em revisão não lê o documento aprovado');

  for (const estado of ['liberado', 'enviado']) {
    dublar();
    const lido: any = await lerDocumentoAprovado({ id: ID, checksum: CHECKSUM, estado }, config);
    assert.equal(lido?.disponivel, true, `${estado} precisa trazer o documento aprovado`);
    assert.deepEqual(lido.analisesPublicadas.map((a: any) => a.texto), [ANALISE, INTRODUCAO]);
    assert.deepEqual(lido.observacoesPublicas.map((o: any) => o.texto), [OBSERVACAO]);
    assert.equal(chamadas.length, 2);
    for (const url of chamadas) {
      assert.ok(url.includes(`relatorio_id=eq.${ID}`) && url.includes(`relatorio_checksum=eq.${CHECKSUM}`), 'a leitura amarra relatório e checksum');
      assert.ok(/relatorio_analises_publicadas|relatorio_observacoes_publicas_liberadas/.test(url), 'só as views públicas, nunca o histórico interno');
    }
  }

  dublar({ falharViews: true });
  assert.deepEqual(await lerDocumentoAprovado({ id: ID, checksum: CHECKSUM, estado: 'liberado' }, config), { disponivel: false });
}

/* 2. A ligação: o endpoint do painel devolve o documento aprovado. */
{
  process.env.SUPABASE_URL = config.urlSupabase;
  process.env.SUPABASE_ANON_KEY = 'chave-publica-de-teste';
  process.env.SUPABASE_SERVICE_ROLE_KEY = config.chaveDeServico;
  process.env.PAINEL_EMAILS_AUTORIZADOS = 'pessoa.autorizada@exemplo.com';
  const linha = {
    id: ID, cliente_slug: 'cliente_exemplo', competencia: '2026-07', versao: 2, estado: 'liberado',
    gerado_em: '2026-08-01T10:00:00Z', checksum: CHECKSUM, aprovado_por: 'pessoa.autorizada@exemplo.com',
    aprovado_em: '2026-08-02T10:00:00Z', aprovado_checksum: CHECKSUM, enviado_em: null, enviado_para: null,
    substituido_por: null, conteudo,
  };
  dublar({ linha });
  const capturado: any = {};
  const res: any = {
    setHeader: () => res,
    status: (s: number) => { capturado.status = s; return res; },
    json: (c: any) => { capturado.corpo = c; return res; },
  };
  await handler({ method: 'GET', headers: { authorization: 'Bearer token-de-teste' }, query: { id: ID } } as any, res);
  assert.equal(capturado.status, 200, JSON.stringify(capturado.corpo));
  assert.equal(capturado.corpo.relatorio.podeDecidir, false);
  assert.equal(capturado.corpo.relatorio.documentoAprovado?.disponivel, true, 'o endpoint precisa entregar o documento aprovado à tela');
  assert.equal(capturado.corpo.relatorio.documentoAprovado.analisesPublicadas[0].texto, ANALISE);
}
globalThis.fetch = fetchOriginal;

/* 3. A tela: aprovado mostra o que o cliente lê; em revisão, não duplica. */
const base: any = {
  id: ID, clienteNome: 'Cliente Exemplo', competencia: '2026-07', versao: 2, sinais: [],
  conteudoCarregado: true, checksum: CHECKSUM,
  snapshot: { ...conteudo, publicacao: { estado: 'liberado', versao: 2, checksum: CHECKSUM, geradoEm: '2026-08-01T10:00:00Z' } },
};
const desenhar = (relatorio: any) => renderToStaticMarkup(
  createElement(MemoryRouter, null, createElement(RevisaoApresentada, { relatorio })),
);
const documentoAprovado = {
  disponivel: true,
  analisesPublicadas: [{ secao: primeiroBloco, texto: ANALISE }, { secao: 'introducao', texto: INTRODUCAO }],
  observacoesPublicas: [{ secao: primeiroBloco, texto: OBSERVACAO }],
};
{
  const html = desenhar({ ...base, estado: 'liberado', podeDecidir: false, documentoAprovado });
  assert.ok(html.includes(ANALISE), 'aprovado: a análise da seção aparece');
  assert.ok(html.includes(INTRODUCAO), 'aprovado: a introdução aprovada aparece');
  assert.ok(html.includes(OBSERVACAO), 'aprovado: a observação aparece');
}
{
  const html = desenhar({ ...base, estado: 'gerado', podeDecidir: true, documentoAprovado });
  assert.ok(!html.includes(ANALISE), 'em revisão o texto aprovado não entra por fora dos editores');
}
{
  const html = desenhar({ ...base, estado: 'liberado', podeDecidir: false, documentoAprovado: { disponivel: false } });
  assert.ok(html.includes('Não foi possível carregar as análises aprovadas agora'), 'falha de leitura é dita, não vira página sem análise');
}

console.log('OK — painel mostra as análises aprovadas depois da aprovação');
