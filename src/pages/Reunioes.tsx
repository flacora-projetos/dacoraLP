import { useEffect, useRef, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { obterSupabase } from '../painel/supabase';
import { usaPaginaPrivada } from '../painel/usaPaginaPrivada';
import AreaReunioes from '../reunioes/AreaReunioes';
import type { IdentidadeReunioes } from '../reunioes/tipos';
import '../reunioes/reunioes.css';

export default function Reunioes() {
  usaPaginaPrivada('Reuniões | Dácora');
  const [sessao, setSessao] = useState<Session | null>(null);
  const [usuario, setUsuario] = useState<IdentidadeReunioes | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [tentativa, setTentativa] = useState(0);
  const identidadeAnterior = useRef<string | null>(null);
  useEffect(() => {
    let ativo = true;
    try {
      const supabase = obterSupabase();
      void supabase.auth.getSession().then(({ data, error }) => {
        if (!ativo) return;
        if (error) setErro('Não foi possível recuperar sua entrada. Entre novamente.');
        setSessao(data.session);
        if (!data.session) setCarregando(false);
      });
      const { data } = supabase.auth.onAuthStateChange((_evento, proxima) => {
        if (!ativo) return;
        setSessao(proxima);
        if (!proxima) {
          identidadeAnterior.current = null;
          setUsuario(null);
          setCarregando(false);
        }
      });
      return () => {
        ativo = false;
        data.subscription.unsubscribe();
      };
    } catch {
      setErro('A área de reuniões ainda não está configurada.');
      setCarregando(false);
    }
    return () => {
      ativo = false;
    };
  }, []);
  useEffect(() => {
    if (!sessao) return;
    const abortar = new AbortController();
    const mudouPessoa = identidadeAnterior.current !== sessao.user.id;
    identidadeAnterior.current = sessao.user.id;
    if (mudouPessoa) {
      setUsuario(null);
      setCarregando(true);
    }
    setErro('');
    void fetch('/api/painel-sessao?modo=reunioes&acao=sessao', {
      headers: { Authorization: `Bearer ${sessao.access_token}` },
      signal: abortar.signal,
    })
      .then(async (resposta) => {
        const corpo = await resposta.json();
        if (!resposta.ok)
          throw new Error(corpo.mensagem || 'Não foi possível conferir seu convite.');
        if (!abortar.signal.aborted) setUsuario(corpo.usuario);
      })
      .catch((e) => {
        if (!abortar.signal.aborted) {
          setUsuario(null);
          setErro(e instanceof Error ? e.message : 'Não foi possível conferir sua entrada.');
        }
      })
      .finally(() => {
        if (!abortar.signal.aborted) setCarregando(false);
      });
    return () => abortar.abort();
  }, [sessao?.access_token, tentativa]);

  async function entrar() {
    setErro('');
    try {
      const { error } = await obterSupabase().auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}${window.location.pathname}${window.location.search}`,
          queryParams: { prompt: 'select_account' },
        },
      });
      if (error) throw error;
    } catch {
      setErro('Não foi possível abrir a entrada pelo Google. Tente novamente.');
    }
  }
  async function sair() {
    await obterSupabase().auth.signOut();
    setUsuario(null);
    setSessao(null);
  }
  return (
    <div className="dcr">
      {usuario && sessao && !carregando ? (
        <AreaReunioes
          key={usuario.id}
          usuario={usuario}
          token={sessao.access_token}
          aoSair={sair}
        />
      ) : (
        <main className="dcr-portao">
          <span className="dcr-marca">
            dácora<span>®</span>
          </span>
          <p className="dcr-sobrancelha">UM LUGAR PARA ALINHAR</p>
          <h1>
            Boas conversas.
            <br />
            Próximos passos claros.
          </h1>
          <p>Consulte as pautas, registre decisões e acompanhe os combinados das suas reuniões.</p>
          {carregando ? (
            <p role="status">Conferindo seu acesso…</p>
          ) : (
            <>
              {erro && (
                <p role="alert" className="dcr-erro">
                  {erro}
                </p>
              )}
              {sessao && <p>Você entrou como {sessao.user.email}.</p>}
              <button className="dcr-primario" onClick={() => void entrar()}>
                {sessao ? 'Trocar conta Google' : 'Entrar com Google'}{' '}
                <span aria-hidden="true">↗</span>
              </button>
              {sessao && (
                <button onClick={() => setTentativa((t) => t + 1)}>
                  Conferir acesso novamente
                </button>
              )}
              <small>Acesso individual, apenas às reuniões em que você foi convidado.</small>
            </>
          )}
        </main>
      )}
    </div>
  );
}
