import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
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
  } | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [feedback, setFeedback] = useState('');
  const [busca, setBusca] = useState('');
  const [nova, setNova] = useState(false);
  const [modoEscolhido, setModo] = useState<'compartilhado' | 'interno' | null>(null);
  const modo = usuario.equipe ? (modoEscolhido ?? 'interno') : 'compartilhado';
  const [aba, setAba] = useState<'roteiro' | 'duvidas' | 'acessos' | 'transcricao'>('roteiro');
  const [indice, setIndice] = useState(0);
  const [atualizado, setAtualizado] = useState('');
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
    setAba('roteiro');
    setModo(null);
    setBusca('');
    setFeedback('');
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
  const conteudo = detalhe?.reuniao[modo];
  const secoes = conteudo?.secoes ?? [];
  const secao = secoes[Math.min(indice, Math.max(0, secoes.length - 1))];
  return (
    <>
      <header className="dcr-topo">
        <Link to="/reunioes" className="dcr-marca" aria-label="Dácora, todas as reuniões">
          dácora<span>®</span>
        </Link>
        <span className="dcr-area">reuniões</span>
        <div className="dcr-identidade">
          <span>{usuario.nome}</span>
          <button onClick={() => void aoSair()}>Sair</button>
        </div>
      </header>
      <main className="dcr-corpo">
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
        {carregando ? (
          <p role="status">Carregando reuniões…</p>
        ) : !slug ? (
          <>
            <div className="dcr-abertura">
              <div>
                <p className="dcr-sobrancelha">CONVERSAS QUE VIRAM CAMINHO</p>
                <h1>À mesma mesa.</h1>
                <p>Pautas, decisões e próximos passos. Tudo no mesmo lugar.</p>
              </div>
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
            <label className="dcr-busca">
              Buscar reunião
              <input
                type="search"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Cliente ou assunto"
              />
            </label>
            <div className="dcr-lista">
              {lista
                .filter((r) => normalizar(`${r.titulo} ${r.cliente}`).includes(normalizar(busca)))
                .map((r) => (
                  <Link className="dcr-reuniao-card" to={`/reunioes/${r.slug}`} key={r.id}>
                    <span className="dcr-sobrancelha">{r.cliente}</span>
                    <h2>{r.titulo}</h2>
                    <p>{dataBr(r.data)}</p>
                    <span className="dcr-abrir">
                      Abrir reunião <span aria-hidden="true">↗</span>
                    </span>
                  </Link>
                ))}
            </div>
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
            {lista.length > 0 &&
              !lista.some((r) =>
                normalizar(`${r.titulo} ${r.cliente}`).includes(normalizar(busca)),
              ) && <p>Nenhuma reunião com esse termo.</p>}
          </>
        ) : (
          detalhe && (
            <>
              <Link className="dcr-voltar" to="/reunioes">
                ← Todas as reuniões
              </Link>
              <div className="dcr-abertura dcr-abertura--reuniao">
                <div>
                  <p className="dcr-sobrancelha">
                    {detalhe.reuniao.cliente} · {dataBr(detalhe.reuniao.data)}
                  </p>
                  <h1>{detalhe.reuniao.titulo}</h1>
                </div>
                <button onClick={() => void copiarLink()}>Copiar link ↗</button>
              </div>
              {usuario.equipe && (
                <div className="dcr-escopo" aria-label="Conteúdo da reunião">
                  <button
                    aria-pressed={modo === 'compartilhado'}
                    onClick={() => {
                      setModo('compartilhado');
                      setIndice(0);
                      setAba('roteiro');
                    }}
                  >
                    👥 Visão do cliente
                  </button>
                  <button
                    aria-pressed={modo === 'interno'}
                    onClick={() => {
                      setModo('interno');
                      setIndice(0);
                      setAba('roteiro');
                    }}
                  >
                    🔒 Roteiro da equipe
                  </button>
                  <p>
                    {modo === 'interno'
                      ? 'Apenas a equipe Dácora vê este roteiro.'
                      : 'Esta é a pauta que os convidados podem consultar.'}
                  </p>
                </div>
              )}
              <nav className="dcr-abas" aria-label="Área da reunião">
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
                    🔒 Transcrição
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
              <div className="dcr-mesa">
                <div className="dcr-principal">
                  {aba === 'acessos' && usuario.equipe ? (
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
                        <h2>{secao?.titulo ?? (modo === 'compartilhado' ? 'Pauta ainda não compartilhada' : 'Roteiro a preparar')}</h2>
                        <Texto
                          valor={
                            secao?.texto ?? (modo === 'compartilhado'
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
            </>
          )
        )}
      </main>
    </>
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
        🔒 Só a equipe Dácora vê. Texto automático, não conferido com o áudio. Lida em{' '}
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
            ? '🔒 Apenas equipe Dácora'
            : '👥 Visível para equipe e convidados'}
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
                <span>{n.visibilidade === 'interno' ? '🔒 Equipe' : '👥 Compartilhado'}</span>
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
