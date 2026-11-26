/**
 * Visitas às páginas da Dácora — o contador próprio e a leitura das estatísticas.
 *
 * Pedido do PO em 26/11/2026: saber quem usa, quanto e se volta, nas páginas
 * painel de relatórios, reuniões, propostas, Fluxo e painel da Black, mais o
 * link do mensal que o cliente recebe e a própria página de estatísticas.
 *
 * Por que contador próprio, e não Google Analytics: as páginas privadas são, de
 * propósito, livres de rastreador de terceiro (`scripts/verifica-casca-privada.mjs`
 * reprova `gtag`/`fbq` na casca). Aqui nada sai para outra empresa: a visita é
 * gravada no nosso banco pela chave de serviço, só no servidor.
 *
 * Três regras que não podem mudar:
 * 1. **Ninguém grava visita anônima numa área de login.** Painel, reuniões,
 *    propostas, estatísticas e Fluxo exigem sessão válida (conferida no Supabase
 *    certo); o relatório exige um link de relatório que existe. Sem isso, o
 *    pedido é recusado e nada é gravado — o contador não vira porta de lixo.
 * 2. **O link do relatório nunca é gravado.** Ele é credencial; guardamos só de
 *    qual cliente e de qual mês ele fala, resolvido aqui no servidor.
 * 3. **As estatísticas são só da equipe** (`conferirAcesso`, a mesma lista do
 *    painel de relatórios).
 */
import type { Request, Response } from 'express';
import {
  conferirAcesso,
  emailAutorizado,
  entrouPeloGoogle,
  extrairTokenBearer,
  lerListaAutorizada,
  normalizarEmail,
  type UsuarioSupabase,
} from './_painel-autorizacao.js';
import { resumirVisitas, type LinhaVisita } from './_visitas-resumo.js';

export const AREAS = [
  'painel-relatorios',
  'reunioes',
  'propostas',
  'painel-black',
  'relatorio-cliente',
  'fluxo',
  'estatisticas',
] as const;
export type Area = (typeof AREAS)[number];

/** Áreas que o navegador pode anunciar. O painel da Black é contado pelo servidor que entrega a página. */
const AREAS_DO_NAVEGADOR: ReadonlySet<string> = new Set(AREAS.filter((a) => a !== 'painel-black'));
/** Único endereço de fora do site autorizado a anunciar visita (o Fluxo). */
export const ORIGEM_DO_FLUXO = 'https://crm.dacora.com.br';
const VISITANTE = /^[a-z0-9-]{8,64}$/i;
const TOKEN_RELATORIO = /^[A-Za-z0-9_-]{16,200}$/;
const DIAS_DA_LEITURA = 120;

export interface DependenciasVisitas {
  buscar?: typeof fetch;
  agora?: () => Date;
}

class Recusa extends Error {
  constructor(readonly status: number, mensagem: string) {
    super(mensagem);
  }
}

function texto(valor: unknown, limite: number): string | null {
  if (typeof valor !== 'string') return null;
  const t = valor.trim();
  return t ? t.slice(0, limite) : null;
}

/** Caminho sem consulta nem fragmento, e só dentro da área anunciada. */
export function caminhoSeguro(area: string, valor: unknown): string | null {
  // O caminho do relatório carrega o link (credencial): nunca é guardado.
  if (area === 'relatorio-cliente') return null;
  const bruto = texto(valor, 300);
  if (!bruto || !bruto.startsWith('/')) return null;
  const limpo = bruto.split(/[?#]/)[0];
  return /^[/a-z0-9._-]*$/i.test(limpo) ? limpo : null;
}

function corpoDoPedido(req: Request): Record<string, unknown> {
  // O Fluxo manda como texto simples para o navegador não precisar de pré-consulta.
  if (typeof req.body === 'string') {
    try {
      const lido = JSON.parse(req.body);
      return lido && typeof lido === 'object' && !Array.isArray(lido) ? lido : {};
    } catch {
      return {};
    }
  }
  return req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? req.body : {};
}

function banco(buscar: typeof fetch) {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !chave) throw new Recusa(503, 'O contador de visitas ainda não está configurado.');
  return async (caminho: string, init: RequestInit = {}) => {
    const resposta = await buscar(`${url}/rest/v1/${caminho}`, {
      ...init,
      headers: {
        apikey: chave,
        Authorization: `Bearer ${chave}`,
        'Content-Type': 'application/json',
        ...(init.headers as Record<string, string> | undefined),
      },
      signal: AbortSignal.timeout(10000),
    });
    if (!resposta.ok) throw new Recusa(503, 'Não foi possível falar com o banco agora.');
    return resposta;
  };
}

/** Quem é a pessoa, conferido no Supabase de onde veio a sessão. */
async function quemE(
  token: string,
  area: string,
  buscar: typeof fetch,
): Promise<{ email: string; equipe: boolean }> {
  const fluxo = area === 'fluxo';
  const url = fluxo ? process.env.FLUXO_SUPABASE_URL : process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const chave = fluxo
    ? process.env.FLUXO_SUPABASE_ANON_KEY
    : process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !chave) throw new Recusa(503, 'O contador de visitas ainda não está configurado.');
  const resposta = await buscar(`${url}/auth/v1/user`, {
    headers: { apikey: chave, Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(10000),
  });
  if (!resposta.ok) throw new Recusa(401, 'Sessão inválida.');
  const usuario = (await resposta.json()) as UsuarioSupabase;
  const email = typeof usuario?.email === 'string' ? normalizarEmail(usuario.email) : '';
  if (!email) throw new Recusa(401, 'Sessão sem e-mail.');
  // No site, só vale conta Google (a mesma regra do painel). O Fluxo tem login próprio.
  if (!fluxo && !entrouPeloGoogle(usuario)) throw new Recusa(403, 'Sessão fora do Google.');
  const equipe = emailAutorizado(email, lerListaAutorizada(process.env.PAINEL_EMAILS_AUTORIZADOS));
  return { email, equipe };
}

async function relatorioDoLink(token: string, consultar: ReturnType<typeof banco>): Promise<string> {
  if (!TOKEN_RELATORIO.test(token)) throw new Recusa(404, 'Relatório não encontrado.');
  const resposta = await consultar(
    `relatorios?token=eq.${encodeURIComponent(token)}&select=cliente_slug,competencia&limit=1`,
  );
  const [linha] = (await resposta.json()) as Array<{ cliente_slug?: string; competencia?: string }>;
  if (!linha?.cliente_slug || !linha?.competencia) throw new Recusa(404, 'Relatório não encontrado.');
  return `${linha.cliente_slug}/${String(linha.competencia).slice(0, 7)}`;
}

export interface NovaVisita {
  area: Area;
  caminho: string | null;
  email: string | null;
  equipe: boolean;
  visitante: string | null;
  relatorio: string | null;
}

/** Grava uma visita. Usado pelo pedido do navegador e pelo servidor do painel da Black. */
export async function gravarVisita(visita: NovaVisita, dependencias: DependenciasVisitas = {}) {
  const consultar = banco(dependencias.buscar ?? fetch);
  await consultar('portal_visitas', {
    method: 'POST',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify(visita),
  });
}

function permitirFluxo(req: Request, res: Response) {
  if (req.headers.origin === ORIGEM_DO_FLUXO) {
    res.setHeader('Access-Control-Allow-Origin', ORIGEM_DO_FLUXO);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
    res.setHeader('Access-Control-Max-Age', '86400');
  }
}

/** `POST /api/painel-sessao?modo=visita` — o navegador anuncia que abriu uma página. */
export async function atenderVisita(req: Request, res: Response, dependencias: DependenciasVisitas = {}) {
  permitirFluxo(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ erro: 'metodo_nao_permitido' });
  const buscar = dependencias.buscar ?? fetch;
  try {
    const corpo = corpoDoPedido(req);
    const area = texto(corpo.area, 40) ?? '';
    if (!AREAS_DO_NAVEGADOR.has(area)) throw new Recusa(400, 'Área desconhecida.');
    // Só o Fluxo pode anunciar de fora do site, e só a área dele.
    const origem = typeof req.headers.origin === 'string' ? req.headers.origin : '';
    if (origem === ORIGEM_DO_FLUXO && area !== 'fluxo') throw new Recusa(403, 'Origem não autorizada.');
    if (area === 'fluxo' && origem !== ORIGEM_DO_FLUXO) throw new Recusa(403, 'Origem não autorizada.');

    const visitanteBruto = texto(corpo.visitante, 64);
    const visitante = visitanteBruto && VISITANTE.test(visitanteBruto) ? visitanteBruto : null;
    const token = extrairTokenBearer(req.headers.authorization);

    let email: string | null = null;
    let equipe = false;
    let relatorio: string | null = null;
    if (area === 'relatorio-cliente') {
      relatorio = await relatorioDoLink(texto(corpo.relatorio, 200) ?? '', banco(buscar));
      // Quem é da equipe e está logada no mesmo navegador aparece como equipe,
      // para a prévia da Fernanda não contar como "o cliente abriu".
      if (token) {
        try {
          ({ email, equipe } = await quemE(token, area, buscar));
        } catch {
          /* sessão vencida não impede contar a abertura */
        }
      }
      if (!equipe && corpo.equipe_neste_navegador === true) equipe = true;
    } else {
      if (!token) throw new Recusa(401, 'Sem sessão.');
      ({ email, equipe } = await quemE(token, area, buscar));
    }

    await gravarVisita(
      { area: area as Area, caminho: caminhoSeguro(area, corpo.caminho), email, equipe, visitante, relatorio },
      dependencias,
    );
    return res.status(200).json({ ok: true, equipe });
  } catch (erro) {
    const status = erro instanceof Recusa ? erro.status : 503;
    if (!(erro instanceof Recusa)) console.error('[visitas] Falha ao gravar:', erro instanceof Error ? erro.message : erro);
    return res.status(status).json({ ok: false });
  }
}

/** `GET /api/painel-sessao?modo=estatisticas` — o resumo, só para a equipe. */
export async function atenderEstatisticas(req: Request, res: Response, dependencias: DependenciasVisitas = {}) {
  if (req.method !== 'GET') return res.status(405).json({ erro: 'metodo_nao_permitido' });
  const acesso = await conferirAcesso(req.headers.authorization);
  if (acesso.ok === false) return res.status(acesso.status).json(acesso.corpo);
  try {
    const agora = (dependencias.agora ?? (() => new Date()))();
    const desde = new Date(agora.getTime() - DIAS_DA_LEITURA * 86400000).toISOString();
    const consultar = banco(dependencias.buscar ?? fetch);
    const linhas: LinhaVisita[] = [];
    // Leitura em páginas de mil: o banco devolve no máximo isso por vez.
    for (let inicio = 0; inicio < 50000; inicio += 1000) {
      const resposta = await consultar(
        `portal_visitas?criado_em=gte.${encodeURIComponent(desde)}` +
          '&select=criado_em,area,caminho,email,equipe,visitante,relatorio&order=criado_em.asc',
        { headers: { Range: `${inicio}-${inicio + 999}`, 'Range-Unit': 'items' } },
      );
      const pagina = (await resposta.json()) as LinhaVisita[];
      linhas.push(...pagina);
      if (pagina.length < 1000) break;
    }
    return res.status(200).json(resumirVisitas(linhas, agora));
  } catch (erro) {
    const status = erro instanceof Recusa ? erro.status : 503;
    console.error('[visitas] Falha na leitura:', erro instanceof Error ? erro.message : erro);
    return res.status(status).json({ mensagem: 'Não foi possível ler as estatísticas agora.' });
  }
}
