import { useCallback, useEffect, useRef, useState, type CSSProperties, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import type {
  Anotacao,
  ConteudoReuniao,
  Convite,
  IdentidadeReunioes,
  Transcricao,
  ResumoReuniao,
  Reuniao,
} from './tipos';
import VisaoGeral, { Contador, type DadosVisao } from './VisaoGeral';
import { aplicarCorrecoes, partirTitulo, placarDaVisao } from './visao';

interface Props {
  usuario: IdentidadeReunioes;
  token: string;
  aoSair: () => Promise<void>;
}
class ErroConsulta extends Error {
  constructor(
    public status: number,
    mensagem: string,
  ) {
    super(mensagem);
  }
}
const dataBr = (data: string) =>
  new Date(`${data}T12:00:00`).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
const normalizar = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
function montarTexto(texto: string): ConteudoReuniao {
  const partes = texto
    .trim()
    .split(/^##\s+/m)
    .filter((p) => p.trim());
  return {
    secoes: partes.map((p, i) => {
      const linhas = p.trim().split('\n');
      return {
        id: `etapa-${i + 1}`,
        titulo: linhas.length > 1 ? linhas.shift()! : `Pauta ${i + 1}`,
        texto: linhas.join('\n') || p.trim(),
      };
    }),
    duvidas: [],
  };
}

export default function AreaReunioes({ usuario, token, aoSair }: Props) {
  const { slug } = useParams();
  const navegar = useNavigate();
  const [lista, setLista] = useState<ResumoReuniao[]>([]);
  const [detalhe, setDetalhe] = useState<{
    reuniao: Reuniao;
    notas: Anotacao[];
    convites?: Convite[];
    tem_transcricao?: boolean;
    tem_visao?: boolean;
  } | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [feedback, setFeedback] = useState('');
  const [busca, setBusca] = useState('');
  const [nova, setNova] = useState(false);
  const [modoEscolhido, setModo] = useState<'compartilhado' | 'interno' | null>(null);
  const modo = usuario.equipe ? (modoEscolhido ?? 'interno') : 'compartilhado';
  type Aba = 'visao' | 'roteiro' | 'duvidas' | 'acessos' | 'transcricao';
  // Sem escolha da pessoa, a reunião que já tem visão geral abre nela (equipe, roteiro interno).
  const [abaEscolhida, setAba] = useState<Aba | null>(null);
  const [indice, setIndice] = useState(0);
  const [acesa, setAcesa] = useState<string | null>(null);
  const [atualizado, setAtualizado] = useState('');
  // Visão geral carregada aqui: a aba mostra o conteúdo e o topo mostra o placar.
  const [visao, setVisao] = useState<{ dados: DadosVisao | null; falhou: boolean }>({
    dados: null,
    falhou: false,
  });
  // Na Visão geral, o registro da conversa fica numa gaveta, aberta pelo botão "Registrar ponto".
  const [gaveta, setGaveta] = useState(false);
  const abridorGaveta = useRef<HTMLButtonElement>(null);
  const fecharGaveta = useRef<HTMLButtonElement>(null);
  const slugAtual = useRef(slug);
  slugAtual.current = slug;
  const geracao = useRef(0);
  const consultaAtual = useRef(0);
  const tokenAtual = useRef(token);
  tokenAtual.current = token;
  const api = useCallback(async (acao: string, corpo?: unknown, alvo?: string) => {
    const query = new URLSearchParams({ modo: 'reunioes', acao, ...(alvo ? { slug: alvo } : {}) });
    const resposta = await fetch(`/api/painel-sessao?${query}`, {
      method: corpo === undefined ? 'GET' : 'POST',
      cache: 'no-store',
      headers: {
        Authorization: `Bearer ${tokenAtual.current}`,
        'Content-Type': 'application/json',
      },
      ...(corpo === undefined ? {} : { body: JSON.stringify(corpo) }),
      signal: AbortSignal.timeout(20000),
    });
    let dados: any;
    try {
      dados = await resposta.json();
    } catch {
      throw new Error('O servidor não respondeu. Seu texto continua aqui.');
    }
    if (!resposta.ok)
      throw new ErroConsulta(
        resposta.status,
        dados.mensagem || 'Não foi possível concluir. Tente novamente.',
      );
    return dados;
  }, []);
  const atualizar = useCallback(
    async (silencioso = false) => {
      const atual = geracao.current;
      const consulta = ++consultaAtual.current;
      try {
        const dados = await api(slug ? 'abrir' : 'listar', undefined, slug);
        if (atual !== geracao.current || consulta !== consultaAtual.current) return;
        if (slug) setDetalhe(dados);
        else setLista(dados.reunioes);
        setErro('');
        setAtualizado(
          new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        );
      } catch (e) {
        if (atual !== geracao.current || consulta !== consultaAtual.current) return;
        setErro(e instanceof Error ? e.message : 'Não foi possível atualizar.');
        // Uma recusa pode ser revogação: não manter o conteúdo antigo acessível.
        if (e instanceof ErroConsulta && [401, 403, 404].includes(e.status)) {
          setDetalhe(null);
          if (!slug) setLista([]);
        }
      } finally {
        if (atual === geracao.current && !silencioso) setCarregando(false);
      }
    },
    [api, slug],
  );
  useEffect(() => {
    geracao.current++;
    setDetalhe(null);
    setCarregando(true);
    setIndice(0);
    setAba(null);
    setModo(null);
    setBusca('');
    setFeedback('');
    setVisao({ dados: null, falhou: false });
    setGaveta(false);
    void atualizar();
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') void atualizar(true);
    }, 10000);
    return () => {
      geracao.current++;
      window.clearInterval(timer);
    };
  }, [atualizar]);

  async function copiarLink() {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/reunioes/${slug}`);
      setFeedback('Link copiado. Só pessoas com convite poderão abrir.');
    } catch {
      setFeedback(`Copie o endereço da barra do navegador para compartilhar esta reunião.`);
    }
  }
  const aba: Aba =
    abaEscolhida ?? (usuario.equipe && modo === 'interno' && detalhe?.tem_visao ? 'visao' : 'roteiro');
  const verVisao = usuario.equipe && modo === 'interno' && detalhe?.tem_visao === true;
  const naVisao = aba === 'visao' && usuario.equipe && modo === 'interno';
  const recarregarVisao = useCallback(async () => {
    const pedido = slug;
    try {
      const dados = await api('visao', undefined, pedido);
      if (slugAtual.current === pedido) setVisao({ dados, falhou: false });
    } catch {
      if (slugAtual.current === pedido) setVisao((v) => ({ ...v, falhou: true }));
    }
  }, [api, slug]);
  useEffect(() => {
    if (verVisao) void recarregarVisao();
    else setVisao({ dados: null, falhou: false });
  }, [verVisao, recarregarVisao]);
  const placar =
    verVisao && visao.dados?.visao
      ? placarDaVisao(aplicarCorrecoes(visao.dados.visao.conteudo, visao.dados.correcoes).itens)
      : null;
  const gavetaAberta = gaveta && naVisao;
  function fechar() {
    setGaveta(false);
    abridorGaveta.current?.focus();
  }
  useEffect(() => {
    if (!gavetaAberta) return;
    fecharGaveta.current?.focus();
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') fechar();
    };
    document.addEventListener('keydown', aoTeclar);
    return () => document.removeEventListener('keydown', aoTeclar);
  }, [gavetaAberta]);
  function irParaBloco(id: string) {
    setAba('visao');
    window.setTimeout(
      () => document.getElementById(`visao-${id}`)?.scrollIntoView({ block: 'start' }),
      0,
    );
  }
  const cabeca = detalhe ? partirTitulo(detalhe.reuniao.titulo) : null;
  const conteudo = detalhe?.reuniao[modo];
  const secoes = conteudo?.secoes ?? [];
  const secao = secoes[Math.min(indice, Math.max(0, secoes.length - 1))];
  const hoje = hojeIso();
  const filtradas = lista.filter((r) =>
    normalizar(`${r.titulo} ${r.cliente}`).includes(normalizar(busca)),
  );
  const proximas = filtradas.filter((r) => r.data >= hoje).sort((a, b) => a.data.localeCompare(b.data));
  const anteriores = filtradas.filter((r) => r.data < hoje).sort((a, b) => b.data.localeCompare(a.data));
  const cartao = (r: ResumoReuniao) => (
    <Link
      className={`dcr-reuniao-card${acesa === r.id ? ' dcr-acesa' : ''}`}
      to={`/reunioes/${r.slug}`}
      key={r.id}
      onMouseEnter={() => setAcesa(r.id)}
      onMouseLeave={() => setAcesa(null)}
      onFocus={() => setAcesa(r.id)}
      onBlur={() => setAcesa(null)}
    >
      <span className="dcr-dia" aria-hidden="true">
        {r.data.slice(8, 10)}
        <small>{mesCurto(r.data)}</small>
      </span>
      <span className="dcr-cartao-texto">
        <h2>{r.titulo}</h2>
        <span className="dcr-cliente">
          {r.cliente} · {dataBr(r.data)}
        </span>
      </span>
      <span className="dcr-abrir">
        Abrir reunião <span aria-hidden="true">↗</span>
      </span>
    </Link>
  );
  return (
    <>
      <header className="dcr-topo">
        <div className="dcr-miolo">
          <Link to="/reunioes" className="dcr-marca" aria-label="Dácora, todas as reuniões">
            dácora<span>®</span>
          </Link>
          <span className="dcr-area">reuniões</span>
          <div className="dcr-identidade">
            <span>{usuario.nome}</span>
            <button onClick={() => void aoSair()}>Sair</button>
          </div>
        </div>
      </header>
      <main className="dcr-corpo">
        {(erro || feedback) && (
          <div className="dcr-miolo dcr-avisos">
            {erro && (
              <div className="dcr-erro" role="alert">
                {erro} <button onClick={() => void atualizar()}>Tentar novamente</button>
              </div>
            )}
            {feedback && (
              <p className="dcr-feedback" role="status">
                {feedback}
              </p>
            )}
          </div>
        )}
        {carregando ? (
          <div className="dcr-miolo">
            <p role="status" className="dcr-carregando">
              Carregando reuniões…
            </p>
          </div>
        ) : !slug ? (
          <>
            <section className="dcr-heroi">
              <div className="dcr-miolo">
                <div className="dcr-abertura">
                  <div>
                    <p className="dcr-sobrancelha">CONVERSAS QUE VIRAM CAMINHO</p>
                    <h1>
                      À mesma <span className="dcr-leve">mesa.</span>
                    </h1>
                    <p>Pautas, decisões e próximos passos. Tudo no mesmo lugar.</p>
                  </div>
                  <Proxima lista={lista} hoje={hoje} />
                </div>
                <Semana lista={lista} hoje={hoje} acesa={acesa} aoAcender={setAcesa} />
              </div>
            </section>
            <div className="dcr-miolo">
              <div className="dcr-barra">
                <label className="dcr-busca">
                  Buscar reunião
                  <input
                    type="search"
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                    placeholder="Cliente ou assunto"
                  />
                </label>
                {usuario.equipe && (
                  <button className="dcr-primario" onClick={() => setNova(!nova)}>
                    {nova ? 'Fechar' : '+ Nova reunião'}
                  </button>
                )}
              </div>
              {nova && (
                <CriarReuniao
                  aoCriar={async (dados) => {
                    const r = await api('criar', dados);
                    setNova(false);
                    navegar(`/reunioes/${r.reuniao.slug}`);
                  }}
                />
              )}
              {proximas.length > 0 && (
                <section className="dcr-grupo" aria-label="Próximas reuniões">
                  <p className="dcr-sobrancelha">PRÓXIMAS</p>
                  <div className="dcr-lista">{proximas.map(cartao)}</div>
                </section>
              )}
              {anteriores.length > 0 && (
                <section className="dcr-grupo" aria-label="Reuniões que já aconteceram">
                  <p className="dcr-sobrancelha">JÁ ACONTECERAM</p>
                  <div className="dcr-lista">{anteriores.map(cartao)}</div>
                </section>
              )}
              {!lista.length && !erro && (
                <div className="dcr-vazio">
                  <h2>A próxima conversa começa aqui.</h2>
                  <p>
                    {usuario.equipe
                      ? 'Crie uma reunião e salve a pauta antes de convidar as pessoas.'
                      : 'Suas reuniões convidadas aparecerão aqui.'}
                  </p>
                </div>
              )}
              {lista.length > 0 && !filtradas.length && (
                <p className="dcr-vazio-busca">Nenhuma reunião com esse termo.</p>
              )}
            </div>
          </>
        ) : (
          detalhe && (
            <>
              <section className="dcr-heroi dcr-heroi--reuniao">
                <div className="dcr-miolo">
                  <Link className="dcr-voltar" to="/reunioes">
                    ← Todas as reuniões
                  </Link>
                  <div className="dcr-cabeca">
                    <div>
                      <p className="dcr-sobrancelha">
                        {detalhe.reuniao.cliente} · {dataBr(detalhe.reuniao.data)}
                      </p>
                      <h1>{cabeca!.titulo}</h1>
                      {cabeca!.sub && <p className="dcr-cabeca__sub">{cabeca!.sub}</p>}
                    </div>
                    {placar && (
                      <nav className="dcr-cabeca__placar" aria-label="Visão geral em números">
                        {placar.map((p) => (
                          <a
                            key={p.id}
                            href={`#visao-${p.id}`}
                            className={p.n ? undefined : 'dcr-zero'}
                            onClick={(e) => {
                              e.preventDefault();
                              irParaBloco(p.id);
                            }}
                          >
                            <b>
                              <Contador valor={p.n} />
                            </b>
                            <small>{p.rotulo}</small>
                          </a>
                        ))}
                      </nav>
                    )}
                  </div>
                  <div className="dcr-comandos">
                    {usuario.equipe && (
                      <div className="dcr-escopo__botoes" role="group" aria-label="Conteúdo da reunião">
                        <button
                          aria-pressed={modo === 'compartilhado'}
                          title="A pauta que os convidados podem consultar"
                          onClick={() => {
                            setModo('compartilhado');
                            setIndice(0);
                            setAba('roteiro');
                          }}
                        >
                          Visão do cliente
                        </button>
                        <button
                          aria-pressed={modo === 'interno'}
                          title="Só a equipe Dácora vê"
                          onClick={() => {
                            setModo('interno');
                            setIndice(0);
                            setAba('roteiro');
                          }}
                        >
                          <svg className="dcr-cadeado" viewBox="0 0 16 16" aria-hidden="true">
                            <rect x="3" y="7" width="10" height="7" rx="1.5" />
                            <path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" />
                          </svg>
                          Roteiro da equipe<span className="dcr-sr"> (só a equipe Dácora vê)</span>
                        </button>
                      </div>
                    )}
                    <button onClick={() => void copiarLink()}>Copiar link ↗</button>
                  </div>
                  <div className="dcr-linha-abas">
                    <nav className="dcr-abas" aria-label="Área da reunião">
                      {usuario.equipe && modo === 'interno' && (
                        <button
                          aria-current={aba === 'visao' ? 'page' : undefined}
                          onClick={() => setAba('visao')}
                        >
                          Visão geral
                        </button>
                      )}
                      <button
                        aria-current={aba === 'roteiro' ? 'page' : undefined}
                        onClick={() => setAba('roteiro')}
                      >
                        Conduzir reunião
                      </button>
                      {(conteudo?.duvidas.length ?? 0) > 0 && (
                        <button
                          aria-current={aba === 'duvidas' ? 'page' : undefined}
                          onClick={() => setAba('duvidas')}
                        >
                          Respostas rápidas
                        </button>
                      )}
                      {usuario.equipe && modo === 'interno' && (
                        <button
                          aria-current={aba === 'transcricao' ? 'page' : undefined}
                          onClick={() => setAba('transcricao')}
                        >
                          Transcrição
                        </button>
                      )}
                      {usuario.equipe && (
                        <button
                          aria-current={aba === 'acessos' ? 'page' : undefined}
                          onClick={() => setAba('acessos')}
                        >
                          Convidados
                        </button>
                      )}
                    </nav>
                    {naVisao && (
                      <button
                        ref={abridorGaveta}
                        className="dcr-registrar"
                        aria-expanded={gavetaAberta}
                        aria-controls="dcr-gaveta"
                        onClick={() => setGaveta(true)}
                      >
                        + Registrar ponto
                        {detalhe.notas.length > 0 && <b>{detalhe.notas.length}</b>}
                      </button>
                    )}
                  </div>
                </div>
              </section>
              <div className="dcr-miolo">
                <div className={`dcr-mesa${naVisao ? ' dcr-mesa--larga' : ''}`}>
                  <div className="dcr-principal" key={`${modo}-${aba}`}>
                    {aba === 'visao' && usuario.equipe && modo === 'interno' ? (
                      <VisaoGeral
                        key={slug}
                        existe={detalhe.tem_visao === true}
                        dados={visao.dados}
                        falhou={visao.falhou}
                        recarregar={recarregarVisao}
                        corrigir={async (dados) => {
                          await api('corrigir_visao', dados, slug);
                        }}
                      />
                    ) : aba === 'acessos' && usuario.equipe ? (
                      <Acessos
                        convites={detalhe.convites ?? []}
                        aoSalvar={async (dados) => {
                          await api('convidar', dados, slug);
                          await atualizar(true);
                          setFeedback(
                            'Acesso atualizado. Compartilhe o link com a pessoa; nenhum e-mail foi enviado.',
                          );
                        }}
                      />
                    ) : aba === 'transcricao' && usuario.equipe && modo === 'interno' ? (
                      <PainelTranscricao
                        key={slug}
                        existe={detalhe.tem_transcricao === true}
                        carregar={() => api('transcricao', undefined, slug)}
                      />
                    ) : aba === 'duvidas' ? (
                      <Duvidas conteudo={conteudo!} />
                    ) : (
                      <div className="dcr-roteiro">
                        <nav aria-label="Etapas do roteiro">
                          {secoes.map((s, i) => (
                            <button
                              key={s.id}
                              onClick={() => setIndice(i)}
                              aria-current={indice === i ? 'step' : undefined}
                            >
                              <span>{String(i + 1).padStart(2, '0')}</span>
                              {s.titulo}
                            </button>
                          ))}
                        </nav>
                        <article key={`${modo}-${secao?.id}`}>
                          <p className="dcr-sobrancelha">
                            {secao ? `${indice + 1} DE ${secoes.length}` : 'PAUTA'}
                          </p>
                          <h2>
                            {secao?.titulo ??
                              (modo === 'compartilhado'
                                ? 'Pauta ainda não compartilhada'
                                : 'Roteiro a preparar')}
                          </h2>
                          <Texto
                            valor={
                              secao?.texto ??
                              (modo === 'compartilhado'
                                ? usuario.equipe
                                  ? 'Consulte o Roteiro da equipe para ver o conteúdo interno. Esta visão mostra apenas o que foi preparado para os convidados.'
                                  : 'A equipe ainda está preparando o conteúdo que será compartilhado aqui.'
                                : 'Registre os pontos da conversa nas anotações ao lado.')
                            }
                          />
                          <div className="dcr-passos">
                            <button disabled={indice === 0} onClick={() => setIndice((i) => i - 1)}>
                              ← Anterior
                            </button>
                            <button
                              className="dcr-primario"
                              disabled={indice >= secoes.length - 1}
                              onClick={() => setIndice((i) => i + 1)}
                            >
                              Próximo ponto →
                            </button>
                          </div>
                        </article>
                      </div>
                    )}
                  </div>
                  {naVisao && (
                    <div
                      className={`dcr-gaveta-fundo${gavetaAberta ? ' dcr-aberta' : ''}`}
                      aria-hidden="true"
                      onClick={fechar}
                    />
                  )}
                  <div
                    id="dcr-gaveta"
                    className={naVisao ? `dcr-gaveta${gavetaAberta ? ' dcr-aberta' : ''}` : 'dcr-lado'}
                    {...(naVisao ? { role: 'dialog', 'aria-label': 'Registro da conversa' } : {})}
                  >
                    {naVisao && (
                      <div className="dcr-gaveta__topo">
                        <button ref={fecharGaveta} onClick={fechar}>
                          Fechar <span aria-hidden="true">✕</span>
                        </button>
                      </div>
                    )}
                    <Anotacoes
                      key={slug}
                      notas={detalhe.notas}
                      equipe={usuario.equipe}
                      secao={secao?.id ?? 'geral'}
                      atualizado={atualizado}
                      aoSalvar={async (dados) => {
                        await api('anotar', dados, slug);
                        await atualizar(true);
                      }}
                    />
                  </div>
                </div>
              </div>
            </>
          )
        )}
      </main>
    </>
  );
}

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const mesCurto = (data: string) => MESES[Number(data.slice(5, 7)) - 1] ?? '';
function hojeIso() {
  return new Date().toLocaleDateString('en-CA');
}
function diasEntre(de: string, ate: string) {
  return Math.round(
    (new Date(`${ate}T12:00:00`).getTime() - new Date(`${de}T12:00:00`).getTime()) / 86400000,
  );
}
function somarDias(data: string, dias: number) {
  const d = new Date(`${data}T12:00:00`);
  d.setDate(d.getDate() + dias);
  return d.toLocaleDateString('en-CA');
}

function Proxima({ lista, hoje }: { lista: ResumoReuniao[]; hoje: string }) {
  const proxima = lista
    .filter((r) => r.data >= hoje)
    .sort((a, b) => a.data.localeCompare(b.data))[0];
  if (!proxima)
    return (
      <div className="dcr-proxima">
        <p className="dcr-sobrancelha">PRÓXIMA CONVERSA</p>
        <strong className="dcr-proxima__quando">—</strong>
        <p>Nenhuma reunião marcada a partir de hoje.</p>
      </div>
    );
  const dias = diasEntre(hoje, proxima.data);
  const quando = dias === 0 ? 'hoje' : dias === 1 ? 'amanhã' : `em ${dias} dias`;
  return (
    <Link className="dcr-proxima" to={`/reunioes/${proxima.slug}`}>
      <p className="dcr-sobrancelha">PRÓXIMA CONVERSA</p>
      <strong className="dcr-proxima__quando">{quando}</strong>
      <p>
        {proxima.cliente} · {proxima.titulo}
      </p>
    </Link>
  );
}

// A fita da semana: segunda a sábado da semana corrente, cada reunião um ponto no seu dia.
function Semana({
  lista,
  hoje,
  acesa,
  aoAcender,
}: {
  lista: ResumoReuniao[];
  hoje: string;
  acesa: string | null;
  aoAcender: (id: string | null) => void;
}) {
  const diaDaSemana = new Date(`${hoje}T12:00:00`).getDay();
  const segunda = somarDias(hoje, diaDaSemana === 0 ? 1 : 1 - diaDaSemana);
  const nomes = ['seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
  let ordem = 0;
  return (
    <div className="dcr-semana" aria-label="Reuniões desta semana">
      {nomes.map((nome, i) => {
        const dia = somarDias(segunda, i);
        const doDia = lista.filter((r) => r.data === dia);
        return (
          <div
            key={dia}
            className={`dcr-semana__dia${dia === hoje ? ' dcr-hoje' : ''}${dia < hoje ? ' dcr-passado' : ''}`}
          >
            <span className="dcr-semana__nome">
              {nome} {dia.slice(8, 10)}
              {dia === hoje && <b>hoje</b>}
            </span>
            <div className="dcr-semana__pontos">
              {doDia.map((r) => (
                <Link
                  key={r.id}
                  to={`/reunioes/${r.slug}`}
                  className={`dcr-ponto${acesa === r.id ? ' dcr-acesa' : ''}`}
                  style={{ '--n': ordem++ } as CSSProperties}
                  onMouseEnter={() => aoAcender(r.id)}
                  onMouseLeave={() => aoAcender(null)}
                  onFocus={() => aoAcender(r.id)}
                  onBlur={() => aoAcender(null)}
                >
                  <i aria-hidden="true" />
                  <span>{r.cliente}</span>
                </Link>
              ))}
              {!doDia.length && <span className="dcr-semana__livre">livre</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Texto({ valor }: { valor: string }) {
  return (
    <div className="dcr-texto">
      {valor.split(/\n\n+/).map((p, i) => {
        const [primeira, ...linhas] = p.split('\n');
        return linhas.length && /^[A-ZÁÉÍÓÚÂÊÔÃÕÇ ]{3,70}$/.test(primeira) ? (
          <section key={i}>
            <h3>{primeira}</h3>
            <p>{linhas.join('\n')}</p>
          </section>
        ) : (
          <p key={i}>{p}</p>
        );
      })}
    </div>
  );
}
function PainelTranscricao({
  existe,
  carregar,
}: {
  existe: boolean;
  carregar: () => Promise<{ transcricao: Transcricao | null }>;
}) {
  const [transcricao, setTranscricao] = useState<Transcricao | null>(null);
  const [falhou, setFalhou] = useState(false);
  const [busca, setBusca] = useState('');
  const carregarAtual = useRef(carregar);
  useEffect(() => {
    if (!existe) return;
    let ativo = true;
    carregarAtual
      .current()
      .then((dados) => {
        if (ativo) setTranscricao(dados.transcricao);
      })
      .catch(() => {
        if (ativo) setFalhou(true);
      });
    return () => {
      ativo = false;
    };
  }, [existe]);
  if (!existe)
    return (
      <section className="dcr-bloco">
        <h2>Sem transcrição registrada.</h2>
        <p>Esta reunião não tem transcrição guardada aqui. Isso não diz se ela aconteceu.</p>
      </section>
    );
  if (falhou)
    return (
      <section className="dcr-bloco">
        <h2>Não foi possível abrir a transcrição.</h2>
        <p>Ela continua guardada. Tente novamente em instantes.</p>
      </section>
    );
  if (!transcricao)
    return (
      <section className="dcr-bloco">
        <p>Abrindo a transcrição…</p>
      </section>
    );
  const termo = normalizar(busca);
  const linhas = transcricao.texto.split(/\r?\n/).filter((l) => l.trim() && normalizar(l).includes(termo));
  return (
    <section className="dcr-bloco dcr-transcricao">
      <h2>Transcrição da reunião</h2>
      <p>
        Só a equipe Dácora vê. Texto automático, não conferido com o áudio. Lida em{' '}
        {new Date(transcricao.lida_em).toLocaleDateString('pt-BR')}.{' '}
        <a href={transcricao.fonte_url} target="_blank" rel="noreferrer noopener">
          Abrir o documento original ↗
        </a>
      </p>
      <label>
        Buscar na transcrição
        <input
          type="search"
          placeholder="Ex.: orçamento, vendedor, prazo"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
      </label>
      <div className="dcr-transcricao__texto" tabIndex={0}>
        {linhas.length ? linhas.map((l, i) => <p key={i}>{l}</p>) : <p>Nenhum trecho com esse termo.</p>}
      </div>
    </section>
  );
}

function Duvidas({ conteudo }: { conteudo: ConteudoReuniao }) {
  const [busca, setBusca] = useState('');
  const duvidas = conteudo.duvidas.filter((d) =>
    normalizar(`${d.pergunta} ${d.resposta}`).includes(normalizar(busca)),
  );
  return (
    <section className="dcr-bloco">
      <h2>Uma resposta por vez.</h2>
      <label>
        Buscar dúvida
        <input
          type="search"
          placeholder="Ex.: bloqueio, vendedor, ligação"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
      </label>
      <p>{duvidas.length} respostas</p>
      {duvidas.map((d, i) => (
        <details key={i}>
          <summary>{d.pergunta}</summary>
          <Texto valor={d.resposta} />
        </details>
      ))}
      {!duvidas.length && (
        <p>Nenhuma resposta com esse termo. Registre a pergunta para retomar depois.</p>
      )}
    </section>
  );
}
function Anotacoes({
  notas,
  equipe,
  secao,
  atualizado,
  aoSalvar,
}: {
  notas: Anotacao[];
  equipe: boolean;
  secao: string;
  atualizado: string;
  aoSalvar: (dados: unknown) => Promise<void>;
}) {
  const [texto, setTexto] = useState('');
  const [tipo, setTipo] = useState('anotacao');
  const [visibilidade, setVisibilidade] = useState<'interno' | 'compartilhado'>(
    equipe ? 'interno' : 'compartilhado',
  );
  const [filtro, setFiltro] = useState('todos');
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo] = useState(false);
  const envio = useRef<{ id: string; assinatura: string } | null>(null);
  async function salvar(e: FormEvent) {
    e.preventDefault();
    setSalvando(true);
    setErro('');
    setSalvo(false);
    const dados = { texto, tipo, visibilidade, secao };
    const assinatura = JSON.stringify(dados);
    if (envio.current?.assinatura !== assinatura)
      envio.current = { id: crypto.randomUUID(), assinatura };
    try {
      await aoSalvar({ ...dados, id: envio.current.id });
      setTexto('');
      envio.current = null;
      setSalvo(true);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível salvar. Seu texto continua aqui.');
    } finally {
      setSalvando(false);
    }
  }
  const tipos = { anotacao: 'Anotação', decisao: 'Decisão', acao: 'Próximo passo' };
  return (
    <aside className="dcr-notas">
      <p className="dcr-sobrancelha">REGISTRO DA CONVERSA</p>
      <h2>O que fica combinado?</h2>
      <p className="dcr-ajuda">
        Cada registro mantém seu autor e horário. Atualização a cada 10 segundos.
      </p>
      <form onSubmit={(e) => void salvar(e)}>
        <div className="dcr-linha">
          <label>
            Tipo
            <select
              aria-label="Tipo de registro"
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
            >
              <option value="anotacao">Anotação</option>
              <option value="decisao">Decisão</option>
              <option value="acao">Próximo passo</option>
            </select>
          </label>
          {equipe && (
            <label>
              Quem pode ver
              <select
                aria-label="Quem pode ver"
                value={visibilidade}
                onChange={(e) => setVisibilidade(e.target.value as typeof visibilidade)}
              >
                <option value="compartilhado">Equipe e convidados</option>
                <option value="interno">Só equipe Dácora</option>
              </select>
            </label>
          )}
        </div>
        <label className="dcr-sr" htmlFor="anotacao">
          Sua anotação
        </label>
        <textarea
          id="anotacao"
          maxLength={5000}
          required
          rows={4}
          value={texto}
          onChange={(e) => {
            setTexto(e.target.value);
            setSalvo(false);
          }}
          placeholder={
            tipo === 'acao'
              ? 'O que será feito, por quem e até quando?'
              : 'Registre o ponto importante…'
          }
        />
        <p className="dcr-visibilidade">
          {visibilidade === 'interno'
            ? 'Só a equipe Dácora vê'
            : 'Equipe e convidados veem'}
        </p>
        {erro && (
          <p className="dcr-erro" role="alert">
            {erro}
          </p>
        )}
        {salvo && <p role="status">Registro salvo.</p>}
        <button className="dcr-primario" disabled={salvando || !texto.trim()}>
          {salvando ? 'Salvando…' : 'Salvar registro'}
        </button>
      </form>
      <label className="dcr-filtrar">
        Ver registros
        <select
          aria-label="Ver registros"
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
        >
          <option value="todos">Todos</option>
          <option value="decisao">Decisões</option>
          <option value="acao">Próximos passos</option>
          <option value="anotacao">Anotações</option>
        </select>
      </label>
      <small>Última consulta: {atualizado || 'aguardando'}</small>
      <div className="dcr-registros">
        {notas
          .filter((n) => filtro === 'todos' || n.tipo === filtro)
          .map((n) => (
            <article className="dcr-nota" key={n.id}>
              <div>
                <span>{tipos[n.tipo]}</span>
                <span>{n.visibilidade === 'interno' ? 'Só equipe' : 'Compartilhado'}</span>
              </div>
              <p>{n.texto}</p>
              <footer>
                {n.autor_nome} ·{' '}
                {new Date(n.criado_em).toLocaleString('pt-BR', {
                  dateStyle: 'short',
                  timeStyle: 'short',
                })}
              </footer>
            </article>
          ))}
        {!notas.length && (
          <p className="dcr-ajuda">
            Os registros salvos aparecerão aqui para todas as pessoas com acesso.
          </p>
        )}
      </div>
    </aside>
  );
}
function Acessos({
  convites,
  aoSalvar,
}: {
  convites: Convite[];
  aoSalvar: (dados: unknown) => Promise<void>;
}) {
  const [email, setEmail] = useState('');
  const [dias, setDias] = useState('30');
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);
  async function salvar(dados: unknown) {
    setSalvando(true);
    setErro('');
    try {
      await aoSalvar(dados);
      setEmail('');
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível salvar.');
    } finally {
      setSalvando(false);
    }
  }
  return (
    <section className="dcr-bloco">
      <p className="dcr-sobrancelha">ACESSO POR REUNIÃO</p>
      <h2>Traga as pessoas certas.</h2>
      <p>
        O convite libera a pauta compartilhada e as anotações desta reunião. O roteiro interno
        continua só com a equipe Dácora.
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void salvar({
            email,
            ativo: true,
            expira_em: new Date(Date.now() + Number(dias) * 86400000).toISOString(),
          });
        }}
      >
        <label>
          E-mail da conta Google
          <input
            type="email"
            value={email}
            required
            maxLength={254}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="pessoa@empresa.com.br"
          />
        </label>
        <label>
          Acesso válido por
          <select
            aria-label="Validade do convite"
            value={dias}
            onChange={(e) => setDias(e.target.value)}
          >
            <option value="7">7 dias</option>
            <option value="30">30 dias</option>
            <option value="90">90 dias</option>
          </select>
        </label>
        <button className="dcr-primario" disabled={salvando}>
          {salvando ? 'Salvando…' : 'Liberar acesso'}
        </button>
        <p className="dcr-ajuda">
          Depois de liberar, copie o link e envie à pessoa. Ela precisa entrar com este mesmo
          e-mail.
        </p>
      </form>
      {erro && (
        <p className="dcr-erro" role="alert">
          {erro}
        </p>
      )}
      <h3>Convidados</h3>
      {!convites.length && <p>Nenhum cliente convidado ainda. A equipe Dácora já tem acesso.</p>}
      {convites.map((c) => (
        <div className="dcr-convidado" key={c.email}>
          <div>
            <strong>{c.email}</strong>
            <small>
              {!c.ativo
                ? 'Acesso retirado'
                : new Date(c.expira_em).getTime() < Date.now()
                  ? 'Convite vencido'
                  : `Até ${new Date(c.expira_em).toLocaleDateString('pt-BR')}`}
            </small>
          </div>
          {c.ativo && (
            <button
              disabled={salvando}
              onClick={() =>
                void salvar({
                  email: c.email,
                  ativo: false,
                  expira_em: new Date(Date.now() + 86400000).toISOString(),
                })
              }
            >
              Retirar acesso
            </button>
          )}
        </div>
      ))}
    </section>
  );
}
function CriarReuniao({ aoCriar }: { aoCriar: (dados: unknown) => Promise<void> }) {
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);
  async function criar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro('');
    setSalvando(true);
    const campos = new FormData(e.currentTarget);
    const titulo = String(campos.get('titulo') ?? '');
    const data = String(campos.get('data') ?? '');
    const slug = `${normalizar(titulo)
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 70)}-${data}-${crypto.randomUUID().slice(0, 6)}`;
    try {
      await aoCriar({
        titulo,
        data,
        slug,
        cliente: campos.get('cliente'),
        compartilhado: montarTexto(String(campos.get('compartilhado') ?? '')),
        interno: montarTexto(String(campos.get('interno') ?? '')),
      });
    } catch (e) {
      setErro(
        e instanceof Error ? e.message : 'Não foi possível criar. Seus textos continuam aqui.',
      );
    } finally {
      setSalvando(false);
    }
  }
  return (
    <form className="dcr-criar" onSubmit={(e) => void criar(e)}>
      <h2>Prepare a próxima conversa.</h2>
      <div className="dcr-linha">
        <label>
          Título
          <input name="titulo" required maxLength={180} placeholder="Apresentação do Fluxo" />
        </label>
        <label>
          Cliente
          <input name="cliente" required maxLength={140} placeholder="Nome da empresa" />
        </label>
        <label>
          Data
          <input
            name="data"
            type="date"
            required
            defaultValue={new Date().toLocaleDateString('en-CA')}
          />
        </label>
      </div>
      <label>
        Pauta para equipe e convidados
        <textarea
          name="compartilhado"
          rows={5}
          maxLength={60000}
          required
          placeholder={
            'Objetivo da reunião\nO que vamos alinhar?\n\n## Próximos passos\nO que deve ficar decidido?'
          }
        />
      </label>
      <label>
        Roteiro interno da equipe
        <textarea
          name="interno"
          rows={5}
          maxLength={60000}
          placeholder="Orientações de condução, objeções e respostas. Só a equipe verá este conteúdo."
        />
      </label>
      <p className="dcr-ajuda">
        Para separar etapas, comece o título com ## em uma nova linha. Os convidados serão liberados
        depois de salvar.
      </p>
      {erro && (
        <p className="dcr-erro" role="alert">
          {erro}
        </p>
      )}
      <button disabled={salvando} className="dcr-primario">
        {salvando ? 'Salvando…' : 'Criar reunião'}
      </button>
    </form>
  );
}
