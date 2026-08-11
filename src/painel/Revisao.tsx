/**
 * A bancada de revisão — o relatório dentro do painel, com a faixa fixa.
 *
 * A P2 trouxe o documento; a P3 acrescenta o verbo. Duas coisas continuam
 * valendo exatamente como estavam, e as duas são desenho:
 *
 *  • **carregamento e erro não montam a faixa**, então não existe nem aparência
 *    de decisão antes de o conteúdo chegar;
 *  • **não há caminho para decidir a partir da fila** — o botão vive aqui, com
 *    o documento aberto.
 *
 * Quem grava é o servidor (`/api/painel-decisao`), que confere sessão e e-mail
 * por conta própria e resolve **quem decidiu pela sessão**, ignorando qualquer
 * identidade que o navegador mandasse. Esta tela só mostra e pergunta.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { Link } from 'react-router-dom';
import RelatorioMontado from '../reports/RelatorioMontado';
import { formatarCompetencia } from '../reports/format';
import { usarPainelAuth } from './AuthContext';
import { RevisaoMoldura, type RelatorioDaRevisao } from './RevisaoMoldura';
import type { PedidoDeDecisao, ResultadoDaDecisao } from './DecisaoDaRevisao';
import type { EstadoSeguroDoEnvioP5, ResultadoDoEnvioP5 } from './EnvioDaRevisao';
import type { HistoricoSeguroDoCliente } from '../../api/_painel-historico-dados';
import type { ResultadoDoHistorico } from './HistoricoDoCliente';

export function RevisaoApresentada({
  relatorio,
  quem,
  aoDecidir,
  aoCarregarEnvio,
  aoSolicitarEnvio,
  aoCarregarHistorico,
}: {
  relatorio: RelatorioDaRevisao | null;
  quem?: string;
  aoDecidir?: (pedido: PedidoDeDecisao) => Promise<ResultadoDaDecisao>;
  aoCarregarEnvio?: () => Promise<ResultadoDoEnvioP5>;
  aoSolicitarEnvio?: () => Promise<ResultadoDoEnvioP5>;
  aoCarregarHistorico?: () => Promise<ResultadoDoHistorico>;
}) {
  return <RevisaoMoldura
    relatorio={relatorio}
    quem={quem}
    aoDecidir={aoDecidir}
    aoCarregarEnvio={aoCarregarEnvio}
    aoSolicitarEnvio={aoSolicitarEnvio}
    aoCarregarHistorico={aoCarregarHistorico}
  >{relatorio ? (
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

  /**
   * Registra a decisão e **recarrega o relatório do servidor**.
   *
   * Recarregar em vez de remendar o objeto local não é preciosismo: o que vale
   * é o que ficou no banco, e a segunda leitura é o que faz a tela mostrar o
   * estado real em vez do estado que ela esperava. É a mesma disciplina do
   * read-back que o servidor já faz do outro lado.
   */
  async function decidir(pedido: PedidoDeDecisao): Promise<ResultadoDaDecisao> {
    const sessaoAtual = sessaoAtualRef.current;
    if (!sessaoAtual || !relatorio?.checksum) {
      return {
        ok: false,
        mensagem: 'A sessão expirou nesta aba. Entre de novo e reabra a revisão — nada foi gravado.',
      };
    }
    try {
      const resposta = await fetch('/api/painel-decisao', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${sessaoAtual.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: relatorio.id,
          decisao: pedido.decisao,
          // O checksum que ESTA tela mostrou. Se o documento mudou no banco, o
          // servidor recusa em vez de carimbar algo que ninguém leu.
          checksum: relatorio.checksum,
          ...(pedido.decisao === 'recusar' ? { motivo: pedido.motivo ?? '' } : {}),
        }),
      });
      const corpo = await resposta.json().catch(() => null);
      if (!resposta.ok || corpo?.gravado !== true) {
        return {
          ok: false,
          mensagem: String(
            corpo?.mensagem ?? 'Não foi possível registrar a decisão. Nada foi gravado.',
          ),
        };
      }
      // Relê do servidor: o estado da tela passa a ser o do banco.
      setTentativa((valor) => valor + 1);
      return {
        ok: true,
        mensagem: corpo?.jaEstavaAssim
          ? 'Esta decisão já estava registrada exatamente assim. Nada foi duplicado.'
          : String(corpo?.eco ?? 'Decisão registrada.'),
      };
    } catch {
      return {
        ok: false,
        mensagem:
          'Não foi possível falar com o servidor. Recarregue a revisão para ver se a decisão foi ' +
          'registrada antes de tentar de novo.',
      };
    }
  }

  const carregarEnvio = useCallback(async (): Promise<ResultadoDoEnvioP5> => {
    const sessaoAtual = sessaoAtualRef.current;
    const relatorioAtual = relatorio;
    if (!sessaoAtual || !relatorioAtual?.id) {
      return {
        ok: false,
        mensagem: 'A sessão expirou nesta aba. Entre novamente e reabra a revisão.',
      };
    }
    try {
      const resposta = await fetch(
        `/api/painel-envio?id=${encodeURIComponent(relatorioAtual.id)}`,
        { headers: { Authorization: `Bearer ${sessaoAtual.access_token}` } },
      );
      const corpo = await resposta.json().catch(() => null);
      if (!resposta.ok || !corpo?.envio) {
        return {
          ok: false,
          mensagem: String(corpo?.mensagem ?? 'Não foi possível carregar o destino canônico.'),
        };
      }
      return { ok: true, estado: corpo.envio as EstadoSeguroDoEnvioP5 };
    } catch {
      return {
        ok: false,
        mensagem: 'Não foi possível consultar a fábrica agora. Reabra a revisão e tente novamente.',
      };
    }
  }, [relatorio, usuarioId]);

  const solicitarEnvio = useCallback(async (): Promise<ResultadoDoEnvioP5> => {
    const sessaoAtual = sessaoAtualRef.current;
    const relatorioAtual = relatorio;
    if (!sessaoAtual || !relatorioAtual?.id || !relatorioAtual.checksum) {
      return {
        ok: false,
        mensagem: 'A sessão ou a impressão digital expirou. Reabra a revisão — nada foi solicitado.',
      };
    }
    try {
      const resposta = await fetch('/api/painel-envio', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${sessaoAtual.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: relatorioAtual.id,
          checksum: relatorioAtual.checksum,
        }),
      });
      const corpo = await resposta.json().catch(() => null);
      if (!resposta.ok || corpo?.solicitado !== true || !corpo?.envio) {
        return {
          ok: false,
          mensagem: String(corpo?.mensagem ?? 'Não foi possível solicitar o envio. Nada foi confirmado.'),
        };
      }
      return {
        ok: true,
        estado: corpo.envio as EstadoSeguroDoEnvioP5,
        mensagem: String(corpo?.mensagem ?? 'Envio solicitado.'),
      };
    } catch {
      return {
        ok: false,
        mensagem:
          'Não foi possível falar com o servidor. Reabra a revisão para ler o estado durável antes de tentar novamente.',
      };
    }
  }, [relatorio, usuarioId]);

  const carregarHistorico = useCallback(async (): Promise<ResultadoDoHistorico> => {
    const sessaoAtual = sessaoAtualRef.current;
    const relatorioAtual = relatorio;
    if (!sessaoAtual || !relatorioAtual?.id) {
      return {
        ok: false,
        mensagem: 'A sessão expirou nesta aba. Entre novamente e reabra a revisão.',
      };
    }
    try {
      const resposta = await fetch(
        `/api/painel-historico?id=${encodeURIComponent(relatorioAtual.id)}`,
        { headers: { Authorization: `Bearer ${sessaoAtual.access_token}` } },
      );
      const corpo = await resposta.json().catch(() => null);
      if (!resposta.ok || !corpo?.historico) {
        return {
          ok: false,
          mensagem: String(corpo?.mensagem ?? 'Não foi possível carregar o histórico do cliente.'),
        };
      }
      return { ok: true, historico: corpo.historico as HistoricoSeguroDoCliente };
    } catch {
      return {
        ok: false,
        mensagem: 'Não foi possível falar com o servidor. Tente abrir o histórico novamente.',
      };
    }
  }, [relatorio, usuarioId]);

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

  return (
    <RevisaoApresentada
      relatorio={relatorio}
      quem={sessao?.user?.email ?? undefined}
      aoDecidir={decidir}
      aoCarregarEnvio={carregarEnvio}
      aoSolicitarEnvio={solicitarEnvio}
      aoCarregarHistorico={carregarHistorico}
    />
  );
}
