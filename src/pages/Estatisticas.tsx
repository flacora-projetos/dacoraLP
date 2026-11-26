/**
 * `/estatisticas` — uso e retenção das páginas da Dácora (pedido do PO, 26/11/2026).
 *
 * Só a equipe (mesma lista do painel de relatórios, conferida no servidor). A
 * própria página também é contada. Números vêm prontos do servidor
 * (`api/_visitas-resumo.ts`); aqui só se desenha.
 */
import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { obterSupabase } from '../painel/supabase';
import { usaPaginaPrivada } from '../painel/usaPaginaPrivada';
import { useAnunciarVisita } from '../visitas';
import '../reunioes/reunioes.css';
import './estatisticas.css';

interface Pessoa { pessoa: string; equipe: boolean; visitas30: number; diasAtivos30: number; semanasAtivas4: number; ultima: string }
interface Area {
  area: string;
  visitas7: number; visitas30: number; pessoas7: number; pessoas30: number;
  retencao: { semanaAnterior: number; voltaram: number };
  semanas: Array<{ semana: string; pessoas: number; visitas: number }>;
  diario: Array<{ dia: string; visitas: number }>;
  pessoas: Pessoa[];
}
interface Relatorio { relatorio: string; aberturasCliente: number; visitantesCliente: number; primeiraCliente: string | null; ultimaCliente: string | null; aberturasEquipe: number }
interface Resumo { geradoEm: string; areas: Area[]; relatorios: Relatorio[] }

/** Ordem e nomes de gente. Área sem nenhuma visita ainda aparece com zero. */
const AREAS: Array<[string, string]> = [
  ['painel-relatorios', 'Painel de relatórios'],
  ['reunioes', 'Reuniões'],
  ['propostas', 'Propostas'],
  ['fluxo', 'Dácora Fluxo'],
  ['painel-black', 'Painel da Black (Sant’Alberti)'],
  ['relatorio-cliente', 'Relatório do cliente (link do mensal)'],
  ['estatisticas', 'Esta página'],
];

const quando = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Sao_Paulo' });
const diaCurto = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
const mesDe = (ref: string) => {
  const [cliente, mes] = ref.split('/');
  return { cliente, mes: mes ? `${mes.slice(5, 7)}/${mes.slice(0, 4)}` : '' };
};
const nomeDaPessoa = (p: string) => (p.startsWith('visitante:') ? `Navegador sem login (${p.slice(10)})` : p);

function vazia(area: string): Area {
  return { area, visitas7: 0, visitas30: 0, pessoas7: 0, pessoas30: 0, retencao: { semanaAnterior: 0, voltaram: 0 }, semanas: [], diario: [], pessoas: [] };
}

function Semanas({ semanas }: { semanas: Area['semanas'] }) {
  const maior = Math.max(1, ...semanas.map((s) => s.pessoas));
  return (
    <div className="dce-semanas" aria-label="Pessoas por semana, últimas 8 semanas">
      {semanas.map((s) => (
        <div key={s.semana} className="dce-semana" title={`Semana de ${diaCurto(s.semana)}: ${s.pessoas} pessoa(s), ${s.visitas} visita(s)`}>
          <span className="dce-barra" style={{ height: `${(s.pessoas / maior) * 100}%` }} />
          <small>{diaCurto(s.semana)}</small>
        </div>
      ))}
    </div>
  );
}

function CartaoArea({ nome, area }: { nome: string; area: Area }) {
  const { semanaAnterior, voltaram } = area.retencao;
  return (
    <section className="dce-cartao">
      <h2>{nome}</h2>
      <div className="dce-numeros">
        <div><strong>{area.visitas7}</strong><span>visitas em 7 dias</span></div>
        <div><strong>{area.visitas30}</strong><span>visitas em 30 dias</span></div>
        <div><strong>{area.pessoas30}</strong><span>pessoas em 30 dias</span></div>
        <div>
          <strong>{semanaAnterior ? `${voltaram} de ${semanaAnterior}` : '—'}</strong>
          <span>voltaram esta semana</span>
        </div>
      </div>
      {area.semanas.length > 0 && <Semanas semanas={area.semanas} />}
      {area.pessoas.length > 0 && (
        <div className="dce-tabela-rolagem">
          <table className="dce-tabela">
            <thead>
              <tr><th>Pessoa</th><th>Visitas (30 dias)</th><th>Dias de uso (30)</th><th>Semanas de uso (últimas 4)</th><th>Última visita</th></tr>
            </thead>
            <tbody>
              {area.pessoas.map((p) => (
                <tr key={p.pessoa}>
                  <td>{nomeDaPessoa(p.pessoa)}{p.equipe && <em className="dce-selo">equipe</em>}</td>
                  <td>{p.visitas30}</td>
                  <td>{p.diasAtivos30}</td>
                  <td>{p.semanasAtivas4} de 4</td>
                  <td>{quando.format(new Date(p.ultima))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {area.pessoas.length === 0 && <p className="dce-nada">Nenhuma visita registrada ainda.</p>}
    </section>
  );
}

export default function Estatisticas() {
  usaPaginaPrivada('Estatísticas | Dácora');
  const [sessao, definirSessao] = useState<Session | null>(null);
  const [resumo, definirResumo] = useState<Resumo | null>(null);
  const [carregando, definirCarregando] = useState(true);
  const [erro, definirErro] = useState('');
  const token = sessao?.access_token;
  const pessoa = sessao?.user.id;
  useAnunciarVisita('estatisticas', token, resumo ? pessoa : null, '/estatisticas');

  useEffect(() => {
    try {
      const supabase = obterSupabase();
      void supabase.auth.getSession().then(({ data }) => {
        definirSessao(data.session);
        if (!data.session) definirCarregando(false);
      });
      const { data } = supabase.auth.onAuthStateChange((_evento, atual) => {
        definirSessao(atual);
        if (!atual) { definirResumo(null); definirCarregando(false); }
      });
      return () => data.subscription.unsubscribe();
    } catch {
      definirErro('O login Google ainda não está configurado.');
      definirCarregando(false);
    }
    return undefined;
  }, []);

  useEffect(() => {
    if (!pessoa || !token) return;
    const abortar = new AbortController();
    definirCarregando(true);
    definirErro('');
    void fetch('/api/painel-sessao?modo=estatisticas', { headers: { Authorization: `Bearer ${token}` }, signal: abortar.signal })
      .then(async (resposta) => {
        const corpo = await resposta.json().catch(() => null);
        if (!resposta.ok || !corpo) throw new Error(corpo?.mensagem || 'Não foi possível abrir as estatísticas.');
        if (!abortar.signal.aborted) definirResumo(corpo as Resumo);
      })
      .catch((falha: Error) => { if (!abortar.signal.aborted) { definirResumo(null); definirErro(falha.message); } })
      .finally(() => { if (!abortar.signal.aborted) definirCarregando(false); });
    return () => abortar.abort();
    // O token renova sozinho; só a troca de pessoa pede nova leitura.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pessoa]);

  async function entrar() {
    definirErro('');
    try {
      const { error } = await obterSupabase().auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/estatisticas`, queryParams: { prompt: 'select_account' } },
      });
      if (error) throw error;
    } catch {
      definirErro('Não foi possível abrir a entrada pelo Google. Tente novamente.');
    }
  }

  if (!resumo) {
    return (
      <div className="dcr">
        <main className="dcr-portao">
          <span className="dcr-marca">dácora<span aria-hidden="true">®</span></span>
          <p className="dcr-sobrancelha">Área da equipe</p>
          <h1>Estatísticas de uso</h1>
          <p>Quem usa cada página, quanto e se volta. Inclui se o cliente abriu o relatório do mês.</p>
          {erro && <p className="dcr-erro" role="alert">{erro}</p>}
          {carregando ? <p role="status">Conferindo seu acesso…</p> : (
            <button className="dcr-primario" onClick={() => void entrar()}>
              {sessao ? 'Trocar conta Google' : 'Entrar com Google'} <span aria-hidden="true">↗</span>
            </button>
          )}
        </main>
      </div>
    );
  }

  const porArea = new Map(resumo.areas.map((a) => [a.area, a]));
  return (
    <div className="dcr dce">
      <header className="dce-topo">
        <div className="dce-largura">
          <span className="dcr-marca">dácora<span aria-hidden="true">®</span></span>
          <p className="dcr-sobrancelha">Equipe Dácora</p>
          <h1>Estatísticas de uso</h1>
          <p className="dce-legenda">
            Atualizado em {quando.format(new Date(resumo.geradoEm))}. Uma visita junta as aberturas da mesma pessoa com menos de
            30 minutos entre elas. “Voltaram esta semana” conta quem veio na semana passada e voltou nesta.
          </p>
        </div>
      </header>
      <main className="dce-largura dce-corpo">
        {AREAS.filter(([chave]) => chave !== 'relatorio-cliente').map(([chave, nome]) => (
          <CartaoArea key={chave} nome={nome} area={porArea.get(chave) ?? vazia(chave)} />
        ))}

        <section className="dce-cartao">
          <h2>Relatório do cliente (link do mensal)</h2>
          <p className="dce-legenda-escura">
            Aberturas da equipe (prévia) ficam à parte e não contam como “o cliente abriu”. Cada navegador diferente do cliente conta como um.
          </p>
          {resumo.relatorios.length === 0 ? <p className="dce-nada">Nenhuma abertura registrada ainda.</p> : (
            <div className="dce-tabela-rolagem">
              <table className="dce-tabela">
                <thead>
                  <tr><th>Cliente</th><th>Mês</th><th>O cliente abriu?</th><th>Aberturas do cliente</th><th>Navegadores</th><th>Primeira</th><th>Última</th><th>Prévias da equipe</th></tr>
                </thead>
                <tbody>
                  {resumo.relatorios.map((r) => {
                    const { cliente, mes } = mesDe(r.relatorio);
                    return (
                      <tr key={r.relatorio}>
                        <td>{cliente}</td>
                        <td>{mes}</td>
                        <td>{r.aberturasCliente > 0 ? <strong className="dce-sim">Sim</strong> : <span className="dce-nao">Ainda não</span>}</td>
                        <td>{r.aberturasCliente}</td>
                        <td>{r.visitantesCliente}</td>
                        <td>{r.primeiraCliente ? quando.format(new Date(r.primeiraCliente)) : '—'}</td>
                        <td>{r.ultimaCliente ? quando.format(new Date(r.ultimaCliente)) : '—'}</td>
                        <td>{r.aberturasEquipe}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
