import { useEffect, useRef, useState } from 'react';
import { rotuloDaAuditoria } from './modoAnalise';

export type AcaoDaIntroducao = 'carregar' | 'gerar' | 'aplicar' | 'editar' | 'desfazer';
export interface SugestaoDaIntroducao { id: string; estado: string; texto: string; checksum: string; modelo?: string | null; }

export function sugestaoDaIntroducaoEstaFechada(sugestao: SugestaoDaIntroducao | null): boolean {
  return sugestao?.estado === 'aplicada' || sugestao?.estado === 'editada' || sugestao?.estado === 'desfeita';
}

export function AnaliseIntroducao({
  original,
  podeRevisar,
  aoAcionar,
  aoMudarTexto,
}: {
  original: string;
  podeRevisar: boolean;
  aoAcionar: (acao: AcaoDaIntroducao, sugestao?: SugestaoDaIntroducao, texto?: string) => Promise<SugestaoDaIntroducao | null>;
  aoMudarTexto: (texto: string | null) => void;
}) {
  const [sugestao, setSugestao] = useState<SugestaoDaIntroducao | null>(null);
  const [estado, setEstado] = useState<'ociosa' | 'carregando' | 'erro'>('carregando');
  const [mensagem, setMensagem] = useState('');
  const [editando, setEditando] = useState(false);
  const [textoEditado, setTextoEditado] = useState('');
  const campoDeEdicao = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (!podeRevisar) { setEstado('ociosa'); return; }
    void aoAcionar('carregar').then((atual) => {
      setSugestao(atual);
      if (atual && (atual.estado === 'aplicada' || atual.estado === 'editada')) aoMudarTexto(atual.texto);
      setEstado('ociosa');
    }).catch(() => { setMensagem('A sugestão anterior não pôde ser carregada.'); setEstado('erro'); });
  }, [aoAcionar, aoMudarTexto, podeRevisar]);

  useEffect(() => {
    if (!editando) return;
    const campo = campoDeEdicao.current;
    if (!campo) return;
    campo.focus({ preventScroll: true });
    campo.scrollIntoView?.({ block: 'center', inline: 'nearest', behavior: 'smooth' });
  }, [editando]);

  async function agir(acao: Exclude<AcaoDaIntroducao, 'carregar'>, texto?: string) {
    if (acao === 'editar' && !texto?.trim()) {
      setMensagem('Escreva uma sugestão antes de salvar a edição.');
      setEstado('erro');
      return;
    }
    setEstado('carregando'); setMensagem('');
    try {
      const atual = await aoAcionar(acao, sugestao ?? undefined, texto);
      if (!atual) throw new Error('sem_sugestao');
      setSugestao(atual);
      if (acao === 'aplicar' || acao === 'editar') aoMudarTexto(atual.texto);
      if (acao === 'desfazer') aoMudarTexto(null);
      setEditando(false); setEstado('ociosa');
    } catch (erro) {
      setMensagem(erro instanceof Error ? erro.message : 'Não foi possível concluir esta ação.');
      setEstado('erro');
    }
  }

  function iniciarEdicao() {
    if (!sugestao) return;
    setMensagem('');
    setTextoEditado(sugestao.texto);
    setEditando(true);
  }

  function cancelarEdicao() {
    setMensagem('');
    setTextoEditado('');
    setEditando(false);
    setEstado('ociosa');
  }

  if (!podeRevisar) return null;
  return (
    <aside className="dcp-analise-introducao" aria-label="Revisão assistida da introdução">
      <div className="dcp-analise-introducao__cabecalho">
        <div>
          <p className="dcp-eyebrow">Revisão assistida</p>
          <h3>Melhore a introdução com análise factual</h3>
          <p className="dcp-analise-introducao__apoio">Gera uma proposta a partir do material factual e editorial disponível neste relatório. Você compara, edita e decide.</p>
        </div>
        <button type="button" className="dcp-botao dcp-botao--primario" disabled={estado === 'carregando'} onClick={() => void agir('gerar')}>
          Melhorar análise
        </button>
      </div>
      {estado === 'carregando' && <p className="dcp-analise-introducao__estado" aria-live="polite">Carregando sugestão editorial…</p>}
      {mensagem && <p className="dcp-analise-introducao__erro" role="alert">{mensagem} O texto original permanece preservado.</p>}
      {sugestao?.estado === 'desfeita' && <p className="dcp-analise-introducao__estado" aria-live="polite">Sugestão desfeita. O texto original foi restaurado.</p>}
      {(sugestao?.estado === 'aplicada' || sugestao?.estado === 'editada') && (
        <p className="dcp-analise-introducao__estado" aria-live="polite">Revisão aplicada à introdução. Use “Melhorar análise” para gerar uma nova proposta.</p>
      )}
      {sugestao && !sugestaoDaIntroducaoEstaFechada(sugestao) && (
        <div className="dcp-analise-introducao__comparacao">
          <div><strong>Original</strong><p>{original}</p></div>
          <div><strong>Sugestão</strong>{sugestao.modelo && <small className="dcp-analise-modelo">{rotuloDaAuditoria(sugestao.modelo)}</small>}{editando ? (
            <textarea ref={campoDeEdicao} aria-label="Editar sugestão da introdução" rows={12} value={textoEditado} onChange={(evento) => setTextoEditado(evento.target.value)} />
          ) : <p>{sugestao.texto}</p>}</div>
          <div className="dcp-analise-introducao__acoes">
            {editando ? <>
              <button type="button" className="dcp-botao dcp-botao--primario" disabled={estado === 'carregando'} onClick={() => void agir('editar', textoEditado)}>Salvar edição</button>
              <button type="button" className="dcp-botao dcp-botao--discreto" disabled={estado === 'carregando'} onClick={cancelarEdicao}>Cancelar</button>
            </> : <>
              <button type="button" className="dcp-botao dcp-botao--primario" disabled={estado === 'carregando'} onClick={() => void agir('aplicar')}>Aplicar na revisão</button>
              <button type="button" className="dcp-botao dcp-botao--discreto" onClick={iniciarEdicao}>Editar</button>
              <button type="button" className="dcp-botao dcp-botao--discreto" disabled={estado === 'carregando'} onClick={() => void agir('desfazer')}>Desfazer</button>
            </>}
          </div>
        </div>
      )}
    </aside>
  );
}
