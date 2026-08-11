/** `GET /api/painel-historico?id=<uuid>` — P6 somente leitura. */
import type { Request, Response } from 'express';
import { conferirAcesso } from './_painel-autorizacao.js';
import {
  montarHistoricoSeguro,
  type LinhaDoHistoricoP4,
} from './_painel-historico-dados.js';
import type { LinhaDoPortalP5 } from './_painel-envio-regras.js';

const UUID_VALIDO = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const COLUNAS_P4 = [
  'id', 'cliente_slug', 'competencia', 'versao', 'estado', 'gerado_em', 'checksum',
  'aprovado_por', 'aprovado_em', 'aprovado_checksum',
  'recusado_por', 'recusado_em', 'recusa_motivo',
  'correcao_ordem_id', 'correcao_estado', 'correcao_solicitado_em',
  'correcao_nova_versao_relatorio_id', 'correcao_nova_versao',
  'notificacao_interna_id', 'notificacao_interna_estado',
  'enviado_em', 'substituido_por', 'revogado_em',
].join(',');

const COLUNAS_P5 = [
  'relatorio_id', 'cliente_nome', 'competencia', 'relatorio_versao', 'checksum',
  'relatorio_estado', 'aprovado_por', 'aprovado_em', 'aprovado_checksum',
  'enviado_em', 'ja_enviado', 'destino_referencia', 'destinatario_nome',
  'destinatario_habilitado', 'destinatario_sincronizado_em', 'envio_id',
  'envio_estado', 'solicitado_por', 'solicitado_em', 'confirmado_em',
  'erro_codigo', 'pode_solicitar_envio',
].join(',');

function configuracaoDoBanco() {
  const urlSupabase = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const chaveDeServico = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return urlSupabase && chaveDeServico ? { urlSupabase, chaveDeServico } : null;
}

function cabecalhos(chaveDeServico: string) {
  return { apikey: chaveDeServico, Authorization: `Bearer ${chaveDeServico}` };
}

async function lerJson<T>(url: string, chaveDeServico: string): Promise<T> {
  const resposta = await fetch(url, { headers: cabecalhos(chaveDeServico) });
  if (!resposta.ok) throw new Error(`HTTP ${resposta.status} — ${await resposta.text()}`);
  return resposta.json() as Promise<T>;
}

export default async function handler(req: Request, res: Response) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  if (req.method !== 'GET') return res.status(405).json({ erro: 'metodo_nao_permitido' });

  const acesso = await conferirAcesso(req.headers['authorization']);
  if (acesso.ok === false) return res.status(acesso.status).json(acesso.corpo);

  const id = typeof req.query?.id === 'string' ? req.query.id : '';
  if (!UUID_VALIDO.test(id)) {
    return res.status(400).json({
      erro: 'relatorio_invalido',
      mensagem: 'O endereço do histórico está incompleto. Reabra o relatório pela fila.',
    });
  }

  const configuracao = configuracaoDoBanco();
  if (!configuracao) {
    console.error('[painel-historico] Falta SUPABASE_SERVICE_ROLE_KEY (ou a URL) no ambiente.');
    return res.status(500).json({
      erro: 'sem_chave_de_servico',
      mensagem: 'O servidor do painel ainda não consegue consultar o histórico.',
    });
  }

  const { urlSupabase, chaveDeServico } = configuracao;
  try {
    const referencia = await lerJson<Array<{
      relatorio_id: string;
      cliente_slug: string;
      cliente_nome: string;
    }>>(
      `${urlSupabase}/rest/v1/relatorio_p5_portal?relatorio_id=eq.${encodeURIComponent(id)}` +
        '&select=relatorio_id,cliente_slug,cliente_nome&limit=1',
      chaveDeServico,
    );
    const origem = referencia[0];
    if (!origem?.cliente_slug || origem.relatorio_id !== id) {
      return res.status(404).json({
        erro: 'relatorio_nao_encontrado',
        mensagem: 'Este relatório não está disponível no histórico.',
      });
    }

    const filtroCliente = encodeURIComponent(origem.cliente_slug);
    const [linhasP4, linhasP5] = await Promise.all([
      lerJson<LinhaDoHistoricoP4[]>(
        `${urlSupabase}/rest/v1/painel_relatorios_com_correcao?cliente_slug=eq.${filtroCliente}` +
          `&select=${COLUNAS_P4}&order=competencia.desc,versao.desc`,
        chaveDeServico,
      ),
      lerJson<LinhaDoPortalP5[]>(
        `${urlSupabase}/rest/v1/relatorio_p5_portal?cliente_slug=eq.${filtroCliente}` +
          `&select=${COLUNAS_P5}&order=competencia.desc,relatorio_versao.desc`,
        chaveDeServico,
      ),
    ]);

    const montagem = montarHistoricoSeguro(
      origem.cliente_slug,
      origem.cliente_nome,
      linhasP4,
      linhasP5,
    );
    if (montagem.ok === false) {
      console.error(`[painel-historico] Read-back inválido para ${id}: ${montagem.motivo}.`);
      return res.status(502).json({
        erro: 'read_back_reprovado',
        mensagem: `O histórico não passou na conferência: ${montagem.motivo}.`,
      });
    }
    return res.status(200).json({ historico: montagem.historico });
  } catch (erro) {
    console.error('[painel-historico] Falha:', erro instanceof Error ? erro.message : erro);
    return res.status(502).json({
      erro: 'historico_indisponivel',
      mensagem: 'Não foi possível carregar o histórico agora. Tente novamente em instantes.',
    });
  }
}
