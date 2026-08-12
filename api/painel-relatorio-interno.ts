/**
 * `GET /api/painel-relatorio-interno?id=<uuid>` — o detalhe do MENSAL INTERNO
 * ALLGROTECH (A3), insumo para a parceira, nunca documento de cliente.
 *
 * Endpoint NOVO, separado de `api/painel-relatorio.ts` de propósito: aquele
 * espera `conteudo.montagem` (array), e o núcleo factual interno não tem
 * `montagem` — tem `identidade`, `configuracao`, `origem`, `contextoFactual`,
 * gravadas no topo do `conteudo` (ver
 * `docs/HANDOFF_PILOTOS_MENSAL_INTERNO_ALLGROTECH_2026-08-12.md` no
 * `OpenClaw-Dacora`). Tentar reaproveitar o endpoint do externo faria os 4
 * pilotos continuarem batendo em 422 `conteudo_incompleto`, que é exatamente
 * o defeito medido que esta fase corrige.
 *
 * Este endpoint é SOMENTE LEITURA: não tem verbo de decisão, não grava nada,
 * não importa nada do fluxo de aprovar/recusar/enviar. A escolha do produto
 * é sempre por `conteudo.identidade.produto === 'mensal_interno_allgrotech'`,
 * nunca pelo nome ou pelo slug do cliente — a chave de armazenamento
 * (`<slug>__interno_allgrotech`) é um detalhe da tabela, não do domínio.
 */
import type { Request, Response } from 'express';
import { conferirAcesso } from './_painel-autorizacao.js';
import { resolverMiniaturasPrivadasInterno } from './_miniaturas-interno.js';

const UUID_VALIDO = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const COLUNAS = [
  'id',
  'cliente_slug',
  'competencia',
  'versao',
  'estado',
  'gerado_em',
  'checksum',
  'substituido_por',
  'revogado_em',
  'conteudo',
].join(',');

interface LinhaDoBanco {
  id: string;
  cliente_slug: string;
  competencia: string;
  versao: number;
  estado: string;
  gerado_em: string | null;
  checksum: string;
  substituido_por: string | null;
  revogado_em: string | null;
  conteudo: any;
}

export interface DetalheInterno {
  id: string;
  competencia: string;
  versao: number;
  estado: string;
  geradoEm: string | null;
  checksum: string;
  ehVersaoCorrente: boolean;
  conteudoCarregado: true;
  nucleoFactual: any;
  notasHumanas: any;
  rastreabilidade: any;
}

/**
 * Monta o objeto de resposta a partir da linha do banco, ou `null` quando a
 * linha não é deste produto ou está incompleta. Devolver `null` em vez de
 * lançar deixa o handler escolher a mensagem certa (404 vs. 422), igual ao
 * padrão do endpoint externo.
 */
export function montarDetalheInterno(linha: LinhaDoBanco): DetalheInterno | null {
  if (!linha.conteudo || typeof linha.conteudo !== 'object') return null;
  if (!linha.gerado_em || !linha.checksum) return null;
  if (!Number.isSafeInteger(linha.versao) || linha.versao < 1) return null;

  const conteudo = linha.conteudo as any;
  if (conteudo.identidade?.produto !== 'mensal_interno_allgrotech') return null;
  if (!conteudo.identidade || !conteudo.configuracao || !conteudo.origem || !conteudo.contextoFactual) {
    return null;
  }

  return {
    id: linha.id,
    competencia: linha.competencia,
    versao: linha.versao,
    estado: linha.estado,
    geradoEm: linha.gerado_em,
    checksum: linha.checksum,
    ehVersaoCorrente: !linha.substituido_por && !linha.revogado_em,
    conteudoCarregado: true,
    nucleoFactual: {
      schemaVersion: conteudo.schemaVersion,
      identidade: conteudo.identidade,
      configuracao: conteudo.configuracao,
      origem: conteudo.origem,
      contextoFactual: conteudo.contextoFactual,
    },
    notasHumanas: conteudo.notasHumanas ?? null,
    rastreabilidade: conteudo.rastreabilidade ?? null,
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
      mensagem: 'O endereço deste detalhe está incompleto. Volte para a fila e abra de novo.',
    });
  }

  const urlSupabase = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const chaveDeServico = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!urlSupabase || !chaveDeServico) {
    console.error('[painel-relatorio-interno] Falta SUPABASE_SERVICE_ROLE_KEY (ou a URL) no ambiente.');
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

    const [linha] = (await resposta.json()) as LinhaDoBanco[];
    if (!linha) {
      return res.status(404).json({
        erro: 'relatorio_nao_encontrado',
        mensagem: 'Este relatório não está mais disponível. Volte para a fila.',
      });
    }

    const detalhe = montarDetalheInterno(linha);
    if (!detalhe) {
      return res.status(422).json({
        erro: 'conteudo_incompleto',
        mensagem: 'Este relatório não é um mensal interno Allgrotech válido, ou o conteúdo não chegou inteiro.',
      });
    }

    detalhe.nucleoFactual = await resolverMiniaturasPrivadasInterno(
      detalhe.nucleoFactual,
      { urlSupabase, chaveDeServico },
    );

    return res.status(200).json({ detalhe });
  } catch (erro) {
    console.error(
      '[painel-relatorio-interno] Falha ao ler o relatório:',
      erro instanceof Error ? erro.message : erro,
    );
    return res.status(502).json({
      erro: 'leitura_indisponivel',
      mensagem: 'Não foi possível carregar este relatório agora. Tente novamente em instantes.',
    });
  }
}
