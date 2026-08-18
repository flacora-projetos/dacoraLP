/**
 * AV4 — política de retenção do histórico editorial depois do fechamento final.
 *
 * GET lê apenas o recibo seguro. POST aceita somente a ação destrutiva explícita
 * de descartar histórico; o padrão `arquivar` nasce no fechamento e não exige
 * clique extra. Quem executa vem da sessão, nunca do navegador.
 */
import type { Request, Response } from 'express';
import { conferirAcesso } from './_painel-autorizacao.js';

const UUID_VALIDO = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CONFIRMACAO_DESCARTE = 'DESCARTAR HISTORICO';

interface FechamentoDoBanco {
  id: string;
  relatorio_id: string;
  politica_retencao: 'arquivar' | 'descartar_historico';
  fechado_por: string;
  fechado_em: string;
  historico_descartado_por: string | null;
  historico_descartado_em: string | null;
  historico_descartado_quantidade: number | null;
}

function corpo(req: Request): Record<string, unknown> | null {
  const bruto = (req as any).body;
  if (typeof bruto === 'string') {
    try {
      const parsed = JSON.parse(bruto);
      return parsed && typeof parsed === 'object' ? parsed : null;
    } catch {
      return null;
    }
  }
  return bruto && typeof bruto === 'object' ? bruto as Record<string, unknown> : null;
}

function config() {
  const urlSupabase = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const chaveDeServico = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return urlSupabase && chaveDeServico ? { urlSupabase, chaveDeServico } : null;
}

function headers(chave: string, json = false): Record<string, string> {
  return {
    apikey: chave,
    Authorization: `Bearer ${chave}`,
    ...(json ? { 'Content-Type': 'application/json' } : {}),
  };
}

async function lerFechamento(relatorioId: string, urlSupabase: string, chave: string) {
  const resposta = await fetch(
    `${urlSupabase}/rest/v1/relatorio_fechamentos_editoriais?relatorio_id=eq.${encodeURIComponent(relatorioId)}` +
      '&select=id,relatorio_id,politica_retencao,fechado_por,fechado_em,historico_descartado_por,historico_descartado_em,historico_descartado_quantidade&limit=1',
    { headers: headers(chave) },
  );
  if (!resposta.ok) throw new Error(`leitura_fechamento_http_${resposta.status}`);
  const linhas = await resposta.json() as FechamentoDoBanco[];
  return Array.isArray(linhas) ? linhas[0] ?? null : null;
}

function estadoSeguro(linha: FechamentoDoBanco) {
  return {
    fechado: true as const,
    politica: linha.politica_retencao,
    fechadoPor: linha.fechado_por,
    fechadoEm: linha.fechado_em,
    historicoDescartadoPor: linha.historico_descartado_por,
    historicoDescartadoEm: linha.historico_descartado_em,
    historicoDescartadoQuantidade: linha.historico_descartado_quantidade,
  };
}

export default async function handler(req: Request, res: Response) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ erro: 'metodo_nao_permitido' });
  }

  const acesso = await conferirAcesso(req.headers['authorization']);
  if (acesso.ok === false) return res.status(acesso.status).json(acesso.corpo);

  const dados = req.method === 'GET' ? null : corpo(req);
  const id = req.method === 'GET'
    ? (typeof req.query?.id === 'string' ? req.query.id : '')
    : (typeof dados?.id === 'string' ? dados.id.trim() : '');
  if (!UUID_VALIDO.test(id)) {
    return res.status(400).json({ erro: 'relatorio_invalido', mensagem: 'Não foi possível identificar o relatório fechado.' });
  }

  const configuracao = config();
  if (!configuracao) {
    return res.status(500).json({ erro: 'sem_chave_de_servico', mensagem: 'O servidor ainda não consegue consultar a retenção editorial.' });
  }

  try {
    const fechamento = await lerFechamento(id, configuracao.urlSupabase, configuracao.chaveDeServico);
    if (!fechamento) {
      return res.status(404).json({ erro: 'fechamento_nao_encontrado', mensagem: 'Esta versão ainda não possui fechamento editorial final.' });
    }

    if (req.method === 'GET') {
      return res.status(200).json({ retencao: estadoSeguro(fechamento) });
    }

    const acao = typeof dados?.acao === 'string' ? dados.acao.trim() : '';
    const confirmacao = typeof dados?.confirmacao === 'string' ? dados.confirmacao.trim() : '';
    if (acao !== 'descartar_historico') {
      return res.status(400).json({ erro: 'acao_invalida', mensagem: 'A única alteração de retenção disponível é descartar o histórico já arquivado.' });
    }
    if (confirmacao !== CONFIRMACAO_DESCARTE) {
      return res.status(400).json({ erro: 'confirmacao_descarte_invalida', mensagem: `Digite exatamente ${CONFIRMACAO_DESCARTE} para confirmar.` });
    }

    const resposta = await fetch(`${configuracao.urlSupabase}/rest/v1/rpc/descartar_historico_editorial`, {
      method: 'POST',
      headers: headers(configuracao.chaveDeServico, true),
      body: JSON.stringify({
        p_fechamento_id: fechamento.id,
        p_por: acesso.email,
        p_confirmacao: CONFIRMACAO_DESCARTE,
      }),
    });
    if (!resposta.ok) {
      const texto = await resposta.text();
      console.warn(`[painel-retencao-editorial] descarte recusado para ${id}: ${texto.slice(0, 160)}`);
      return res.status(409).json({ erro: 'descarte_recusado', mensagem: 'O banco recusou o descarte. O histórico permanece arquivado.' });
    }

    const depois = await lerFechamento(id, configuracao.urlSupabase, configuracao.chaveDeServico);
    if (!depois || depois.politica_retencao !== 'descartar_historico' || !depois.historico_descartado_em) {
      return res.status(502).json({ erro: 'read_back_reprovado', mensagem: 'O descarte foi solicitado, mas o recibo de retenção não confirmou a mudança. Não repita a ação.' });
    }

    console.log(`[painel-retencao-editorial] histórico descartado · ${id} · por ${acesso.email} · ${depois.historico_descartado_quantidade ?? 0} revisão(ões)`);
    return res.status(200).json({ retencao: estadoSeguro(depois) });
  } catch (erro) {
    console.error('[painel-retencao-editorial] Falha:', erro instanceof Error ? erro.message : erro);
    return res.status(502).json({ erro: 'retencao_indisponivel', mensagem: 'Não foi possível consultar a retenção editorial agora.' });
  }
}
