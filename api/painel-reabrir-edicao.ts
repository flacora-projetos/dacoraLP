import type { Request, Response } from 'express';
import { conferirAcesso } from './_painel-autorizacao.js';

const UUID_VALIDO = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function corpoDoPedido(req: Request): Record<string, unknown> | null {
  const bruto = (req as any).body;
  if (typeof bruto === 'string') {
    try {
      const parsed = JSON.parse(bruto);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }
  return bruto && typeof bruto === 'object' && !Array.isArray(bruto) ? bruto : null;
}

const ERROS: Record<string, { status: number; mensagem: string }> = {
  relatorio_nao_encontrado: { status: 404, mensagem: 'Este relatório não está mais disponível. Atualize a fila.' },
  checksum_divergente: { status: 409, mensagem: 'Este relatório mudou desde que a fila foi carregada. Atualize antes de voltar para edição.' },
  versao_fora_de_circulacao: { status: 409, mensagem: 'Esta versão foi substituída ou revogada e não pode voltar para edição.' },
  relatorio_ja_enviado: { status: 409, mensagem: 'Este relatório já foi enviado e permanece imutável.' },
  relatorio_nao_liberado: { status: 409, mensagem: 'Este relatório não está aprovado agora. Atualize a fila para ver o estado atual.' },
  envio_ja_solicitado: { status: 409, mensagem: 'O envio deste relatório já entrou no workflow. Por segurança, a aprovação não pode ser removida enquanto existir uma intenção de envio.' },
  reabertura_nao_aplicada: { status: 409, mensagem: 'O estado mudou durante a operação. Atualize a fila; nada deve ser tratado como reaberto.' },
};

function traduzirErro(texto: string) {
  for (const [codigo, detalhe] of Object.entries(ERROS)) {
    if (new RegExp(`\\b${codigo}\\b`).test(texto)) return { erro: codigo, ...detalhe };
  }
  return {
    erro: 'reabertura_recusada',
    status: 502,
    mensagem: 'O banco recusou a reabertura. Atualize a fila para conferir o estado antes de tentar novamente.',
  };
}

export default async function handler(req: Request, res: Response) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  if (req.method !== 'POST') return res.status(405).json({ erro: 'metodo_nao_permitido' });

  const acesso = await conferirAcesso(req.headers.authorization);
  if (acesso.ok === false) return res.status(acesso.status).json(acesso.corpo);

  const corpo = corpoDoPedido(req);
  const id = typeof corpo?.id === 'string' ? corpo.id.trim() : '';
  const checksum = typeof corpo?.checksum === 'string' ? corpo.checksum.trim() : '';
  if (!UUID_VALIDO.test(id) || !checksum) {
    return res.status(400).json({
      erro: 'pedido_invalido',
      mensagem: 'A reabertura precisa do relatório e da impressão digital que estavam na fila.',
      reaberto: false,
    });
  }

  const urlSupabase = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const chaveDeServico = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!urlSupabase || !chaveDeServico) {
    return res.status(500).json({
      erro: 'sem_chave_de_servico',
      mensagem: 'O servidor ainda não consegue registrar a volta para edição.',
      reaberto: false,
    });
  }

  try {
    const resposta = await fetch(`${urlSupabase}/rest/v1/rpc/reabrir_relatorio_para_edicao`, {
      method: 'POST',
      headers: {
        apikey: chaveDeServico,
        Authorization: `Bearer ${chaveDeServico}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        p_relatorio_id: id,
        p_checksum_visto: checksum,
        p_por: acesso.email,
      }),
    });

    if (!resposta.ok) {
      const traducao = traduzirErro(await resposta.text());
      return res.status(traducao.status).json({
        erro: traducao.erro,
        mensagem: traducao.mensagem,
        reaberto: false,
      });
    }

    const retorno = await resposta.json() as Array<{ relatorio_id?: string; estado?: string; checksum?: string; reaberto_por?: string }>;
    const linha = Array.isArray(retorno) ? retorno[0] : null;
    if (!linha || linha.relatorio_id !== id || linha.estado !== 'gerado' || linha.checksum !== checksum || linha.reaberto_por !== acesso.email) {
      return res.status(502).json({
        erro: 'read_back_reprovado',
        mensagem: 'A reabertura não voltou com os dados esperados. Atualize a fila antes de continuar.',
        reaberto: false,
      });
    }

    console.log(`[painel-reabrir-edicao] ${id} · por ${acesso.email}`);
    return res.status(200).json({
      reaberto: true,
      mensagem: 'A aprovação foi removida e o relatório voltou para edição.',
      relatorio: { id, estado: 'gerado', checksum },
    });
  } catch (erro) {
    console.error('[painel-reabrir-edicao] falha:', erro instanceof Error ? erro.message : erro);
    return res.status(502).json({
      erro: 'reabertura_indisponivel',
      mensagem: 'Não foi possível voltar o relatório para edição agora. Atualize a fila antes de tentar novamente.',
      reaberto: false,
    });
  }
}
