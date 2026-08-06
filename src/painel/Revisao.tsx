/**
 * P2 — o relatório dentro da bancada, com a faixa fixa de revisão.
 *
 * Não existe mutação aqui. Os botões mostram o fluxo da próxima fase, mas
 * permanecem desabilitados. Mais importante: carregamento e erro não montam a
 * faixa, então não há nem aparência de decisão antes do conteúdo chegar.
 */
import { useEffect, useRef, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { Link } from 'react-router-dom';
import RelatorioMontado from '../reports/RelatorioMontado';
import { formatarCompetencia } from '../reports/format';
import { usarPainelAuth } from './AuthContext';
import { RevisaoMoldura, type RelatorioDaRevisao } from './RevisaoMoldura';

export function RevisaoApresentada({ relatorio }: { relatorio: RelatorioDaRevisao | null }) {
  return <RevisaoMoldura relatorio={relatorio}>{relatorio ? (
    <RelatorioMontado
      snapshot={relatorio.snapshot}
      proposta="B"
      competencias={[{
        competencia: relatorio.competencia,
        rotulo: formatarCompetencia(relatorio.competencia),
        publicada: relatorio.estado === 'liberado' || relatorio.estado === 'enviado',
      }]}
    />
  ) : null}</RevisaoMoldura>;
}

export default function Revisao({ relatorioId }: { relatorioId: string }) {
  const { sessao } = usarPainelAuth();
  return <RevisaoComSessao sessao={sessao} relatorioId={relatorioId} />;
}

export function RevisaoComSessao({
  sessao,
  relatorioId,
}: {
  sessao: Session | null;
  relatorioId: string;
}) {
  const [relatorio, setRelatorio] = useState<RelatorioDaRevisao | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [tentativa, setTentativa] = useState(0);
  const sessaoAtualRef = useRef(sessao);
  sessaoAtualRef.current = sessao;
  const usuarioId = sessao?.user?.id ?? null;

  useEffect(() => {
    const sessaoAtual = sessaoAtualRef.current;
    if (!usuarioId || !sessaoAtual) return;
    const controle = new AbortController();

    async function carregar() {
      setCarregando(true);
      setErro(null);
      setRelatorio(null);
      try {
        const resposta = await fetch(`/api/painel-relatorio?id=${encodeURIComponent(relatorioId)}`, {
          headers: { Authorization: `Bearer ${sessaoAtual.access_token}` },
          signal: controle.signal,
        });
        const corpo = await resposta.json().catch(() => null);
        if (!resposta.ok) {
          setErro(String(corpo?.mensagem ?? 'Não foi possível carregar este relatório.'));
          return;
        }
        if (corpo?.relatorio?.conteudoCarregado !== true) {
          setErro('O conteúdo não chegou inteiro. Nenhuma decisão está disponível.');
          return;
        }
        setRelatorio(corpo.relatorio as RelatorioDaRevisao);
      } catch (falha) {
        if ((falha as Error)?.name !== 'AbortError') {
          setErro('Não foi possível falar com o servidor. Verifique a conexão e tente novamente.');
        }
      } finally {
        if (!controle.signal.aborted) setCarregando(false);
      }
    }

    void carregar();
    return () => controle.abort();
  }, [relatorioId, tentativa, usuarioId]);

  if (carregando) {
    return (
      <section className="dcp-revisao__carregando" aria-busy="true" aria-live="polite">
        <p>Carregando o relatório…</p>
        {Array.from({ length: 5 }).map((_, indice) => (
          <span key={indice} className="dcp-espera__barra" />
        ))}
      </section>
    );
  }

  if (erro || !relatorio) {
    return (
      <section className="dcp-secao dcp-revisao__erro" role="alert">
        <h1 className="dcp-secao__titulo">O relatório não carregou</h1>
        <p className="dcp-secao__apoio">{erro ?? 'Volte para a fila e tente abrir de novo.'}</p>
        <div className="dcp-acoes">
          <button type="button" className="dcp-botao dcp-botao--primario" onClick={() => setTentativa((valor) => valor + 1)}>
            Tentar novamente
          </button>
          <Link className="dcp-botao dcp-botao--discreto" to="/painel-de-relatorios">
            Voltar para a fila
          </Link>
        </div>
      </section>
    );
  }

  return <RevisaoApresentada relatorio={relatorio} />;
}
