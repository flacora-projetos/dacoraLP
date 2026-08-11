/**
 * `GET/POST /api/painel-envio` — leitura e solicitação server-side da P5.
 *
 * O navegador nunca fala com a view/RPC diretamente. Esta função repete
 * sessão + allow-list, usa `service_role` somente no servidor e devolve uma
 * projeção sem token, id bruto do grupo, referência interna ou chave de
 * idempotência.
 */
import type { Request, Response } from 'express';
import { conferirAcesso } from './_painel-autorizacao.js';
import {
  conferirSolicitacaoComReadBack,
  lerPedidoDeEnvio,
  montarEstadoSeguroDoEnvio,
  traduzirErroDaFabrica,
  type LinhaDoPortalP5,
  type PedidoDeEnvioP5,
  type RetornoDaSolicitacaoP5,
} from './_painel-envio-regras.js';

const UUID_VALIDO = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function corpoDoPedido(req: Request): unknown {
  const bruto = (req as any).body;
  if (typeof bruto === 'string') {
    try {
      return JSON.parse(bruto);
    } catch {
      return null;
    }
  }
  return bruto ?? null;
}

function configuracaoDoBanco() {
  const urlSupabase = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const chaveDeServico = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return urlSupabase && chaveDeServico ? { urlSupabase, chaveDeServico } : null;
}

function cabecalhos(chaveDeServico: string, comJson = false): Record<string, string> {
  return {
    apikey: chaveDeServico,
    Authorization: `Bearer ${chaveDeServico}`,
    ...(comJson ? { 'Content-Type': 'application/json' } : {}),
  };
}

async function lerLinha(
  relatorioId: string,
  urlSupabase: string,
  chaveDeServico: string,
): Promise<LinhaDoPortalP5 | null> {
  const resposta = await fetch(
    `${urlSupabase}/rest/v1/relatorio_p5_portal?relatorio_id=eq.${encodeURIComponent(relatorioId)}&select=*`,
    { headers: cabecalhos(chaveDeServico) },
  );
  if (!resposta.ok) throw new Error(`leitura P5: HTTP ${resposta.status} — ${await resposta.text()}`);
  const linhas = (await resposta.json()) as LinhaDoPortalP5[];
  return Array.isArray(linhas) ? linhas[0] ?? null : null;
}

function responderEstado(res: Response, linha: LinhaDoPortalP5 | null) {
  if (!linha) {
    return res.status(404).json({
      erro: 'relatorio_nao_encontrado',
      mensagem: 'Este relatório não está disponível no contrato de envio. Volte para a fila.',
    });
  }
  const montagem = montarEstadoSeguroDoEnvio(linha);
  if (montagem.ok === false) {
    console.error(`[painel-envio] Read-back inválido para ${linha.relatorio_id}: ${montagem.motivo}.`);
    return res.status(502).json({
      erro: 'read_back_reprovado',
      mensagem:
        `O estado do envio não passou na conferência: ${montagem.motivo}. ` +
        'Nada deve ser tratado como enviado.',
    });
  }
  return res.status(200).json({ envio: montagem.estado });
}

async function solicitar(
  pedido: PedidoDeEnvioP5,
  quem: string,
  res: Response,
  urlSupabase: string,
  chaveDeServico: string,
) {
  const resposta = await fetch(`${urlSupabase}/rest/v1/rpc/relatorio_p5_solicitar_envio`, {
    method: 'POST',
    headers: cabecalhos(chaveDeServico, true),
    body: JSON.stringify({
      p_relatorio_id: pedido.id,
      p_checksum_visto: pedido.checksumVisto,
      // A identidade vem da sessão conferida no servidor, nunca do navegador.
      p_solicitado_por: quem,
    }),
  });

  if (!resposta.ok) {
    const texto = await resposta.text();
    const traducao = traduzirErroDaFabrica(texto);
    console.warn(`[painel-envio] Solicitação recusada para ${pedido.id} (${traducao.erro}).`);
    return res.status(traducao.status).json({
      erro: traducao.erro,
      mensagem: traducao.mensagem,
      solicitado: false,
    });
  }

  const retornos = (await resposta.json()) as RetornoDaSolicitacaoP5[];
  const retorno = Array.isArray(retornos) ? retornos[0] ?? null : null;
  const linha = await lerLinha(pedido.id, urlSupabase, chaveDeServico);
  const conferencia = conferirSolicitacaoComReadBack(retorno, linha, pedido, quem);
  if (conferencia.ok === false) {
    console.error(`[painel-envio] Read-back reprovou ${pedido.id}: ${conferencia.motivo}.`);
    return res.status(502).json({
      erro: 'read_back_reprovado',
      mensagem:
        `A solicitação chegou à fábrica, mas a conferência de volta não bateu: ${conferencia.motivo}. ` +
        'Não repita o clique; reabra a revisão para ler o estado durável.',
      solicitado: false,
    });
  }

  const montagem = montarEstadoSeguroDoEnvio(linha as LinhaDoPortalP5);
  if (montagem.ok === false) {
    return res.status(502).json({
      erro: 'read_back_reprovado',
      mensagem: `A intenção existe, mas o estado de volta é inconsistente: ${montagem.motivo}.`,
      solicitado: false,
    });
  }

  console.log(
    `[painel-envio] intenção ${conferencia.jaExistia ? 'deduplicada' : 'criada'} · ` +
      `${pedido.id} · por ${quem}`,
  );
  return res.status(200).json({
    solicitado: true,
    jaExistia: conferencia.jaExistia,
    mensagem: conferencia.jaExistia
      ? 'Esta solicitação já existia e não foi duplicada.'
      : 'Envio solicitado. A entrega só será confirmada quando o recibo voltar da fábrica.',
    envio: montagem.estado,
  });
}

export default async function handler(req: Request, res: Response) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');

  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ erro: 'metodo_nao_permitido' });
  }

  const acesso = await conferirAcesso(req.headers['authorization']);
  if (acesso.ok === false) return res.status(acesso.status).json(acesso.corpo);

  let pedido: PedidoDeEnvioP5;
  if (req.method === 'GET') {
    const id = typeof req.query?.id === 'string' ? req.query.id : '';
    if (!UUID_VALIDO.test(id)) {
      return res.status(400).json({
        erro: 'relatorio_invalido',
        mensagem: 'O endereço do envio está incompleto. Volte para a fila e abra a revisão novamente.',
      });
    }
    pedido = { id, checksumVisto: '' };
  } else {
    const leitura = lerPedidoDeEnvio(corpoDoPedido(req));
    if (leitura.ok === false) {
      return res.status(400).json({ erro: leitura.erro, mensagem: leitura.mensagem, solicitado: false });
    }
    pedido = leitura.pedido;
  }

  const configuracao = configuracaoDoBanco();
  if (!configuracao) {
    console.error('[painel-envio] Falta SUPABASE_SERVICE_ROLE_KEY (ou a URL) no ambiente.');
    return res.status(500).json({
      erro: 'sem_chave_de_servico',
      mensagem: 'O servidor do painel ainda não consegue consultar o contrato de envio.',
    });
  }

  try {
    if (req.method === 'GET') {
      const linha = await lerLinha(pedido.id, configuracao.urlSupabase, configuracao.chaveDeServico);
      return responderEstado(res, linha);
    }
    return await solicitar(
      pedido,
      acesso.email,
      res,
      configuracao.urlSupabase,
      configuracao.chaveDeServico,
    );
  } catch (erro) {
    console.error('[painel-envio] Falha:', erro instanceof Error ? erro.message : erro);
    return res.status(502).json({
      erro: 'envio_indisponivel',
      mensagem: 'Não foi possível consultar a fábrica agora. Reabra a revisão antes de tentar novamente.',
      ...(req.method === 'POST' ? { solicitado: false } : {}),
    });
  }
}
