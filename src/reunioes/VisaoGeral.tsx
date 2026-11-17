import { useEffect, useRef, useState } from 'react';
import {
  SECOES,
  aplicarCorrecoes,
  vaiParaOMensal,
  type CorrecaoVisao,
  type ItemEfetivo,
  type Visao,
} from './visao';

export interface DadosVisao {
  visao: Visao | null;
  correcoes: CorrecaoVisao[];
}
interface Props {
  existe: boolean;
  /** Carregados pela página da reunião, que também mostra o placar no topo. */
  dados: DadosVisao | null;
  falhou: boolean;
  recarregar: () => Promise<void>;
  corrigir: (dados: {
    id: string;
    item_id: string;
    acao: CorrecaoVisao['acao'];
    texto?: string;
  }) => Promise<void>;
}
const ROTULO = { fato: 'FATO', decisao: 'DEC', ia: 'IA' } as const;
const quando = (iso: string) =>
  new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

/** Número do placar: conta de zero até o valor uma vez, parado para quem pede menos movimento. */
export function Contador({ valor }: { valor: number }) {
  const [mostrado, setMostrado] = useState(valor);
  const feito = useRef(false);
  useEffect(() => {
    if (feito.current || valor < 1) return;
    feito.current = true;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    let i = 0;
    setMostrado(0);
    const t = window.setInterval(() => {
      i += 1;
      setMostrado(Math.min(i, valor));
      if (i >= valor) window.clearInterval(t);
    }, 140);
    return () => window.clearInterval(t);
  }, [valor]);
  return <>{mostrado}</>;
}

export default function VisaoGeral({ existe, dados, falhou, recarregar, corrigir }: Props) {
  if (!existe)
    return (
      <section className="dcr-bloco">
        <h2>Visão geral ainda não preparada.</h2>
        <p>
          Ela aparece aqui depois que a transcrição entra no Portal e o Jeeves escreve o resumo.
          Sem transcrição, não há visão geral, e isso não quer dizer que nada foi combinado.
        </p>
      </section>
    );
  if (falhou && !dados)
    return (
      <section className="dcr-bloco">
        <h2>Não foi possível abrir a visão geral.</h2>
        <p>Ela continua guardada. Tente novamente em instantes.</p>
        <button onClick={() => void recarregar()}>Tentar novamente</button>
      </section>
    );
  if (!dados?.visao)
    return (
      <section className="dcr-bloco">
        <p>Abrindo a visão geral…</p>
      </section>
    );
  const { visao, correcoes } = dados;
  const efetiva = aplicarCorrecoes(visao.conteudo, correcoes);
  const de = (secao: string) => efetiva.itens.filter((i) => i.secao === secao);
  const salvar = async (item_id: string, acao: CorrecaoVisao['acao'], texto?: string) => {
    await corrigir({ id: crypto.randomUUID(), item_id, acao, ...(texto ? { texto } : {}) });
    await recarregar();
  };
  const mensal = efetiva.itens.filter(vaiParaOMensal);
  return (
    <div className="dcr-visao">
      <div className="dcr-visao__principal">
        <div className="dcr-visao__meta">
          <p className="dcr-proveniencia">
            <span>
              <b>Gerada em {quando(visao.gerada_em)}</b> pelo Jeeves
            </span>
            <span>
              Fontes: transcrição{visao.fontes.slack ? ` · Slack ${visao.fontes.slack}` : ''}
            </span>
            <span>
              Versão {efetiva.versao} ·{' '}
              {correcoes.length
                ? `${correcoes.length} ${correcoes.length === 1 ? 'correção' : 'correções'} da equipe`
                : 'nenhuma correção ainda'}
            </span>
          </p>
          <p className="dcr-legenda">
            <span>
              <span className="dcr-tipo dcr-tipo--fato">FATO</span> dito
            </span>
            <span>
              <span className="dcr-tipo dcr-tipo--decisao">DEC</span> decidido
            </span>
            <span title="Interpretação: não foi dito assim">
              <span className="dcr-tipo dcr-tipo--ia">IA</span> leitura da IA
            </span>
          </p>
        </div>
        <section className="dcr-executivo">
          <p className="dcr-sobrancelha">resumo executivo · leitura da IA</p>
          <p className={`dcr-executivo__texto dcr-estado--${efetiva.executivo.estado}`}>
            {efetiva.executivo.texto}
          </p>
          <Correcao
            item={{ id: 'executivo', texto: efetiva.executivo.texto, estado: efetiva.executivo.estado }}
            aoSalvar={salvar}
          />
        </section>
        {SECOES.map((s) => {
          const itens = de(s.id);
          if (!itens.length) return null;
          return (
            <section className="dcr-visao__bloco" id={`visao-${s.id}`} key={s.id}>
              <header>
                <h2>{s.titulo}</h2>
                <span className="dcr-sobrancelha">{s.nota}</span>
              </header>
              <ul>
                {itens.map((i) => (
                  <Item key={i.id} item={i} aoSalvar={salvar} />
                ))}
              </ul>
            </section>
          );
        })}
        <p className="dcr-ajuda dcr-visao__aviso">
          Tudo marcado como IA é interpretação. Não vai para o cliente nem para o relatório mensal.
          Responsável e prazo só aparecem quando foram ditos no trecho citado.
        </p>
      </div>
      <aside className="dcr-visao__mensal">
        <p className="dcr-sobrancelha">relatório mensal</p>
        <h3>Vai para o mensal?</h3>
        <p className="dcr-ajuda">
          Fatos e decisões desta reunião aparecem como sugestão no contexto do relatório do mês. Só
          entram se a Fernanda escolher e salvar. Correções valem; o que não procede sai.
        </p>
        <ul>
          {mensal.map((i) => (
            <li key={i.id}>
              <span className="dcr-sobrancelha">
                {i.tipo === 'decisao' ? 'decisão' : 'fato'} · {i.fonte === 'slack' ? 'slack' : 'reunião'}
                {i.estado === 'corrigido' ? ' · corrigido' : ''}
              </span>
              {i.texto}
            </li>
          ))}
          {!mensal.length && <li>Nenhum fato ou decisão disponível como sugestão.</li>}
        </ul>
      </aside>
    </div>
  );
}

function Item({
  item,
  aoSalvar,
}: {
  item: ItemEfetivo;
  aoSalvar: (item_id: string, acao: CorrecaoVisao['acao'], texto?: string) => Promise<void>;
}) {
  const [aberto, setAberto] = useState(false);
  return (
    <li className={`dcr-item dcr-estado--${item.estado}`}>
      <span className={`dcr-tipo dcr-tipo--${item.tipo}`} title={item.tipo === 'ia' ? 'leitura da IA' : item.tipo}>
        {ROTULO[item.tipo]}
      </span>
      <div className="dcr-item__texto">
        <p>{item.texto}</p>
        {item.secao === 'passo' && (
          <p className="dcr-item__quem">
            <span>Quem: {item.quem || <em>não combinado</em>}</span>
            <span>Prazo: {item.prazo || <em>não combinado</em>}</span>
          </p>
        )}
        <p className="dcr-item__meta">
          {item.fonte === 'slack' ? 'Slack' : 'Transcrição'}
          {item.estado === 'corrigido' && item.corrigido_por && (
            <> · corrigido por {item.corrigido_por} em {quando(item.corrigido_em!)} · original guardado</>
          )}
          {item.estado === 'descartado' && item.corrigido_por && (
            <> · marcado como não procede por {item.corrigido_por}</>
          )}
          <button type="button" className="dcr-link" onClick={() => setAberto(!aberto)} aria-expanded={aberto}>
            {aberto ? 'fechar o trecho' : 'ver o trecho'}
          </button>
        </p>
        {aberto && (
          <blockquote className="dcr-trecho">
            “{item.trecho}”
            {item.estado === 'corrigido' && <small>Texto original: {item.original}</small>}
          </blockquote>
        )}
        <Correcao item={item} aoSalvar={aoSalvar} />
      </div>
    </li>
  );
}

function Correcao({
  item,
  aoSalvar,
}: {
  item: { id: string; texto: string; estado: string };
  aoSalvar: (item_id: string, acao: CorrecaoVisao['acao'], texto?: string) => Promise<void>;
}) {
  const [editando, setEditando] = useState(false);
  const [texto, setTexto] = useState(item.texto);
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);
  async function enviar(acao: CorrecaoVisao['acao'], valor?: string) {
    setSalvando(true);
    setErro('');
    try {
      await aoSalvar(item.id, acao, valor);
      setEditando(false);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível salvar. Seu texto continua aqui.');
    } finally {
      setSalvando(false);
    }
  }
  return (
    <div className="dcr-correcao">
      {editando ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void enviar('corrigir', texto.trim());
          }}
        >
          <label>
            Texto corrigido
            <textarea value={texto} maxLength={1200} rows={3} onChange={(e) => setTexto(e.target.value)} />
          </label>
          <div>
            <button className="dcr-primario" disabled={salvando || !texto.trim()}>
              {salvando ? 'Salvando…' : 'Salvar correção'}
            </button>
            <button type="button" onClick={() => setEditando(false)}>
              Cancelar
            </button>
          </div>
        </form>
      ) : (
        <div>
          <button type="button" disabled={salvando} onClick={() => { setTexto(item.texto); setEditando(true); }}>
            Corrigir
          </button>
          {item.estado === 'original' ? (
            <button type="button" disabled={salvando} onClick={() => void enviar('nao_procede')}>
              Não procede
            </button>
          ) : (
            <button type="button" disabled={salvando} onClick={() => void enviar('restaurar')}>
              Voltar ao original
            </button>
          )}
        </div>
      )}
      {erro && (
        <p className="dcr-erro" role="alert">
          {erro}
        </p>
      )}
    </div>
  );
}
