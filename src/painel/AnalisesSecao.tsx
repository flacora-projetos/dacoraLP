import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { rotuloDaAuditoria } from './modoAnalise';
import { paragrafosDaAnaliseEditorial } from './analiseEditorial';

export interface EspacoAnaliticoSeguro { secao: string; blocoId: string; titulo: string; objetivo: string; }
export interface SugestaoSecao { id: string; secao: string; estado: string; texto: string; checksum: string; modelo?: string | null; }
export interface ContextoMesSeguro { texto: string; atualizadoPor?: string; atualizadoEm?: string; }
export type AcaoAnalisesUI = 'carregar' | 'salvar_contexto' | 'gerar_todas' | 'gerar_secao' | 'aplicar' | 'editar' | 'desfazer';
export interface ResultadoAnalisesUI { contexto?: ContextoMesSeguro | null; sugestoes?: SugestaoSecao[]; sugestao?: SugestaoSecao | null; espacos?: EspacoAnaliticoSeguro[]; }

export function sugestaoDaSecaoEstaFechada(sugestao: SugestaoSecao | undefined): boolean {
  return sugestao?.estado === 'aplicada' || sugestao?.estado === 'editada' || sugestao?.estado === 'desfeita';
}

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
  const [editandoContexto, setEditandoContexto] = useState(true);
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
      setEditandoContexto(!texto);
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
      setContexto(salvo); setContextoSalvo(salvo); setEditandoContexto(false);
      setMensagem('Contexto interno salvo. As próximas sugestões usarão esta versão.');
    } catch (erro) {
      setMensagem(erro instanceof Error ? erro.message : 'O contexto não pôde ser salvo.');
    } finally { setOcupada(false); }
  }

  async function gerarTodas() {
    setOcupada(true); setMensagem('');
    try {
      const resultado = await aoAcionar('gerar_todas');
      setSugestoes(mapaDeSugestoes(resultado.sugestoes ?? []));
      setMensagem('Análises das seções geradas. Revise cada proposta antes de aplicar.');
    } catch (erro) {
      setMensagem(erro instanceof Error ? erro.message : 'As análises das seções não puderam ser geradas.');
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
      <aside className="dcp-analises-relatorio" aria-label="Análises assistidas das seções do relatório">
        <div className="dcp-analises-relatorio__cabecalho">
          <div>
            <strong>Análises das seções</strong>
            <p>Preenche as análises ao longo do relatório. A introdução continua no botão “Melhorar análise”.</p>
          </div>
          <button type="button" className="dcp-botao dcp-botao--discreto" disabled={ocupada} onClick={() => void gerarTodas()}>
            Gerar análises do relatório
          </button>
        </div>
        <details className="dcp-contexto-mes">
          <summary>
            <span><strong>Contexto do mês</strong><small>Opcional · usado nas próximas sugestões da introdução e das seções</small></span>
          </summary>
          <p>Adicione fatos internos que não aparecem nas plataformas. O contexto salvo é relido no servidor e acompanha a próxima geração, independentemente do modelo selecionado.</p>
          {editandoContexto ? <>
            <label className="dcp-sr" htmlFor="dcp-contexto-mes">Contexto do mês</label>
            <textarea
              id="dcp-contexto-mes"
              rows={4}
              value={contexto}
              onChange={(evento) => setContexto(evento.target.value)}
              placeholder="Ex.: houve promoção, mudança de página, falta de estoque ou alteração na qualidade dos leads."
            />
            <div className="dcp-analises-relatorio__rodape">
              <span>Interno: não aparece ao cliente sem ação editorial explícita.</span>
              <div className="dcp-contexto-mes__acoes">
                {contextoSalvo && <button type="button" className="dcp-botao dcp-botao--discreto" disabled={ocupada} onClick={() => { setContexto(contextoSalvo); setEditandoContexto(false); setMensagem(''); }}>Cancelar</button>}
                <button type="button" className="dcp-botao dcp-botao--discreto" disabled={ocupada || contexto === contextoSalvo} onClick={() => void salvarContexto()}>
                  Salvar contexto
                </button>
              </div>
            </div>
          </> : <div className="dcp-contexto-mes__salvo">
            <p>{contextoSalvo}</p>
            <div className="dcp-analises-relatorio__rodape">
              <span>Interno: não aparece ao cliente sem ação editorial explícita.</span>
              <button type="button" className="dcp-botao dcp-botao--discreto" disabled={ocupada} onClick={() => { setContexto(contextoSalvo); setEditandoContexto(true); setMensagem(''); }}>
                Editar contexto
              </button>
            </div>
          </div>}
        </details>
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
      {aplicada && <div className="dc-analise-editorial">{paragrafosDaAnaliseEditorial(sugestao.texto).map((paragrafo, indice) => <p key={`${secao}-${indice}`}>{paragrafo}</p>)}</div>}
      <div className="dcp-analise-secao__controles">
        <div className="dcp-analise-secao__topo">
          <div><strong>Análise editorial</strong><span>{espaco.objetivo}</span></div>
          <button type="button" className="dcp-botao dcp-botao--discreto" disabled={contexto.ocupada} onClick={() => void agir('gerar_secao')} aria-label={`Refinar análise de ${espaco.titulo}`}>
            ✎ Refinar análise
          </button>
        </div>
        {sugestao && !sugestaoDaSecaoEstaFechada(sugestao) && (
          <div className="dcp-analise-secao__sugestao">
            {sugestao.modelo && <small className="dcp-analise-modelo">{rotuloDaAuditoria(sugestao.modelo)}</small>}
            {editando ? <textarea aria-label={`Editar análise de ${espaco.titulo}`} rows={7} value={texto} onChange={(evento) => setTexto(evento.target.value)} /> : <div className="dcp-analise-secao__texto">{paragrafosDaAnaliseEditorial(sugestao.texto).map((paragrafo, indice) => <p key={`${secao}-sugestao-${indice}`}>{paragrafo}</p>)}</div>}
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
