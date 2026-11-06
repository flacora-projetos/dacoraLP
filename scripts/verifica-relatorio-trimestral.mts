/**
 * Etapa 4: provas sintéticas do trimestre, isoladas de credenciais e produção.
 * A base é o que o montador da fábrica devolve de verdade, com números INVENTADOS
 * (src/reports/fixtures/trimestral-sintetico.json). Mensal fantasiado de trimestral
 * não serve: ele traz resumo pronto, e foi isso que escondeu a análise morta.
 */
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { mkdir, writeFile } from 'node:fs/promises';
import { zenun202607 } from '../src/reports/fixtures/zenun-2026-07.ts';
import sintetico from '../src/reports/fixtures/trimestral-sintetico.json' with { type: 'json' };
import { contextoDoSnapshot, descreverJanelaDoRelatorio } from '../api/_painel-analise-introducao.ts';
import { contextoParaAnalises } from '../api/_painel-analises-secao.ts';
import { nomeDoArquivoPdf } from '../src/reports/pdf/nomeDoArquivo.ts';
import { comSecoesEditoriais } from '../src/reports/pdf/RelatorioPdf.tsx';
import { ecoDaDecisao } from '../src/painel/DecisaoDaRevisao.tsx';
import { lerRelatorioPublico } from '../api/relatorio-publico.ts';
import { montarRelatorioParaRevisao } from '../api/painel-relatorio.ts';
import { RevisaoApresentada } from '../src/painel/Revisao.tsx';
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
import decisaoHandler, { conferirProntidaoEditorialParaAprovacao, recusaTrimestralSemCausaManual } from '../api/painel-decisao.ts';
import { CATALOGO_CAUSAS_RECUSA } from '../src/painel/causasRecusa.ts';

const snap = structuredClone(sintetico) as any;
assert.equal(snap.identidade.produto, 'trimestral_externo_cliente');
assert.equal(snap.dados.origensMensais.length, 3);
assert.equal(snap.analysisContext, undefined, 'o documento real não traz contexto pronto');
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

/* A análise assistida tem de abrir com o documento que a fábrica grava. */
{
  const { publicacao, conferencia, ...conteudo } = snap;
  const linhaReal: any = { id:'44444444-4444-4444-8444-444444444444', cliente_slug:'cliente_demo__trimestral',
    competencia:'2026-09', versao:1, estado:'gerado', checksum:publicacao.checksum, conteudo };
  assert(conteudo.leitura.resumoExecutivo.length > 0, 'sem resumo o relatório nunca pode ser aprovado');
  assert(contextoDoSnapshot(linhaReal), 'a introdução precisa abrir');
  for (const s of SECOES_EDITORIAIS_TRIMESTRAIS) {
    assert(contextoParaAnalises(linhaReal,'',s.secao), s.secao + ' precisa abrir');
  }
  const janela = descreverJanelaDoRelatorio(conteudo.identidade,'2026-09');
  assert.match(janela.texto,/TRIMESTRAL/);
  assert(!janela.texto.includes('o mês fechado'));
  assert.equal(descreverJanelaDoRelatorio(zenun202607.identidade,'2026-07').texto.includes('TRIMESTRAL'),false);
  assert(!/erro de montagem/i.test(JSON.stringify(conteudo)));
}

/* Nome do arquivo: o trimestre não pode sair igual ao mensal do último mês. */
{
  const nome = nomeDoArquivoPdf({ ...snap, publicacao: { ...snap.publicacao, versao: 1 } });
  assert.match(nome,/3-trimestre-de-2026-v1\.pdf$/);
  assert.equal(nomeDoArquivoPdf({ ...zenun202607, publicacao:{...zenun202607.publicacao,versao:1} } as any).includes('2026-07-v1'),true);
}

/* A aprovação e a recusa dizem o período, não "setembro". */
{
  const eco = ecoDaDecisao({ clienteNome:'Cliente demonstração', competencia:'2026-09', versao:1,
    checksum:'a'.repeat(32), estado:'gerado', podeDecidir:true, rotuloPeriodo:'3º trimestre de 2026 (julho a setembro)' } as any,
    'aprovar','pessoa@teste.invalid','');
  assert(eco.includes('3º trimestre de 2026')); assert(!eco.includes('setembro de 2026'));
}

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
/* Aprovado: pode voltar para edição, nunca pode enviar. */
{
  const aprovado={...itens.find(i=>i.clienteSlug.endsWith('__trimestral'))!,estado:'liberado',podeVoltarEdicao:true,podeSolicitarEnvio:true,envioIndisponibilidade:'qualquer'} as any;
  const html=renderToStaticMarkup(createElement(MemoryRouter,null,
    createElement(FilaApresentada,{dados:{competencia:'2026-09',competencias:['2026-09'],itens:[aprovado]},aoVoltarEdicao:()=>{},aoEnviar:()=>{}})));
  assert(html.includes('Voltar para edição'),'trimestral aprovado precisa poder voltar');
  assert(!/>Enviar</.test(html),'trimestral não tem envio');
  assert(!html.includes('Envio indisponível'));
}

const htmlRelatorio=renderToStaticMarkup(createElement(MemoryRouter,null,createElement(RelatorioMontado,{
  snapshot: publico, competencias:[{competencia:'2026-09',rotulo:'3º trimestre de 2026',publicada:true}],
  proposta:'B', analisesPublicadas:analises,
})));
assert(htmlRelatorio.includes('Relatório trimestral de performance'));
assert(htmlRelatorio.includes('Resumo do trimestre'));
assert(htmlRelatorio.includes('Aprendizados do trimestre'));
assert(htmlRelatorio.includes('Recomendações para o próximo trimestre'));
assert(!htmlRelatorio.includes('Dado privado'));
assert(!htmlRelatorio.includes('origensMensais'));
/* O relatório abre dizendo algo e fecha na ordem combinada. */
const textoPlano=htmlRelatorio.replace(/<style[\s\S]*?<\/style>/g,' ').replace(/<[^>]+>/g,' ');
assert(textoPlano.includes('o investimento foi de R$'),'resumo vazio na página');
assert(textoPlano.includes('Contra o trimestre anterior'),'comparação fora do documento');
assert(textoPlano.indexOf('Recomendações para o próximo trimestre')<textoPlano.indexOf('O que cada número quer dizer'),'glossário fecha a página');
assert(textoPlano.indexOf('Aprendizados do trimestre')<textoPlano.indexOf('Recomendações para o próximo trimestre'));
const naCapa=comSecoesEditoriais(publico.montagem,publico,analises).map(s=>s.id);
assert.equal(naCapa.at(-1),'glossario','glossário fecha o PDF');
assert(naCapa.includes('aprendizados-trimestral')&&naCapa.includes('recomendacoes-trimestral'),'índice do PDF');
assert.equal(comSecoesEditoriais(zenun202607.montagem as any,zenun202607 as any,analises).length,zenun202607.montagem.length,'mensal sem seção nova');

const id='33333333-3333-4333-8333-333333333333', checksum='a'.repeat(32);
const sugestao={versao:1,tipo:'conferencia_trimestral',relatorioId:id,competencia:'2026-09',checksum,
  divergencias:[{tipo:'google_conversoes_do_mes',mensagem:'Teste interno da revisão'}]};
assert(validarConferenciaTrimestral(sugestao,{id,checksum,competencia:'2026-09'}));
assert.equal(validarConferenciaTrimestral({...sugestao,checksum:'b'.repeat(32)},{id,checksum,competencia:'2026-09'}),null);
/* As duas fontes: a decisão humana e a revisão durável, que é quem publica. */
{
  const identidade={id,checksum,clienteSlug:'cliente_demo__trimestral',competencia:'2026-09',versao:1,checksumFactual:'b'.repeat(32)};
  const cfg={urlSupabase:'https://teste.invalid',chaveDeServico:'fake'};
  const textoOk='Texto revisado e aplicado, com referência aos indicadores comprovados.';
  const pedidos:string[]=[];
  const banco=(decididas:any[],duraveis:any[]) => (async(u:any)=>{ const url=String(u); pedidos.push(url);
    return new Response(JSON.stringify(url.includes('relatorio_analise_sugestoes')?decididas:duraveis),{status:200}); }) as typeof fetch;
  const secoes=SECOES_EDITORIAIS_TRIMESTRAIS.map(s=>s.secao);
  const decididas=secoes.map(secao=>({secao}));
  const duraveis=secoes.map(secao=>({secao,texto:textoOk}));
  assert.equal((await conferirAnalisesTrimestrais(identidade,cfg,banco(decididas,duraveis))).ok,true);
  const filtro=decodeURIComponent(pedidos.find(u=>u.includes('relatorio_revisoes_editoriais'))!);
  for (const termo of ['estado=eq.atual','tipo_decisao=eq.analise','invalidada_em=is.null','origem_relatorio_id=eq.'+id,
    'checksum_documento=eq.'+checksum,'checksum_factual=eq.'+'b'.repeat(32),'relatorio_versao=eq.1','cliente_slug=eq.cliente_demo__trimestral'])
    assert(filtro.includes(termo),'mesmos filtros da publicação: '+termo);
  assert.equal((await conferirAnalisesTrimestrais(identidade,cfg,banco([],duraveis))).ok,false,'sem decisão humana');
  const semDuravel=await conferirAnalisesTrimestrais(identidade,cfg,banco(decididas,[]));
  assert.equal(semDuravel.ok,false,'aplicada sem registro durável sairia sem texto');
  assert.match(semDuravel.motivo!,/não ficou registrado/);
  assert.equal((await conferirAnalisesTrimestrais(identidade,cfg,banco(decididas,duraveis.slice(0,1)))).ok,false,'as duas seções');
  const quatro=duraveis.map(d=>d.secao.includes('recomendacoes')?{...d,texto:'um item\ndois itens\ntrês itens\nquatro itens'}:d);
  assert.equal((await conferirAnalisesTrimestrais(identidade,cfg,banco(decididas,quatro))).ok,false,'no máximo três');
  const tres=duraveis.map(d=>d.secao.includes('recomendacoes')?{...d,texto:'um item\n\ndois itens\n\ntrês itens'}:d);
  assert.equal((await conferirAnalisesTrimestrais(identidade,cfg,banco(decididas,tres))).ok,true,'linha em branco não conta');
  assert.equal((await conferirAnalisesTrimestrais({...identidade,checksumFactual:null},cfg,banco(decididas,duraveis))).ok,false);
  const falha=(async()=>new Response('x',{status:500})) as typeof fetch;
  assert.equal((await conferirAnalisesTrimestrais(identidade,cfg,falha)).ok,false,'erro de leitura não aprova');
}

const fetchOriginal = globalThis.fetch;
const cfg={urlSupabase:'https://teste.invalid',chaveDeServico:'fake'};
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
    if (url.includes('relatorio_revisoes_editoriais?')) return new Response('[]',{status:200});
    throw new Error('Leitura inesperada: '+url);
  };
  const req={id,checksumVisto:checksum};
  const semConferencia=await conferirProntidaoEditorialParaAprovacao(req,cfg);
  assert.equal(semConferencia.ok,false);
  assert.equal(semConferencia.erro,'conferencia_trimestral_pendente');
  conferenciaRegistrada=true;
  const semAnalises=await conferirProntidaoEditorialParaAprovacao(req,cfg);
  assert.equal(semAnalises.ok,false);
  assert.equal(semAnalises.erro,'aprendizados_recomendacoes_pendentes');
  assert.equal(chamadasRpc,0);

  /* Recusa do trimestral é sempre manual; a do mensal não muda. */
  const dono=(slug:string)=>{ globalThis.fetch=(async()=>new Response(JSON.stringify([{cliente_slug:slug}]),{status:200})) as typeof fetch; };
  dono('cliente_demo__trimestral');
  assert.equal(await recusaTrimestralSemCausaManual({id,causas:[{causeId:'metrica_obrigatoria_ausente'}]},cfg),true,'causa automática recusa');
  assert.equal(await recusaTrimestralSemCausaManual({id,causas:[{causeId:'texto_ou_grafia'}]},cfg),false,'causa manual passa');
  assert.equal(await recusaTrimestralSemCausaManual({id,causas:[{causeId:'metrica_obrigatoria_ausente'},{causeId:'texto_ou_grafia'}]},cfg),false,'uma manual torna a ordem manual');
  dono('cliente_demo');
  assert.equal(await recusaTrimestralSemCausaManual({id,causas:[{causeId:'metrica_obrigatoria_ausente'}]},cfg),false,'mensal segue igual');

  /* O servidor recusa antes de qualquer gravação, não só a função isolada. */
  process.env.SUPABASE_URL='https://teste.invalid'; process.env.SUPABASE_SERVICE_ROLE_KEY='fake';
  process.env.SUPABASE_ANON_KEY='publica-de-teste'; process.env.PAINEL_EMAILS_AUTORIZADOS='pessoa@teste.invalid';
  let rpcDaRecusa=0;
  globalThis.fetch=(async(input:any)=>{ const url=String(input);
    if (url.includes('/auth/v1/user')) return new Response(JSON.stringify({email:'pessoa@teste.invalid',email_confirmed_at:'2026-01-01T00:00:00Z',app_metadata:{provider:'google',providers:['google']}}),{status:200});
    if (url.includes('/rpc/')) { rpcDaRecusa++; return new Response('[]',{status:200}); }
    return new Response(JSON.stringify([{cliente_slug:'cliente_demo__trimestral'}]),{status:200}); }) as typeof fetch;
  const resposta:any={cabecalhos:{},statusCode:0,corpo:null,setHeader(){},status(c:number){this.statusCode=c;return this;},json(b:unknown){this.corpo=b;return this;}};
  await decisaoHandler({method:'POST',headers:{authorization:'Bearer sessao'},body:{id,decisao:'recusar',checksum,
    motivo:'O número desta seção precisa ser conferido.',catalogVersion:CATALOGO_CAUSAS_RECUSA,
    causas:[{causeId:'metrica_obrigatoria_ausente',parameters:{section_id:'bloco:numeros-meta',platform:'meta',metric_id:'meta_cpm'}}]}} as any,resposta);
  assert.equal(resposta.statusCode,409,JSON.stringify(resposta.corpo));
  assert.equal(resposta.corpo.erro,'recusa_trimestral_somente_manual');
  assert.equal(rpcDaRecusa,0,'nenhuma ordem nasce');

  /* A rota pública de verdade, com o documento real: nada privado sai. */
  process.env.SUPABASE_URL='https://teste.invalid'; process.env.SUPABASE_SERVICE_ROLE_KEY='fake';
  const { publicacao, conferencia, ...conteudo } = snap;
  const linhaPublica={id,cliente_slug:'cliente_demo__trimestral',competencia:'2026-09',versao:1,estado:'liberado',
    gerado_em:'2026-10-15T12:00:00Z',checksum,checksum_factual_editorial:'b'.repeat(32),aprovado_checksum:checksum,
    aprovado_por:'p',aprovado_em:'2026-10-16T12:00:00Z',revogado_em:null,substituido_por:null,token:'t'.repeat(43),conteudo:{...conteudo,conferencia}};
  globalThis.fetch = (async (input: any) => {
    const url=String(input);
    if (url.includes('relatorios?token=')) return new Response(JSON.stringify([{cliente_slug:linhaPublica.cliente_slug,competencia:'2026-09'}]),{status:200});
    if (url.includes('/rest/v1/relatorios?')) return new Response(JSON.stringify([linhaPublica]),{status:200});
    if (url.includes('relatorio_fechamentos_editoriais?')) return new Response(JSON.stringify([{relatorio_id:id,cliente_slug:linhaPublica.cliente_slug,
      competencia:'2026-09',relatorio_versao:1,checksum_documento:checksum,checksum_factual:'b'.repeat(32),aprovado_checksum:checksum}]),{status:200});
    return new Response('[]',{status:200});
  }) as typeof fetch;
  const lida=await lerRelatorioPublico('t'.repeat(43));
  assert.equal(lida.status,200,JSON.stringify(lida.corpo));
  const saidaPublica=JSON.stringify(lida.corpo);
  for (const proibido of ['origensMensais','Dado privado','conferenciaTrimestral','"conferencia"',snap.dados.origensMensais[2].checksum])
    assert(!saidaPublica.includes(proibido),'vazou na rota pública: '+proibido);
} finally { globalThis.fetch=fetchOriginal; }

/* A tela de quem revisa: a conferência aparece, e a falta dela é dita. */
const { publicacao: _p, conferencia: _c, ...conteudoDaRevisao } = snap;
const relatorioDaRevisao:any = montarRelatorioParaRevisao({ id, cliente_slug:'cliente_demo__trimestral', competencia:'2026-09',
  versao:1, estado:'gerado', gerado_em:'2026-10-15T12:00:00Z', checksum, conteudo:conteudoDaRevisao } as any);
const htmlRevisao=(conferenciaTrimestral:unknown)=>renderToStaticMarkup(createElement(MemoryRouter,null,
  createElement(RevisaoApresentada,{ relatorio:{...relatorioDaRevisao,conferenciaTrimestral}, quem:'pessoa@teste.invalid', aoDecidir:async()=>({}) as any } as any)));
const revisaoCom=htmlRevisao({disponivel:true,checksum,registradoEm:null,divergencias:[{tipo:'google_conversoes_do_mes',competencia:'2026-08',mensagem:'Google em agosto de 2026: 1 no mensal aprovado e 2 na evolução do último mensal'}]});
assert(revisaoCom.includes('somente para revisão'));
assert(revisaoCom.includes('Google em agosto de 2026: 1 no mensal aprovado'));
assert(htmlRevisao(null).includes('Aprovação bloqueada'),'sem conferência a tela avisa');

await mkdir('output/trimestral-etapa4',{recursive:true});
await writeFile('output/trimestral-etapa4/revisao.html', '<!doctype html><html lang="pt-BR"><meta charset="utf-8"><title>Prévia revisão</title><body>'+revisaoCom+'</body></html>');
await writeFile('output/trimestral-etapa4/pagina.html', '<!doctype html><html lang="pt-BR"><meta charset="utf-8"><title>Prévia trimestral</title><body>'+htmlRelatorio+'</body></html>');
await writeFile('output/trimestral-etapa4/painel.html', '<!doctype html><html lang="pt-BR"><meta charset="utf-8"><title>Prévia painel</title><body>'+htmlFila+'</body></html>');
const pdf=await gerarPdfDoRelatorio({snapshot: publico,analisesPublicadas:analises,imagens:new Map()});
assert(pdf.length>2000,'PDF deve ter conteúdo');
await writeFile('output/trimestral-etapa4/relatorio.pdf',pdf);
console.log('verifica-relatorio-trimestral: OK; página, fila, privacidade, análises e PDF com dados sintéticos.');
console.log('Prévias: output/trimestral-etapa4/pagina.html, painel.html, relatorio.pdf');
