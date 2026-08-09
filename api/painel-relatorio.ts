/**
 * `GET /api/painel-relatorio?id=<uuid>` — o documento completo para revisão.
 *
 * O snapshot sai apenas depois de sessão + e-mail passarem no servidor. A
 * coluna `token` não é consultada: a P2 abre o relatório dentro da bancada e
 * não precisa da credencial pública do cliente.
 */
import type { Request, Response } from 'express';
import { conferirAcesso } from './_painel-autorizacao.js';
import { montarItem, type LinhaDoBanco } from './_painel-fila-dados.js';
import { resolverMiniaturasPrivadas } from './_miniaturas-relatorio.js';
import { resolverAudiosPrivados } from './_audios-relatorio.js';

const UUID_VALIDO = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const COLUNAS = [
  'id',
  'cliente_slug',
  'competencia',
  'versao',
  'estado',
  'gerado_em',
  'checksum',
  'aprovado_por',
  'aprovado_em',
  'aprovado_checksum',
  'enviado_em',
  'enviado_para',
  'substituido_por',
  'conteudo',
].join(',');

interface LinhaDoRelatorio extends LinhaDoBanco {
  checksum: string;
  aprovado_checksum: string | null;
}

export function montarRelatorioParaRevisao(linha: LinhaDoRelatorio) {
  if (!linha.conteudo || typeof linha.conteudo !== 'object') return null;
  if (!linha.gerado_em || !linha.checksum) return null;
  if (!Number.isSafeInteger(linha.versao) || linha.versao < 1) return null;
  const identidade = (linha.conteudo as any).identidade;
  const montagem = (linha.conteudo as any).montagem;
  if (!identidade || !Array.isArray(montagem)) return null;

  const item = montarItem(linha);
  return {
    id: linha.id,
    clienteNome: item.clienteNome,
    competencia: linha.competencia,
    versao: linha.versao,
    estado: item.estado,
    sinais: item.sinais,
    conteudoCarregado: true as const,
    snapshot: {
      ...linha.conteudo,
      publicacao: {
        estado: linha.estado,
        versao: linha.versao,
        checksum: linha.checksum,
        geradoEm: linha.gerado_em,
        aprovadoPor: linha.aprovado_por,
        aprovadoEm: linha.aprovado_em,
        enviadoEm: linha.enviado_em,
        substituiVersao: null,
      },
    },
  };
}

export default async function handler(req: Request, res: Response) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');

  if (req.method !== 'GET') {
    return res.status(405).json({ erro: 'metodo_nao_permitido' });
  }

  const acesso = await conferirAcesso(req.headers['authorization']);
  if (acesso.ok === false) return res.status(acesso.status).json(acesso.corpo);

  const id = typeof req.query?.id === 'string' ? req.query.id : '';
  if (!UUID_VALIDO.test(id)) {
    return res.status(400).json({
      erro: 'relatorio_invalido',
      mensagem: 'O endereço desta revisão está incompleto. Volte para a fila e abra o relatório de novo.',
    });
  }

  const urlSupabase = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const chaveDeServico = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!urlSupabase || !chaveDeServico) {
    console.error('[painel-relatorio] Falta SUPABASE_SERVICE_ROLE_KEY (ou a URL) no ambiente.');
    return res.status(500).json({
      erro: 'sem_chave_de_servico',
      mensagem: 'O servidor do painel ainda não consegue ler este relatório.',
    });
  }

  try {
    const resposta = await fetch(
      `${urlSupabase}/rest/v1/relatorios?id=eq.${id}&select=${COLUNAS}&limit=1`,
      {
        headers: {
          apikey: chaveDeServico,
          Authorization: `Bearer ${chaveDeServico}`,
        },
      },
    );
    if (!resposta.ok) throw new Error(`HTTP ${resposta.status} — ${await resposta.text()}`);

    const [linha] = (await resposta.json()) as LinhaDoRelatorio[];
    if (!linha) {
      return res.status(404).json({
        erro: 'relatorio_nao_encontrado',
        mensagem: 'Este relatório não está mais disponível. Volte para a fila e escolha outra versão.',
      });
    }

    const relatorio = montarRelatorioParaRevisao(linha);
    if (!relatorio) {
      return res.status(422).json({
        erro: 'conteudo_incompleto',
        mensagem: 'O relatório existe, mas o conteúdo não chegou inteiro. Ele não pode ser revisado.',
      });
    }

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

    return res.status(200).json({ relatorio });
  } catch (erro) {
    console.error(
      '[painel-relatorio] Falha ao ler o relatório:',
      erro instanceof Error ? erro.message : erro,
    );
    return res.status(502).json({
      erro: 'leitura_indisponivel',
      mensagem: 'Não foi possível carregar este relatório agora. Tente novamente em instantes.',
    });
  }
}
