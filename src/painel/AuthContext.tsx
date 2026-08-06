/**
 * Sessão do painel — o esqueleto do `AuthContext` da SmartBio, sem o que é
 * exclusivo de lá.
 *
 * **O que NÃO veio junto, de propósito:** `tenant`, `trialDaysLeft`,
 * `effectiveTier`, `tierError` e o rastreamento de marketing. São conceitos de
 * um produto com planos e funil de vendas; aqui não existem, e copiar o arquivo
 * inteiro traria um provedor consultando tabelas que este banco não tem.
 *
 * **O que veio e é o motivo de este arquivo existir:** o guard do
 * `lastUserIdRef`. Ver o comentário grande dentro do `useEffect`.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { obterSupabase, PainelNaoConfigurado } from './supabase';

/**
 * O que o servidor respondeu sobre esta pessoa.
 *
 * `negado` não é erro: é uma resposta legítima que tem tela própria. Misturar
 * os dois faria quem não tem acesso ver "algo deu errado" e achar que quebrou.
 */
export type Autorizacao =
  | { estado: 'autorizado'; email: string; nome: string | null }
  | { estado: 'negado'; email: string; mensagem: string }
  | { estado: 'erro'; mensagem: string };

interface ValorContexto {
  sessao: Session | null;
  usuario: User | null;
  carregando: boolean;
  autorizacao: Autorizacao | null;
  /** Configuração ausente no navegador (variáveis do Vite). */
  erroConfiguracao: string | null;
  entrarComGoogle: () => Promise<void>;
  sair: () => Promise<void>;
  reverificar: () => Promise<void>;
}

const Contexto = createContext<ValorContexto | undefined>(undefined);

/** Para onde o Google devolve a pessoa depois de entrar. */
export const ROTA_PAINEL = '/painel-de-relatorios';

async function consultarAutorizacao(sessao: Session | null): Promise<Autorizacao | null> {
  if (!sessao) return null;

  try {
    const resposta = await fetch('/api/painel-sessao', {
      method: 'GET',
      headers: { Authorization: `Bearer ${sessao.access_token}` },
    });

    // A resposta pode não ser JSON quando o endereço nem existe (ex.: alguém
    // rodou só o `vite preview`, sem as funções de servidor). Sem este cuidado
    // o painel mostraria "Unexpected token <" para o Flávio.
    let corpo: any = null;
    try {
      corpo = await resposta.json();
    } catch {
      corpo = null;
    }

    if (resposta.ok && corpo?.autorizado === true) {
      return { estado: 'autorizado', email: String(corpo.email ?? ''), nome: corpo.nome ?? null };
    }

    if (resposta.status === 403) {
      return {
        estado: 'negado',
        email: String(corpo?.email ?? sessao.user?.email ?? ''),
        mensagem: String(corpo?.mensagem ?? 'Este e-mail não tem acesso ao painel.'),
      };
    }

    if (resposta.status === 401) {
      return {
        estado: 'erro',
        mensagem: String(corpo?.mensagem ?? 'Sua sessão expirou. Entre de novo.'),
      };
    }

    return {
      estado: 'erro',
      mensagem: String(
        corpo?.mensagem ??
          `Não foi possível verificar seu acesso agora (erro ${resposta.status}).`,
      ),
    };
  } catch {
    return {
      estado: 'erro',
      mensagem: 'Não foi possível falar com o servidor para verificar seu acesso.',
    };
  }
}

export function PainelAuthProvider({ children }: { children: ReactNode }) {
  const [sessao, setSessao] = useState<Session | null>(null);
  const [autorizacao, setAutorizacao] = useState<Autorizacao | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erroConfiguracao, setErroConfiguracao] = useState<string | null>(null);

  /**
   * O guard que a SmartBio já pagou para descobrir — e que aqui custa mais caro
   * ainda se faltar.
   *
   * O `gotrue-js` reemite `SIGNED_IN` (não só `TOKEN_REFRESHED`) toda vez que a
   * aba volta a ficar visível, mesmo com a MESMA sessão. Sem comparar o usuário
   * antes e depois, cada refoco derruba `carregando`, o portão volta para a tela
   * de espera e **desmonta a página inteira**, perdendo o estado local.
   *
   * Num painel de aprovação isso é pior que na SmartBio: quem está lendo um
   * relatório de 17 seções, rola até a metade, troca de aba para conferir um
   * número no Meta e volta, perde o lugar.
   */
  const ultimoUsuarioRef = useRef<string | null>(null);

  const verificar = useCallback(async (proximaSessao: Session | null) => {
    const resultado = await consultarAutorizacao(proximaSessao);
    setAutorizacao(resultado);
  }, []);

  useEffect(() => {
    let montado = true;

    let supabase: ReturnType<typeof obterSupabase>;
    try {
      supabase = obterSupabase();
    } catch (err) {
      if (err instanceof PainelNaoConfigurado) {
        setErroConfiguracao(err.faltando.join(', '));
      } else {
        setErroConfiguracao('desconhecida');
      }
      setCarregando(false);
      return;
    }

    async function carregarSessao() {
      const { data, error } = await supabase.auth.getSession();
      if (!montado) return;

      if (error) {
        setSessao(null);
        setAutorizacao({ estado: 'erro', mensagem: error.message });
        setCarregando(false);
        return;
      }

      setSessao(data.session);
      ultimoUsuarioRef.current = data.session?.user?.id ?? null;

      try {
        await verificar(data.session);
      } finally {
        if (montado) setCarregando(false);
      }
    }

    void carregarSessao();

    const { data: ouvinte } = supabase.auth.onAuthStateChange((evento, proximaSessao) => {
      const usuarioAnterior = ultimoUsuarioRef.current;
      const proximoUsuario = proximaSessao?.user?.id ?? null;
      ultimoUsuarioRef.current = proximoUsuario;

      // Roda ANTES do guard: mesmo numa revalidação silenciosa, o token novo
      // precisa entrar no estado — é ele que vai no `Authorization` da próxima
      // chamada ao servidor.
      setSessao(proximaSessao);

      // `TOKEN_REFRESHED` é sempre silencioso. `SIGNED_IN` e `USER_UPDATED`
      // com o MESMO usuário também são: é o falso alarme do refoco de aba.
      // Reconsultar o servidor aqui não mudaria nada — a autorização é por
      // e-mail, e o e-mail não muda entre um refoco e outro.
      const revalidacaoEmSegundoPlano =
        evento === 'TOKEN_REFRESHED' ||
        ((evento === 'SIGNED_IN' || evento === 'USER_UPDATED') &&
          proximoUsuario !== null &&
          proximoUsuario === usuarioAnterior);

      if (revalidacaoEmSegundoPlano) return;

      setCarregando(true);
      void verificar(proximaSessao).finally(() => {
        if (montado) setCarregando(false);
      });
    });

    return () => {
      montado = false;
      ouvinte.subscription.unsubscribe();
    };
  }, [verificar]);

  const entrarComGoogle = useCallback(async () => {
    const supabase = obterSupabase();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}${ROTA_PAINEL}`,
        // `select_account` (e não `consent`): deixa trocar de conta sem forçar
        // a tela de consentimento inteira em todo login. Sem
        // `access_type=offline` — quem cuida da sessão é o Supabase, o refresh
        // token do Google não é usado.
        queryParams: { prompt: 'select_account' },
      },
    });
    if (error) throw error;
  }, []);

  const sair = useCallback(async () => {
    try {
      const supabase = obterSupabase();
      await supabase.auth.signOut();
    } catch {
      // Sessão já ausente ou banco fora do ar: limpar o estado local ainda é o
      // comportamento certo, e insistir no erro só prenderia a pessoa na tela.
    }
    setSessao(null);
    setAutorizacao(null);
    ultimoUsuarioRef.current = null;
  }, []);

  const reverificar = useCallback(async () => {
    setCarregando(true);
    try {
      await verificar(sessao);
    } finally {
      setCarregando(false);
    }
  }, [sessao, verificar]);

  const valor = useMemo<ValorContexto>(
    () => ({
      sessao,
      usuario: sessao?.user ?? null,
      carregando,
      autorizacao,
      erroConfiguracao,
      entrarComGoogle,
      sair,
      reverificar,
    }),
    [sessao, carregando, autorizacao, erroConfiguracao, entrarComGoogle, sair, reverificar],
  );

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function usarPainelAuth(): ValorContexto {
  const contexto = useContext(Contexto);
  if (!contexto) throw new Error('usarPainelAuth precisa estar dentro de PainelAuthProvider.');
  return contexto;
}
