/**
 * Anúncio de visita, do lado do navegador (estatísticas de uso, 26/11/2026).
 *
 * Manda ao NOSSO servidor (`/api/painel-sessao?modo=visita`) que esta página foi
 * aberta. Nada vai para terceiro. Falha é silenciosa: contar visita nunca pode
 * atrapalhar quem está usando a página.
 */
import { useEffect, useRef } from 'react';

export type AreaVisitada = 'painel-relatorios' | 'reunioes' | 'propostas' | 'relatorio-cliente' | 'estatisticas';

const CHAVE_VISITANTE = 'dacora-visitante';
const CHAVE_EQUIPE = 'dacora-equipe-neste-navegador';

function lerLocal(chave: string): string | null {
  try {
    return window.localStorage.getItem(chave);
  } catch {
    return null;
  }
}

function gravarLocal(chave: string, valor: string) {
  try {
    window.localStorage.setItem(chave, valor);
  } catch {
    /* navegador sem armazenamento: segue sem lembrar */
  }
}

function visitante(): string {
  const atual = lerLocal(CHAVE_VISITANTE);
  if (atual && /^[a-z0-9-]{8,64}$/i.test(atual)) return atual;
  const novo =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  gravarLocal(CHAVE_VISITANTE, novo);
  return novo;
}

/**
 * A sessão do painel que ESTE navegador já tem, lida sem carregar a biblioteca
 * do Supabase (o relatório do cliente não baixa o cliente de autenticação).
 */
export function sessaoGuardada(): string | null {
  try {
    const url = import.meta.env.VITE_SUPABASE_URL;
    if (!url) return null;
    const projeto = new URL(url).hostname.split('.')[0];
    const bruto = lerLocal(`sb-${projeto}-auth-token`);
    const token = bruto ? JSON.parse(bruto)?.access_token : null;
    return typeof token === 'string' && token ? token : null;
  } catch {
    return null;
  }
}

export async function anunciarVisita(area: AreaVisitada, opcoes: { token?: string | null; relatorio?: string } = {}) {
  try {
    const resposta = await fetch('/api/painel-sessao?modo=visita', {
      method: 'POST',
      keepalive: true,
      headers: {
        'Content-Type': 'application/json',
        ...(opcoes.token ? { Authorization: `Bearer ${opcoes.token}` } : {}),
      },
      body: JSON.stringify({
        area,
        caminho: area === 'relatorio-cliente' ? null : window.location.pathname,
        visitante: visitante(),
        relatorio: opcoes.relatorio,
        equipe_neste_navegador: lerLocal(CHAVE_EQUIPE) === '1',
      }),
    });
    const corpo = await resposta.json().catch(() => null);
    // Lembra que este navegador é da equipe, para a prévia de relatório não contar como cliente.
    if (corpo?.equipe === true && area !== 'relatorio-cliente') gravarLocal(CHAVE_EQUIPE, '1');
  } catch {
    /* contar visita nunca atrapalha a página */
  }
}

/**
 * Anuncia uma vez por pessoa e por endereço enquanto a página está aberta. A troca
 * de token (renovação da sessão) não conta visita nova.
 */
export function useAnunciarVisita(area: AreaVisitada, token: string | null | undefined, pessoa: string | null | undefined, endereco: string) {
  const ultimo = useRef<string | null>(null);
  const tokenAtual = useRef(token);
  tokenAtual.current = token;
  useEffect(() => {
    if (!tokenAtual.current || !pessoa) return;
    const chave = `${pessoa}|${endereco}`;
    if (ultimo.current === chave) return;
    ultimo.current = chave;
    void anunciarVisita(area, { token: tokenAtual.current });
  }, [area, pessoa, endereco, Boolean(token)]);
}
