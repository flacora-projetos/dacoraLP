import type { Request, Response } from 'express';
import { conferirAcesso } from './_painel-autorizacao.js';
import {
  ANALISE_PROMPT_VERSAO,
  chamarSonnetIntroducao,
  contextoDoSnapshot,
  hashDoContexto,
  lerPedidoEditorial,
  validarLinhaParaAnalise,
  type LinhaAnalise,
} from './_painel-analise-introducao.js';

const COLUNAS = 'id,cliente_slug,competencia,versao,estado,checksum,substituido_por,revogado_em,conteudo';
const UUID_VALIDO = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function corpoDoPedido(req: Request): unknown {
  const bruto = (req as any).body;
  if (typeof bruto !== 'string') return bruto ?? null;
  try { return JSON.parse(bruto); } catch { return null; }
}

function configuracao() {
  const urlSupabase = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const chaveDeServico = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return urlSupabase && chaveDeServico ? { urlSupabase, chaveDeServico } : null;
}

async function lerRelatorio(id: string, config: NonNullable<ReturnType<typeof configuracao>>) {
  const resposta = await fetch(`${config.urlSupabase}/rest/v1/relatorios?id=eq.${id}&select=${COLUNAS}&limit=1`, {
    headers: { apikey: config.chaveDeServico, Authorization: `Bearer ${config.chaveDeServico}` },
  });
  if (!resposta.ok) throw new Error(`leitura_relatorio_http_${resposta.status}`);
  return (await resposta.json() as LinhaAnalise[])[0];
}

function respostaSugestao(linha: any) {
  return linha ? { id: linha.sugestao_id ?? linha.id, estado: linha.estado, texto: linha.texto_atual, checksum: linha.relatorio_checksum } : null;
}

const FALHAS_DE_CONCORRENCIA = new Set(['checksum_divergente', 'versao_fora_de_revisao', 'sugestao_nao_encontrada']);

async function falhaDaRpc(rpc: globalThis.Response) {
  const bruto = await rpc.text();
  try {
    const corpo = JSON.parse(bruto);
    const codigo = typeof corpo?.code === 'string' ? corpo.code : '';
    const mensagem = typeof corpo?.message === 'string' ? corpo.message : '';
    if (FALHAS_DE_CONCORRENCIA.has(mensagem)) {
      return { status: 409, erro: 'revisao_desatualizada', mensagem: 'A revisão mudou antes de registrar esta ação. Reabra o relatório.' };
    }
    console.error(`[painel-analise-introducao] rpc_http_${rpc.status} code=${codigo || 'desconhecido'}`);
  } catch {
    console.error(`[painel-analise-introducao] rpc_http_${rpc.status} corpo_invalido`);
  }
  return { status: 502, erro: 'auditoria_falhou', mensagem: 'Não foi possível registrar a ação editorial. Nenhuma alteração foi salva; tente novamente.' };
}

export default async function handler(req: Request, res: Response) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  if (req.method !== 'GET' && req.method !== 'POST') return res.status(405).json({ erro: 'metodo_nao_permitido' });

  const acesso = await conferirAcesso(req.headers.authorization);
  if (acesso.ok === false) return res.status(acesso.status).json(acesso.corpo);

  const config = configuracao();
  if (!config) return res.status(500).json({ erro: 'sem_chave_de_servico', mensagem: 'O servidor não consegue revisar a análise agora.' });

  const bruto = req.method === 'GET'
    ? { id: req.query?.id, checksum: req.query?.checksum, acao: 'gerar' }
    : corpoDoPedido(req);
  const leitura = lerPedidoEditorial(bruto);
  if (leitura.ok === false) return res.status(400).json({ erro: leitura.erro, mensagem: leitura.mensagem });
  const pedido = leitura.pedido;

  try {
    const relatorio = await lerRelatorio(pedido.id, config);
    const linhaValida = validarLinhaParaAnalise(relatorio, pedido.checksum);
    if (!linhaValida.ok) return res.status(linhaValida.status).json(linhaValida);
    const contexto = contextoDoSnapshot(relatorio);
    if (!contexto) return res.status(422).json({ erro: 'contexto_indisponivel', mensagem: 'Esta versão não tem o contexto factual necessário para a análise.' });

    if (req.method === 'GET') {
      const consulta = `${config.urlSupabase}/rest/v1/relatorio_analise_sugestoes?relatorio_id=eq.${pedido.id}&relatorio_checksum=eq.${encodeURIComponent(pedido.checksum)}&secao=eq.introducao&order=gerado_em.desc&limit=1&select=id,estado,texto_atual,relatorio_checksum`;
      const resposta = await fetch(consulta, { headers: { apikey: config.chaveDeServico, Authorization: `Bearer ${config.chaveDeServico}` } });
      if (!resposta.ok) return res.status(503).json({ erro: 'auditoria_indisponivel', mensagem: 'A análise assistida ainda não está disponível nesta revisão.' });
      const [sugestao] = await resposta.json();
      return res.status(200).json({ sugestao: respostaSugestao(sugestao) });
    }

    let modelo: string | null = null;
    let textoSugerido: string | null = null;
    if (pedido.acao === 'gerar') {
      const sonnet = await chamarSonnetIntroducao(contexto);
      if (!sonnet.ok) return res.status(sonnet.status).json({ erro: sonnet.erro, mensagem: sonnet.mensagem });
      modelo = sonnet.modelo;
      textoSugerido = sonnet.texto;
    }

    const rpc = await fetch(`${config.urlSupabase}/rest/v1/rpc/registrar_sugestao_analise_introducao`, {
      method: 'POST',
      headers: { apikey: config.chaveDeServico, Authorization: `Bearer ${config.chaveDeServico}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        p_relatorio_id: pedido.id,
        p_checksum_visto: pedido.checksum,
        p_acao: pedido.acao,
        p_por: acesso.email,
        p_modelo: modelo,
        p_prompt_versao: pedido.acao === 'gerar' ? ANALISE_PROMPT_VERSAO : null,
        p_contexto_hash: pedido.acao === 'gerar' ? hashDoContexto(contexto) : null,
        p_texto_original: pedido.acao === 'gerar' ? contexto.introducaoAtual : null,
        p_texto_sugerido: textoSugerido,
        p_sugestao_id: pedido.sugestaoId ?? null,
        p_texto_editado: pedido.acao === 'editar' ? pedido.texto : null,
      }),
    });
    if (!rpc.ok) {
      const falha = await falhaDaRpc(rpc);
      return res.status(falha.status).json({ erro: falha.erro, mensagem: falha.mensagem });
    }
    const resultadoRpc = await rpc.json();
    if (!Array.isArray(resultadoRpc)) {
      console.error('[painel-analise-introducao] rpc_contrato_invalido');
      return res.status(502).json({ erro: 'auditoria_falhou', mensagem: 'Não foi possível registrar a ação editorial. Nenhuma alteração foi salva; tente novamente.' });
    }
    const [resultado] = resultadoRpc;
    if (!resultado) return res.status(409).json({ erro: 'revisao_desatualizada', mensagem: 'A revisão mudou antes de registrar esta ação. Reabra o relatório.' });
    console.log(`[painel-analise-introducao] ${pedido.acao} · ${pedido.id} · por ${acesso.email}`);
    return res.status(200).json({ sugestao: respostaSugestao(resultado) });
  } catch (erro) {
    console.error('[painel-analise-introducao] falha:', erro instanceof Error ? erro.message : erro);
    return res.status(502).json({ erro: 'analise_indisponivel', mensagem: 'Não foi possível concluir a análise agora. O texto original foi preservado.' });
  }
}
