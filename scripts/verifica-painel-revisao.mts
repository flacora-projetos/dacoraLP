/** Regressão da P2: endpoint protegido + documento e faixa desenhados. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import handler, { montarRelatorioParaRevisao } from '../api/painel-relatorio.ts';
import { RevisaoMoldura } from '../src/painel/RevisaoMoldura.tsx';
import { criarChartTheme, preenchimentoBarra } from '../src/reports/charts/chartTheme.ts';
import { nomePlataforma } from '../src/reports/componentes.tsx';
import { karyneMontada202607 } from '../src/reports/fixtures/karyne-montada-2026-07.ts';

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

const relatorio = montarRelatorioParaRevisao(linha);
assert.ok(relatorio, 'a linha válida precisa montar a revisão');
assert.equal(relatorio.snapshot.publicacao.checksum, linha.checksum, 'checksum precisa vir da coluna persistida');
assert.equal(relatorio.snapshot.identidade.clienteNome, 'Cliente Exemplo');
assert.equal(montarRelatorioParaRevisao({ ...linha, conteudo: null }), null);

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
assert.equal((html.match(/ disabled=""/g) ?? []).length, 2, 'as decisões da P2 precisam estar desabilitadas');
assert.ok(html.includes('href="#'), 'sinal de atenção precisa navegar para a seção relevante');
assert.ok(html.includes('id="qualidade"') || html.includes('id="resumo"'), 'o alvo precisa existir no relatório');
assert.ok(html.includes('href="/painel-de-relatorios"'), 'faltou voltar para a fila por navegação semântica');

const semConteudo = desenhar(null);
assert.ok(semConteudo.includes('conteúdo do relatório não foi carregado'));
assert.ok(!semConteudo.includes('Aprovar relatório'));
assert.ok(!semConteudo.includes('Recusar com motivo'));

const fetchOriginal = globalThis.fetch;
let chamadasAoBanco: string[] = [];

function dublar(usuario: unknown | null, linhas: unknown[] = [linha]) {
  chamadasAoBanco = [];
  globalThis.fetch = (async (entrada: any) => {
    const url = String(entrada);
    if (url.includes('/auth/v1/user')) {
      return usuario
        ? new Response(JSON.stringify(usuario), { status: 200, headers: { 'content-type': 'application/json' } })
        : new Response('{}', { status: 401 });
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
  assert.equal(chamadasAoBanco.length, 1);
  assert.ok(!chamadasAoBanco[0].includes('token'), 'a credencial pública não pode ser consultada na P2');
  assert.match(resposta.cabecalhos['cache-control'], /no-store/);
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
console.log('OK — revisão do painel: acesso fechado, snapshot carregado e decisões impossíveis sem conteúdo');
