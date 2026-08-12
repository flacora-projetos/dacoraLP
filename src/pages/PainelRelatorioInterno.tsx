/**
 * `/painel-de-relatorios/interno/:id` — detalhe do MENSAL INTERNO ALLGROTECH
 * (A3), insumo para a parceira, nunca documento de cliente.
 *
 * Reusa a mesma porta de entrada do painel (`PainelAuthProvider` + `Portao`),
 * sem tocar em nenhum arquivo do fluxo de aprovar/recusar/enviar. Busca o
 * detalhe em `/api/painel-relatorio-interno`, um endpoint NOVO — não em
 * `/api/painel-relatorio`, que espera o formato do mensal externo.
 */
import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { PainelAuthProvider, usarPainelAuth } from '../painel/AuthContext';
import Portao from '../painel/Portao';
import DetalheInterno, { type DetalheInternoResposta } from '../painel/DetalheInterno';
import { usaPaginaPrivada } from '../painel/usaPaginaPrivada';
import { useLinkDeVoltaParaFila } from '../painel/linkDeVolta';
import '../painel/painel.css';

function ConteudoInterno({ id }: { id: string }) {
  const { sessao } = usarPainelAuth();
  const linkDeVolta = useLinkDeVoltaParaFila();
  const [detalhe, setDetalhe] = useState<DetalheInternoResposta | null>(null);
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
      setDetalhe(null);
      try {
        const resposta = await fetch(`/api/painel-relatorio-interno?id=${encodeURIComponent(id)}`, {
          headers: { Authorization: `Bearer ${sessaoAtual.access_token}` },
          signal: controle.signal,
        });
        const corpo = await resposta.json().catch(() => null);
        if (!resposta.ok) {
          setErro(String(corpo?.mensagem ?? 'Não foi possível carregar este relatório.'));
          return;
        }
        if (corpo?.detalhe?.conteudoCarregado !== true) {
          setErro('O conteúdo não chegou inteiro.');
          return;
        }
        setDetalhe(corpo.detalhe as DetalheInternoResposta);
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
  }, [id, tentativa, usuarioId]);

  if (carregando) {
    return (
      <section className="dcp-revisao__carregando" aria-busy="true" aria-live="polite">
        <p>Carregando o relatório…</p>
      </section>
    );
  }

  if (erro || !detalhe) {
    return (
      <section className="dcp-secao" role="alert">
        <h1 className="dcp-secao__titulo">O relatório não carregou</h1>
        <p className="dcp-secao__apoio">{erro ?? 'Volte para a fila e tente abrir de novo.'}</p>
        <div className="dcp-acoes">
          <button type="button" className="dcp-botao dcp-botao--primario" onClick={() => setTentativa((v) => v + 1)}>
            Tentar novamente
          </button>
          <Link className="dcp-botao dcp-botao--discreto" to={linkDeVolta}>
            Voltar para a fila
          </Link>
        </div>
      </section>
    );
  }

  return <DetalheInterno detalhe={detalhe} />;
}

export default function PainelRelatorioInterno() {
  usaPaginaPrivada('Mensal interno Allgrotech | Painel Dácora');
  const { id } = useParams<{ id: string }>();

  return (
    <div className="dc-painel">
      <PainelAuthProvider>
        <Portao>
          <header className="dcp-topo">
            <div className="dcp-topo__conteudo">
              <span className="dcp-topo__marca">Dácora</span>
              <span className="dcp-topo__separador" aria-hidden="true" />
              <span className="dcp-topo__titulo">Mensal interno Allgrotech</span>
            </div>
          </header>
          <main className="dcp-corpo">{id ? <ConteudoInterno id={id} /> : null}</main>
        </Portao>
      </PainelAuthProvider>
    </div>
  );
}
