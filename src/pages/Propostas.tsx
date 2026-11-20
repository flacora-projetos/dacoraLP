import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { Session } from '@supabase/supabase-js';
import { obterSupabase } from '../painel/supabase';
import { usaPaginaPrivada } from '../painel/usaPaginaPrivada';
import { situacoesPropostas, type Proposta, type RegistroProposta, type SituacaoProposta } from '../propostas/tipos';
import '../reunioes/reunioes.css';
import './propostas.css';

const API = '/api/painel-sessao?modo=painel-propostas';
const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const data = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Sao_Paulo' });
const filtros = {
  todas: 'Todas',
  andamento: 'Em andamento',
  fechada: 'Fechadas',
  'sem-acordo': 'Sem acordo',
  'sem-situacao': 'Sem situação',
} as const;
type Filtro = keyof typeof filtros;
type Detalhe = { tipo: 'cadastro' } | { tipo: 'proposta'; proposta: Proposta };

class Falha extends Error {
  constructor(readonly status: number, mensagem: string) {
    super(mensagem);
  }
}

async function chamar<T>(token: string, corpo?: object, slug?: string, signal?: AbortSignal): Promise<T> {
  const resposta = await fetch(slug ? `${API}&slug=${encodeURIComponent(slug)}` : API, {
    method: corpo ? 'POST' : 'GET',
    headers: { Authorization: `Bearer ${token}`, ...(corpo && { 'Content-Type': 'application/json' }) },
    body: corpo ? JSON.stringify(corpo) : undefined,
    signal,
  });
  const resultado = await resposta.json().catch(() => null);
  if (!resposta.ok || !resultado) throw new Falha(resposta.status, resultado?.mensagem || 'Não foi possível acessar o painel agora.');
  return resultado;
}

function pertence(proposta: Proposta, filtro: Filtro) {
  return filtro === 'todas' || proposta.situacao === filtro ||
    (filtro === 'andamento' && ['enviada', 'negociacao'].includes(proposta.situacao));
}

function enderecoDaProposta(texto: string) {
  const entrada = texto.trim();
  if (/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(entrada)) return entrada;
  try {
    const url = new URL(entrada, window.location.origin);
    const valido = url.origin === window.location.origin || url.origin === 'https://www.dacora.com.br';
    return valido && !url.username && !url.password
      ? /^\/propostas\/([a-z0-9]+(?:-[a-z0-9]+)*)\/?$/.exec(url.pathname)?.[1]
      : undefined;
  } catch {
    return undefined;
  }
}

export default function Propostas() {
  usaPaginaPrivada('Propostas | Dácora');
  const [sessao, definirSessao] = useState<Session | null>(null);
  const [carregando, definirCarregando] = useState(true);
  const [lista, definirLista] = useState<{ pessoa: string; propostas: Proposta[] } | null>(null);
  const [erro, definirErro] = useState('');
  const [tentativa, renovar] = useState(0);
  const [filtro, definirFiltro] = useState<Filtro>('todas');
  const [detalhe, definirDetalhe] = useState<Detalhe | null>(null);
  const [aviso, definirAviso] = useState('');
  const token = sessao?.access_token;
  const pessoa = sessao?.user.id;
  const propostas = lista?.pessoa === pessoa ? lista?.propostas : undefined;

  useEffect(() => {
    let cancelar: (() => void) | undefined;
    try {
      const supabase = obterSupabase();
      const { data: inscricao } = supabase.auth.onAuthStateChange((_evento, atual) => {
        definirSessao(atual);
        if (!atual) {
          definirLista(null);
          definirDetalhe(null);
          definirCarregando(false);
        }
      });
      cancelar = () => inscricao.subscription.unsubscribe();
    } catch {
      definirErro('O login Google ainda não está configurado.');
      definirCarregando(false);
    }
    return cancelar;
  }, []);

  useEffect(() => {
    if (!token || !pessoa) return;
    const abortar = new AbortController();
    definirCarregando(true);
    definirErro('');
    void chamar<{ propostas: Proposta[] }>(token, undefined, undefined, abortar.signal)
      .then(({ propostas }) => {
        if (!abortar.signal.aborted) definirLista({ pessoa, propostas });
      })
      .catch((falha: Error) => {
        if (abortar.signal.aborted) return;
        definirLista(null);
        definirDetalhe(null);
        definirErro(falha.message);
      })
      .finally(() => {
        if (!abortar.signal.aborted) definirCarregando(false);
      });
    return () => abortar.abort();
  }, [token, pessoa, tentativa]);

  async function entrar() {
    definirErro('');
    try {
      const { error } = await obterSupabase().auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/propostas/`,
          queryParams: { prompt: 'select_account' },
        },
      });
      if (error) throw error;
    } catch {
      definirErro('Não foi possível abrir a entrada pelo Google. Tente novamente.');
    }
  }

  async function sair() {
    const { error } = await obterSupabase().auth.signOut({ scope: 'local' });
    if (error) definirAviso('Não foi possível sair agora. Tente novamente.');
  }

  if (!propostas || !token) {
    return (
      <div className="dcr">
        <main className="dcr-portao">
          <span className="dcr-marca">dácora<span aria-hidden="true">®</span></span>
          <p className="dcr-sobrancelha">Área da equipe</p>
          <h1>Propostas <span className="dcr-propostas-destaque">em dia.</span></h1>
          <p>Acompanhe negociações, registre fechamentos e consulte o histórico da equipe.</p>
          {erro && <p className="dcr-erro" role="alert">{erro}</p>}
          {carregando ? <p role="status">Conferindo seu acesso…</p> : (
            <>
              <button className="dcr-primario" onClick={() => void entrar()}>
                {sessao ? 'Trocar conta Google' : 'Entrar com Google'} <span aria-hidden="true">↗</span>
              </button>
              {sessao && <button onClick={() => renovar(n => n + 1)}>Conferir acesso novamente</button>}
            </>
          )}
        </main>
      </div>
    );
  }

  const visiveis = propostas.filter(proposta => pertence(proposta, filtro));
  const gruposComercial = ['andamento', 'fechada', 'sem-acordo'] as const;
  function atualizado(mensagem: string) {
    definirDetalhe(null);
    definirAviso(mensagem);
    renovar(n => n + 1);
  }

  return (
    <div className="dcr dcr-propostas">
      <header className="dcr-propostas-topo">
        <div className="dcr-propostas-largura">
          <div className="dcr-propostas-marca">
            <span className="dcr-marca">dácora<span aria-hidden="true">®</span></span>
            <button onClick={() => void sair()}>Sair</button>
          </div>
          <p className="dcr-sobrancelha">Equipe Dácora</p>
          <h1>Propostas</h1>
          <div className="dcr-propostas-placar" aria-label="Resumo das propostas">
            {gruposComercial.map(grupo => {
              const itens = propostas!.filter(proposta => pertence(proposta, grupo));
              const valores = itens.flatMap(({ valor_centavos }) => valor_centavos === null ? [] : [valor_centavos]);
              const total = valores.reduce((soma, valor) => soma + valor, 0);
              return (
                <button key={grupo} type="button" aria-pressed={filtro === grupo} onClick={() => definirFiltro(grupo)}>
                  <strong>{itens.length}</strong>
                  <span>{filtros[grupo]}</span>
                  {grupo !== 'sem-acordo' && valores.length > 0 && (
                    <small>{moeda.format(total / 100)}{valores.length < itens.length && ' em valores informados'}</small>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </header>
      <main className="dcr-propostas-largura dcr-propostas-lista">
        <div className="dcr-propostas-comandos">
          <h2>Propostas da equipe</h2>
          <button className="dcr-primario" onClick={() => definirDetalhe({ tipo: 'cadastro' })}>Adicionar proposta</button>
        </div>
        <div className="dcr-propostas-filtros" aria-label="Filtrar propostas">
          {(Object.keys(filtros) as Filtro[]).map(grupo => (
            <button key={grupo} className={filtro === grupo ? 'dcr-primario' : ''} aria-pressed={filtro === grupo} onClick={() => definirFiltro(grupo)}>
              {filtros[grupo]}
            </button>
          ))}
        </div>
        <p role="status" className="dcr-propostas-aviso">{aviso}</p>
        {visiveis.length ? (
          <ul className="dcr-propostas-itens">
            {visiveis.map(proposta => (
              <li key={proposta.slug}>
                <div>
                  <strong>{proposta.cliente}</strong>
                  <p>{proposta.titulo}</p>
                </div>
                <span className="dcr-propostas-situacao" data-situacao={proposta.situacao}>
                  {situacoesPropostas[proposta.situacao]}
                </span>
                <span className="dcr-propostas-valor">
                  {proposta.valor_centavos === null ? 'Valor a definir' : moeda.format(proposta.valor_centavos / 100)}
                </span>
                <button aria-label={`Ver detalhes de ${proposta.cliente}`} onClick={() => definirDetalhe({ tipo: 'proposta', proposta })}>
                  Detalhes
                </button>
              </li>
            ))}
          </ul>
        ) : <p>Nenhuma proposta nesta situação.</p>}
      </main>
      {detalhe && (
        <DetalhesProposta
          key={pessoa}
          detalhe={detalhe}
          token={token}
          fechar={() => definirDetalhe(null)}
          atualizado={atualizado}
        />
      )}
    </div>
  );
}

function DetalhesProposta({ detalhe, token, fechar, atualizado }: {
  detalhe: Detalhe; token: string; fechar: () => void; atualizado: (mensagem: string) => void;
}) {
  const caixa = useRef<HTMLDialogElement>(null);
  const [historico, definirHistorico] = useState<RegistroProposta[] | null>(null);
  const [erroHistorico, definirErroHistorico] = useState(false);
  const [erro, definirErro] = useState('');
  const [salvando, definirSalvando] = useState(false);
  const proposta = detalhe.tipo === 'proposta' ? detalhe.proposta : undefined;
  const slug = proposta?.slug;

  useEffect(() => {
    caixa.current?.showModal();
  }, []);

  useEffect(() => {
    if (!slug) return;
    const abortar = new AbortController();
    void chamar<{ historico: RegistroProposta[] }>(token, undefined, slug, abortar.signal)
      .then(({ historico }) => {
        if (!abortar.signal.aborted) definirHistorico(historico);
      })
      .catch(() => {
        if (!abortar.signal.aborted) definirErroHistorico(true);
      });
    return () => abortar.abort();
  }, [slug, token]);

  async function salvar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (salvando) return;
    const campos = new FormData(evento.currentTarget);
    const endereco = proposta?.slug ?? enderecoDaProposta(String(campos.get('link') ?? ''));
    if (!endereco) {
      definirErro('Informe um link de proposta da Dácora ou seu endereço.');
      return;
    }
    definirSalvando(true);
    definirErro('');
    try {
      const valor = campos.get('valor');
      await chamar(token, proposta ? {
        acao: 'situacao', slug: endereco, revisao: proposta.revisao, situacao: campos.get('situacao'),
      } : {
        acao: 'cadastrar', slug: endereco, cliente: campos.get('cliente'), titulo: campos.get('titulo'),
        valor_centavos: valor ? Math.round(Number(valor) * 100) : null,
      });
      caixa.current?.close();
      atualizado(proposta ? 'Situação atualizada.' : 'Proposta adicionada ao painel.');
    } catch (falha) {
      if (proposta && falha instanceof Falha && falha.status === 409) {
        caixa.current?.close();
        atualizado(falha.message);
        return;
      }
      definirErro(falha instanceof Error ? falha.message : 'Não foi possível salvar agora.');
      definirSalvando(false);
    }
  }

  return (
    <dialog ref={caixa} className="dcr-propostas-detalhe" aria-labelledby="dcr-propostas-detalhe-titulo" onClose={fechar}
      onCancel={evento => { if (salvando) evento.preventDefault(); }}>
      <div className="dcr-propostas-comandos">
        <h2 id="dcr-propostas-detalhe-titulo">{proposta?.cliente ?? 'Adicionar proposta'}</h2>
        <button type="button" aria-label="Fechar detalhes" disabled={salvando} onClick={() => caixa.current?.close()}>×</button>
      </div>
      {proposta && (
        <>
          <p>{proposta.titulo}</p>
          <p>{proposta.valor_centavos === null ? 'Valor a definir' : moeda.format(proposta.valor_centavos / 100)}</p>
          <a className="dcr-propostas-link" href={`/propostas/${proposta.slug}`} target="_blank" rel="noreferrer">
            Abrir link da proposta ↗
          </a>
        </>
      )}
      <form onSubmit={salvar}>
        {proposta ? (
          <label>
            Situação da proposta
            <select name="situacao" defaultValue={proposta.situacao}>
              {(Object.entries(situacoesPropostas) as [SituacaoProposta, string][]).map(([situacao, label]) => (
                <option key={situacao} value={situacao}>{label}</option>
              ))}
            </select>
          </label>
        ) : (
          <>
            <label>Link da proposta<input name="link" maxLength={250} required /></label>
            <label>Cliente<input name="cliente" maxLength={120} required /></label>
            <label>Título da proposta<input name="titulo" maxLength={180} required /></label>
            <label>Valor da proposta (opcional)<input name="valor" type="number" min="0" max="21474836.47" step=".01" inputMode="decimal" /></label>
          </>
        )}
        {erro && <p className="dcr-erro" role="alert">{erro}</p>}
        <button className="dcr-primario" type="submit" disabled={salvando}>
          {salvando ? 'Salvando…' : proposta ? 'Salvar situação' : 'Adicionar ao painel'}
        </button>
      </form>
      {proposta && (
        <section className="dcr-propostas-historico">
          <h3>Histórico</h3>
          {erroHistorico ? <p>Não foi possível carregar o histórico.</p> : historico === null ? (
            <p role="status">Carregando histórico…</p>
          ) : historico.length ? (
            <ul>{historico.map(registro => (
              <li key={`${registro.criado_em}-${registro.situacao}`}>
                {situacoesPropostas[registro.situacao]} · {registro.autor} · {data.format(new Date(registro.criado_em))}
              </li>
            ))}</ul>
          ) : <p>Nenhuma mudança de situação registrada.</p>}
        </section>
      )}
    </dialog>
  );
}
