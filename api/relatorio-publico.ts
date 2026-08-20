/**
 * `GET /api/relatorio-publico?token=<credencial>` — leitura externa sem login.
 *
 * O token é tratado como credencial: só é aceito no servidor, nunca é
 * devolvido no JSON e só abre a versão final cujo recibo AV4 amarra o
 * documento, o snapshot factual e a aprovação persistida.
 */
import type { Request, Response } from 'express';
import { montarRelatorioParaRevisao } from './painel-relatorio.js';
import { resolverMiniaturasPrivadas } from './_miniaturas-relatorio.js';
import { resolverAudiosPrivados } from './_audios-relatorio.js';

const TOKEN_VALIDO = /^[A-Za-z0-9_-]{32,128}$/;

const COLUNAS = [
  'id',
  'cliente_slug',
  'competencia',
  'versao',
  'estado',
  'gerado_em',
  'checksum',
  'checksum_factual_editorial',
  'aprovado_por',
  'aprovado_em',
  'aprovado_checksum',
  'enviado_em',
  'enviado_para',
  'substituido_por',
  'revogado_em',
  'conteudo',
].join(',');

interface LinhaPublica {
  id: string;
  cliente_slug: string;
  competencia: string;
  versao: number;
  estado: string;
  gerado_em: string;
  checksum: string;
  checksum_factual_editorial: string | null;
  aprovado_por: string | null;
  aprovado_em: string | null;
  aprovado_checksum: string | null;
  enviado_em: string | null;
  enviado_para: string | null;
  substituido_por: string | null;
  revogado_em: string | null;
  conteudo: object;
}

interface FechamentoEditorial {
  relatorio_id: string;
  cliente_slug: string;
  competencia: string;
  relatorio_versao: number;
  checksum_documento: string;
  checksum_factual: string;
  aprovado_checksum: string;
}

function linhaPodeSerPublicada(linha: LinhaPublica) {
  return linha.estado === 'liberado'
    && linha.revogado_em === null
    && linha.substituido_por === null
    && Boolean(linha.aprovado_por)
    && Boolean(linha.aprovado_em)
    && linha.aprovado_checksum === linha.checksum
    && Boolean(linha.checksum_factual_editorial);
}

function fechamentoConfere(linha: LinhaPublica, fechamento: FechamentoEditorial | undefined) {
  return Boolean(fechamento)
    && fechamento.relatorio_id === linha.id
    && fechamento.cliente_slug === linha.cliente_slug
    && fechamento.competencia === linha.competencia
    && fechamento.relatorio_versao === linha.versao
    && fechamento.checksum_documento === linha.checksum
    && fechamento.checksum_factual === linha.checksum_factual_editorial
    && fechamento.aprovado_checksum === linha.aprovado_checksum;
}

function indisponivel(res: Response) {
  return res.status(404).json({
    erro: 'relatorio_indisponivel',
    mensagem: 'Este relatório não está disponível. Peça um novo link à Dácora.',
  });
}

export default async function handler(req: Request, res: Response) {
  res.setHeader('Cache-Control', 'private, no-store, no-cache, must-revalidate');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
  res.setHeader('Referrer-Policy', 'no-referrer');

  if (req.method !== 'GET') {
    return res.status(405).json({ erro: 'metodo_nao_permitido' });
  }

  const parametros = new URL(req.url, 'https://relatorio.dacora.local').searchParams;
  const tokens = parametros.getAll('token');
  const token = tokens.length === 1 ? tokens[0] : '';
  if (!TOKEN_VALIDO.test(token)) return indisponivel(res);

  const urlSupabase = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const chaveDeServico = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!urlSupabase || !chaveDeServico) {
    console.error('[relatorio-publico] Faltam URL ou service role no ambiente.');
    return res.status(503).json({
      erro: 'leitura_indisponivel',
      mensagem: 'O relatório está temporariamente indisponível. Tente novamente em instantes.',
    });
  }

  try {
    const filtros = [
      `token=eq.${encodeURIComponent(token)}`,
      'estado=eq.liberado',
      'revogado_em=is.null',
      'substituido_por=is.null',
      `select=${COLUNAS}`,
      'limit=1',
    ].join('&');
    const resposta = await fetch(`${urlSupabase}/rest/v1/relatorios?${filtros}`, {
      headers: {
        apikey: chaveDeServico,
        Authorization: `Bearer ${chaveDeServico}`,
      },
    });
    if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);

    const [linha] = (await resposta.json()) as LinhaPublica[];
    if (!linha || !linhaPodeSerPublicada(linha)) return indisponivel(res);

    const respostaFechamento = await fetch(
      `${urlSupabase}/rest/v1/relatorio_fechamentos_editoriais?relatorio_id=eq.${encodeURIComponent(linha.id)}` +
        '&select=relatorio_id,cliente_slug,competencia,relatorio_versao,checksum_documento,checksum_factual,aprovado_checksum&limit=1',
      {
        headers: {
          apikey: chaveDeServico,
          Authorization: `Bearer ${chaveDeServico}`,
        },
      },
    );
    if (!respostaFechamento.ok) throw new Error(`fechamento HTTP ${respostaFechamento.status}`);
    const [fechamento] = (await respostaFechamento.json()) as FechamentoEditorial[];
    if (!fechamentoConfere(linha, fechamento)) return indisponivel(res);

    const relatorio = montarRelatorioParaRevisao(linha as any);
    if (!relatorio) return indisponivel(res);

    relatorio.snapshot = await resolverMiniaturasPrivadas(
      relatorio.snapshot,
      { clienteSlug: linha.cliente_slug, competencia: linha.competencia },
      { urlSupabase, chaveDeServico },
    );
    relatorio.snapshot = await resolverAudiosPrivados(
      relatorio.snapshot,
      {
        clienteSlug: linha.cliente_slug,
        competencia: linha.competencia,
        versao: linha.versao,
      },
      { urlSupabase, chaveDeServico },
    );

    return res.status(200).json({
      relatorio: {
        clienteNome: relatorio.clienteNome,
        competencia: relatorio.competencia,
        versao: relatorio.versao,
        conteudoCarregado: true,
        snapshot: relatorio.snapshot,
      },
    });
  } catch (erro) {
    console.error(
      '[relatorio-publico] Falha ao ler o relatório:',
      erro instanceof Error ? erro.message : erro,
    );
    return res.status(502).json({
      erro: 'leitura_indisponivel',
      mensagem: 'O relatório está temporariamente indisponível. Tente novamente em instantes.',
    });
  }
}
