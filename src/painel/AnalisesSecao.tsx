import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export interface EspacoAnaliticoSeguro { secao: string; blocoId: string; titulo: string; objetivo: string; }
export interface SugestaoSecao { id: string; secao: string; estado: string; texto: string; checksum: string; }
export interface ContextoMesSeguro { texto: string; atualizadoPor?: string; atualizadoEm?: string; }
export type AcaoAnalisesUI = 'carregar' | 'salvar_contexto' | 'gerar_todas' | 'gerar_secao' | 'aplicar' | 'editar' | 'desfazer';
export interface ResultadoAnalisesUI { contexto?: ContextoMesSeguro | null; sugestoes?: SugestaoSecao[]; sugestao?: SugestaoSecao | null; espacos?: EspacoAnaliticoSeguro[]; }

interface EstadoAnalises {
  espacos: Map<string, EspacoAnaliticoSeguro>;
  sugestoes: Map<string, SugestaoSecao>;
  ocupada: boolean;
  mensagem: string;
  agir: (acao: Exclude<AcaoAnalisesUI, 'carregar' | 'salvar_contexto' | 'gerar_todas'>, secao: string, texto?: string) => Promise<void>;
}

const ContextoAnalises = createContext<EstadoAnalises | null>(null);

function mapaDeSugestoes(sugestoes: SugestaoSecao[]) {
  return new Map(sugestoes.map((sugestao) => [sugestao.secao, sugestao]));
}

export function AnalisesSecaoProvider({
  podeRevisar,
  espacos,
  aoAcionar,
  children,
}: {
  podeRevisar: boolean;
  espacos: EspacoAnaliticoSeguro[];
  aoAcionar: (acao: AcaoAnalisesUI, dados?: { secao?: string; sugestao?: SugestaoSecao; texto?: string; contexto?: string }) => Promise<ResultadoAnalisesUI>;
  children: ReactNode;
}) {
  const [sugestoes, setSugestoes] = useState<Map<string, SugestaoSecao>>(new Map());
  const [contexto, setContexto] = useState('');
  const [contextoSalvo, setContextoSalvo] = useState('');
  const [ocupada, setOcupada] = useState(false);
  const [mensagem, setMensagem] = useState('');
  const espacosMap = useMemo(() => new Map(espacos.map((espaco) => [espaco.secao, espaco])), [espacos]);

  useEffect(() => {
    if (!podeRevisar) return;
    let ativa = true;
    setOcupada(true);
    void aoAcionar('carregar').then((resultado) => {
      if (!ativa) return;
      const texto = resultado.contexto?.texto ?? '';
      setContexto(texto);
      setContextoSalvo(texto);
      setSugestoes(mapaDeSugestoes(resultado.sugestoes ?? []));
    }).catch((erro) => {
      if (ativa) setMensagem(erro instanceof Error ? erro.message : 'As análises anteriores não puderam ser carregadas.');
    }).finally(() => { if (ativa) setOcupada(false); });
    return () => { ativa = false; };
  }, [aoAcionar, podeRevisar]);

  async function salvarContexto() {
    setOcupada(true); setMensagem('');
    try {
      const resultado = await aoAcionar('salvar_contexto', { contexto });
      const salvo = resultado.contexto?.texto ?? '';
      setContexto(salvo); setContextoSalvo(salvo);
      setMensagem('Contexto interno salvo. Ele não faz parte do relatório do cliente.');
    } catch (erro) {
      setMensagem(erro instanceof Error ? erro.message : 'O contexto não pôde ser salvo.');
    } finally { setOcupada(false); }
  }

  async function gerarTodas() {
    setOcupada(true); setMensagem('');
    try {
      const resultado = await aoAcionar('gerar_todas');
      setSugestoes(mapaDeSugestoes(resultado.sugestoes ?? []));
      setMensagem('Análises geradas em conjunto. Revise cada seção antes de aplicar.');
    } catch (erro) {
      setMensagem(erro instanceof Error ? erro.message : 'As análises não puderam ser geradas.');
    } finally { setOcupada(false); }
  }

  async function agir(acao: 'gerar_secao' | 'aplicar' | 'editar' | 'desfazer', secao: string, texto?: string) {
    const sugestao = sugestoes.get(secao);
    setOcupada(true); setMensagem('');
    try {
      const resultado = await aoAcionar(acao, { secao, sugestao, texto });
      const atual = resultado.sugestao ?? resultado.sugestoes?.[0];
      if (!atual) throw new Error('A ação não retornou uma sugestão persistida.');
      setSugestoes((anteriores) => new Map(anteriores).set(secao, atual));
    } catch (erro) {
      setMensagem(erro instanceof Error ? erro.message : 'A análise desta seção não pôde ser atualizada.');
      throw erro;
    } finally { setOcupada(false); }
  }

  if (!podeRevisar) return <>{children}</>;
  return (
    <ContextoAnalises.Provider value={{ espacos: espacosMap, sugestoes, ocupada, mensagem, agir }}>
      <aside className="dcp-analises-relatorio" aria-label="Análises assistidas do relatório">
        <div className="dcp-analises-relatorio__cabecalho">
          <div>
            <p className="dcp-eyebrow">Contexto e análises</p>
            <h3>Análises por seção</h3>
            <p>O Sonnet lê o relatório inteiro e este contexto interno. A geração conjunta mantém as seções sob a mesma leitura editorial.</p>
          </div>
          <button type="button" className="dcp-botao dcp-botao--primario" disabled={ocupada || espacos.length === 0} onClick={() => void gerarTodas()}>
            Gerar análises do relatório
          </button>
        </div>
        <label htmlFor="dcp-contexto-mes"><strong>Contexto do mês</strong></label>
        <textarea
          id="dcp-contexto-mes"
          rows={5}
          value={contexto}
          onChange={(evento) => setContexto(evento.target.value)}
          placeholder="Ex.: houve promoção, mudança de página, falta de estoque ou alteração na qualidade dos leads."
        />
        <div className="dcp-analises-relatorio__rodape">
          <span>Campo interno: não aparece ao cliente sem uma ação editorial explícita.</span>
          <button type="button" className="dcp-botao dcp-botao--discreto" disabled={ocupada || contexto === contextoSalvo} onClick={() => void salvarContexto()}>
            Salvar contexto
          </button>
        </div>
        {mensagem && <p className="dcp-analises-relatorio__mensagem" aria-live="polite">{mensagem}</p>}
      </aside>
      {children}
    </ContextoAnalises.Provider>
  );
}

export function AnaliseDaSecao({ secao }: { secao: string }) {
  const contexto = useContext(ContextoAnalises);
  const espaco = contexto?.espacos.get(secao);
  const sugestao = contexto?.sugestoes.get(secao);
  const [editando, setEditando] = useState(false);
  const [texto, setTexto] = useState('');
  const [erro, setErro] = useState('');
  if (!contexto || !espaco) return null;

  async function agir(acao: 'gerar_secao' | 'aplicar' | 'editar' | 'desfazer', textoEditado?: string) {
    if (acao === 'editar' && !textoEditado?.trim()) { setErro('A análise não pode ficar vazia.'); return; }
    setErro('');
    try { await contexto!.agir(acao, secao, textoEditado); setEditando(false); } catch { /* a mensagem global preserva o rascunho */ }
  }

  const aplicada = sugestao && (sugestao.estado === 'aplicada' || sugestao.estado === 'editada');
  return (
    <div className="dcp-analise-secao">
      {aplicada && <p className="dc-analise-editorial">{sugestao.texto}</p>}
      <div className="dcp-analise-secao__controles">
        <div className="dcp-analise-secao__topo">
          <div><strong>Análise editorial</strong><span>{espaco.objetivo}</span></div>
          <button type="button" className="dcp-botao dcp-botao--discreto" disabled={contexto.ocupada} onClick={() => void agir('gerar_secao')} aria-label={`Refinar análise de ${espaco.titulo}`}>
            ✎ Refinar análise
          </button>
        </div>
        {sugestao && sugestao.estado !== 'desfeita' && (
          <div className="dcp-analise-secao__sugestao">
            {editando ? <textarea aria-label={`Editar análise de ${espaco.titulo}`} rows={7} value={texto} onChange={(evento) => setTexto(evento.target.value)} /> : <p>{sugestao.texto}</p>}
            <div className="dcp-analise-secao__acoes">
              {editando ? <>
                <button type="button" className="dcp-botao dcp-botao--primario" disabled={contexto.ocupada} onClick={() => void agir('editar', texto)}>Salvar edição</button>
                <button type="button" className="dcp-botao dcp-botao--discreto" onClick={() => { setEditando(false); setErro(''); }}>Cancelar</button>
              </> : <>
                <button type="button" className="dcp-botao dcp-botao--primario" disabled={contexto.ocupada} onClick={() => void agir('aplicar')}>Aplicar na revisão</button>
                <button type="button" className="dcp-botao dcp-botao--discreto" onClick={() => { setTexto(sugestao.texto); setEditando(true); }}>Editar</button>
                <button type="button" className="dcp-botao dcp-botao--discreto" disabled={contexto.ocupada} onClick={() => void agir('desfazer')}>Desfazer</button>
              </>}
            </div>
          </div>
        )}
        {erro && <p className="dcp-analise-secao__erro" role="alert">{erro}</p>}
      </div>
    </div>
  );
}
