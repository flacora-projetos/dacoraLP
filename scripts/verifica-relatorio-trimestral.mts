/**
 * Etapa 4: provas sintéticas do trimestre, isoladas de credenciais e produção.
 * O snapshot de base Zenun é uma fixture de números INVENTADOS, não de cliente real.
 */
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { mkdir, writeFile } from 'node:fs/promises';
import { zenun202607 } from '../src/reports/fixtures/zenun-2026-07.ts';
import { rotuloDoPeriodo, nomeDoProduto, snapshotSemOrigemPrivada, snapshotParaExibicao, SECOES_EDITORIAIS_TRIMESTRAIS } from '../src/reports/produto.ts';
import { formatarNumero } from '../src/reports/format.ts';
import RelatorioMontado from '../src/reports/RelatorioMontado.tsx';
import { FilaApresentada } from '../src/painel/Fila.tsx';
import { montarFila, type LinhaDoBanco } from '../api/_painel-fila-dados.ts';
import { montarVisaoGeral } from '../api/_painel-visao-geral-dados.ts';
import { espacosAnaliticosDoSnapshot } from '../src/reports/blocos/analise.ts';
import { secoesEditoriaisObrigatorias } from '../src/painel/estadoEditorial.ts';
import { validarConferenciaTrimestral, conferirAnalisesTrimestrais } from '../api/_painel-conferencia-trimestral.ts';
import { ehEnvioTrimestralBloqueado } from '../api/painel-envio.ts';
import { gerarPdfDoRelatorio } from '../src/reports/pdf/gerarPdf.ts';
import { conferirProntidaoEditorialParaAprovacao } from '../api/painel-decisao.ts';

const snap = structuredClone(zenun202607) as any;
snap.identidade = {
  ...snap.identidade, produto: 'trimestral_externo_cliente',
  clienteSlug: 'cliente_demo', clienteNome: 'Cliente demonstração',
  competencia: '2026-09', rotuloPeriodo: '3º trimestre de 2026 (julho a setembro)',
  periodo: { inicio: '2026-07-01', fim: '2026-09-30' },
};
snap.dados.origensMensais = [
  {competencia:'2026-07',versao:1,checksum:'a'.repeat(32)},
  {competencia:'2026-08',versao:1,checksum:'b'.repeat(32)},
  {competencia:'2026-09',versao:2,checksum:'c'.repeat(32)},
];
snap.conferencia = { divergencias: [{tipo:'google_conversoes_do_mes',mensagem:'Dado privado'}] };
const analises = SECOES_EDITORIAIS_TRIMESTRAIS.map(s => ({
  secao: s.secao, texto: s.secao.includes('aprendizados')
    ? 'A distribuição de conversões variou entre os três meses, segundo as fontes conferidas.'
    : 'Revisar as campanhas com menor taxa de conversão antes de ampliar o investimento.'
}));
const publico = snapshotSemOrigemPrivada(snap);
assert.notEqual(publico, snap);
assert.equal(publico.conferencia, undefined);
assert.equal(publico.dados.origensMensais, undefined);
assert.equal(snap.dados.origensMensais.length, 3, 'não muta a fonte do revisor');
assert.equal(snapshotSemOrigemPrivada(zenun202607), zenun202607, 'mensal não muda');
assert.equal(rotuloDoPeriodo(snap.identidade, true), '3º trimestre de 2026');
assert.equal(rotuloDoPeriodo(snap.identidade), '3º trimestre de 2026 (julho a setembro)');
assert.equal(rotuloDoPeriodo(zenun202607.identidade), 'julho de 2026');
assert.equal(nomeDoProduto(snap.identidade), 'Relatório trimestral de performance');
const medida = { identidade: snap.identidade, dados: { faixas: { teste: { metricas: [
  { id: 'taxa', unidade: 'percentual', valor: { estado: 'ok', numero: 0.0445 } },
] } } } };
const vista = snapshotParaExibicao(medida) as any;
assert.equal(vista.dados.faixas.teste.metricas[0].valor.numero,0.045);
assert.equal(formatarNumero(vista.dados.faixas.teste.metricas[0].valor.numero,'percentual'),'4,5%');
assert.equal(medida.dados.faixas.teste.metricas[0].valor.numero,0.0445);
assert.equal(snapshotParaExibicao(zenun202607),zenun202607,'mensal sem arredondamento adicional');

const espacos = espacosAnaliticosDoSnapshot(snap);
assert(SECOES_EDITORIAIS_TRIMESTRAIS.every(s => espacos.some(e => e.secao === s.secao)));
assert(SECOES_EDITORIAIS_TRIMESTRAIS.every(s => secoesEditoriaisObrigatorias(snap).some(e => e.secao === s.secao)));
assert(espacos.every(e => !JSON.stringify(e).includes('origensMensais')));
assert(!espacosAnaliticosDoSnapshot(zenun202607).some(s => s.secao.includes('trimestral')));
assert.equal(ehEnvioTrimestralBloqueado({cliente_slug:'cliente_demo__trimestral'}), true);
assert.equal(ehEnvioTrimestralBloqueado({cliente_slug:'cliente_demo'}), false);

function linha(clienteSlug: string, produto: string, carteira: string) {
  return {
    id:'11111111-1111-4111-8111-111111111111',
    cliente_slug: clienteSlug, competencia:'2026-09', versao:1,estado:'gerado',
    gerado_em:'2026-10-01T12:00:00Z', aprovado_em:null,
    revogado_em:null, substituido_por:null,
    conteudo:{identidade:{clienteSlug,clienteNome:'Cliente demonstração',carteira,produto,
      tipoRelatorio:'small_cap',rotuloPeriodo:snap.identidade.rotuloPeriodo},
      fontes:[], montagem:[],dados:{faixas:{}}}
  } as unknown as LinhaDoBanco;
}
const mensal = linha('cliente_demo','mensal_externo_cliente','DACORA');
const trimestral = { ...linha('cliente_demo__trimestral','trimestral_externo_cliente','DACORA'),
  id:'22222222-2222-4222-8222-222222222222' };
const itens = montarFila([mensal,trimestral]);
assert.equal(itens.length,2);
assert.equal(itens.find(i=>i.clienteSlug.endsWith('__trimestral'))?.produto,'trimestral_externo_cliente');
assert(!itens.find(i=>i.clienteSlug.endsWith('__trimestral'))?.sinais.some(s=>s.tipo==='classificacao_ausente'));
const visaoMensal = montarVisaoGeral([mensal], '2026-09', '2026-10-12T12:00:00Z');
const visaoMisturada = montarVisaoGeral([mensal,trimestral], '2026-09', '2026-10-12T12:00:00Z');
assert.equal(visaoMisturada.totalCorrentes,visaoMensal.totalCorrentes);
assert.deepEqual(visaoMisturada.prazo,visaoMensal.prazo);
assert.deepEqual(visaoMisturada.fila,visaoMensal.fila);
assert.deepEqual(visaoMisturada.qualidade,visaoMensal.qualidade);
assert.deepEqual(visaoMisturada.cobertura,visaoMensal.cobertura);
assert.equal(visaoMisturada.trimestrais?.totalCorrentes,1);
const htmlFila=renderToStaticMarkup(createElement(MemoryRouter,null,
  createElement(FilaApresentada,{dados:{competencia:'2026-09',competencias:['2026-09'],itens}})));
assert(htmlFila.includes('Trimestrais · Carteira Dácora'));
assert(htmlFila.includes('Mensais externos · Carteira Dácora'));
assert(htmlFila.includes('3º trimestre de 2026'));
assert(!htmlFila.includes('Classificação pendente no snapshot'));

const htmlRelatorio=renderToStaticMarkup(createElement(RelatorioMontado,{
  snapshot: publico, competencias:[{competencia:'2026-09',rotulo:'3º trimestre de 2026',publicada:true}],
  proposta:'B', analisesPublicadas:analises,
}));
assert(htmlRelatorio.includes('Relatório trimestral de performance'));
assert(htmlRelatorio.includes('Resumo do trimestre'));
assert(htmlRelatorio.includes('Aprendizados do trimestre'));
assert(htmlRelatorio.includes('Recomendações para o próximo trimestre'));
assert(!htmlRelatorio.includes('Dado privado'));
assert(!htmlRelatorio.includes('origensMensais'));

const id='33333333-3333-4333-8333-333333333333', checksum='a'.repeat(32);
const sugestao={versao:1,tipo:'conferencia_trimestral',relatorioId:id,competencia:'2026-09',checksum,
  divergencias:[{tipo:'google_conversoes_do_mes',mensagem:'Teste interno da revisão'}]};
assert(validarConferenciaTrimestral(sugestao,{id,checksum,competencia:'2026-09'}));
assert.equal(validarConferenciaTrimestral({...sugestao,checksum:'b'.repeat(32)},{id,checksum,competencia:'2026-09'}),null);
const conf=await conferirAnalisesTrimestrais({id,checksum},{urlSupabase:'https://teste.invalid',chaveDeServico:'fake'},
  async() => new Response(JSON.stringify(SECOES_EDITORIAIS_TRIMESTRAIS.map(s=>({secao:s.secao,texto_atual:
    'Texto revisado e aplicado, com referência aos indicadores comprovados.'}))),{status:200}));
assert.equal(conf.ok,true);
const confAusente=await conferirAnalisesTrimestrais({id,checksum},{urlSupabase:'https://teste.invalid',chaveDeServico:'fake'},
  async() => new Response('[]',{status:200}));
assert.equal(confAusente.ok,false);

const fetchOriginal = globalThis.fetch;
try {
  let chamadasRpc = 0;
  let conferenciaRegistrada = false;
  globalThis.fetch = async (input) => {
    const url=String(input);
    if (url.includes('/rpc/')) { chamadasRpc++; throw new Error('RPC de aprovação proibida na pré-validação'); }
    if (url.includes('/rest/v1/relatorios?')) return new Response(JSON.stringify([{
      id,cliente_slug:'cliente_demo__trimestral',competencia:'2026-09',versao:1,
      checksum,checksum_factual_editorial:'b'.repeat(32),estado:'gerado',
      substituido_por:null,revogado_em:null,conteudo:{ identidade:snap.identidade, montagem:snap.montagem }
    }]),{status:200});
    if (url.includes('relatorio_contextos_sugeridos?')) return new Response(JSON.stringify(
      conferenciaRegistrada ? [{sugestao}] : []),{status:200});
    if (url.includes('relatorio_analise_sugestoes?')) return new Response('[]',{status:200});
    throw new Error('Leitura inesperada: '+url);
  };
  const req={id,checksumVisto:checksum},cfg={urlSupabase:'https://teste.invalid',chaveDeServico:'fake'};
  const semConferencia=await conferirProntidaoEditorialParaAprovacao(req,cfg);
  assert.equal(semConferencia.ok,false);
  assert.equal(semConferencia.erro,'conferencia_trimestral_pendente');
  conferenciaRegistrada=true;
  const semAnalises=await conferirProntidaoEditorialParaAprovacao(req,cfg);
  assert.equal(semAnalises.ok,false);
  assert.equal(semAnalises.erro,'aprendizados_recomendacoes_pendentes');
  assert.equal(chamadasRpc,0);
} finally { globalThis.fetch=fetchOriginal; }

await mkdir('output/trimestral-etapa4',{recursive:true});
await writeFile('output/trimestral-etapa4/pagina.html', '<!doctype html><html lang="pt-BR"><meta charset="utf-8"><title>Prévia trimestral</title><body>'+htmlRelatorio+'</body></html>');
await writeFile('output/trimestral-etapa4/painel.html', '<!doctype html><html lang="pt-BR"><meta charset="utf-8"><title>Prévia painel</title><body>'+htmlFila+'</body></html>');
const pdf=await gerarPdfDoRelatorio({snapshot: publico,analisesPublicadas:analises,imagens:new Map()});
assert(pdf.length>2000,'PDF deve ter conteúdo');
await writeFile('output/trimestral-etapa4/relatorio.pdf',pdf);
console.log('verifica-relatorio-trimestral: OK; página, fila, privacidade, análises e PDF com dados sintéticos.');
console.log('Prévias: output/trimestral-etapa4/pagina.html, painel.html, relatorio.pdf');
