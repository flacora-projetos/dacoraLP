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
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { Link } from 'react-router-dom';
import RelatorioMontado from '../reports/RelatorioMontado';
import { formatarCompetencia } from '../reports/format';
import { usarPainelAuth } from './AuthContext';
import { RevisaoMoldura, type RelatorioDaRevisao } from './RevisaoMoldura';
import type { PedidoDeDecisao, ResultadoDaDecisao } from './DecisaoDaRevisao';
import { corpoDaDecisao } from './corpoDaDecisao';
import type { EstadoSeguroDoEnvioP5, ResultadoDoEnvioP5 } from './EnvioDaRevisao';
import { useLinkDeVoltaParaFila } from './linkDeVolta';
import { AnaliseIntroducao, type AcaoDaIntroducao, type SugestaoDaIntroducao } from './AnaliseIntroducao';
import {
  AnaliseDaSecao,
  AnalisesSecaoProvider,
  HistoricoDaSecao,
  DispensaDaSecao,
  type AcaoAnalisesUI,
  type ResultadoAnalisesUI,
  type SugestaoSecao,
} from './AnalisesSecao';
import { espacosAnaliticosDoSnapshot } from '../reports/blocos/analise';
import { OPCOES_MODO_ANALISE, type ModoAnaliseUI } from './modoAnalise';
import { afirmacoesDaIntroducaoRevisada } from './revisaoAnalise';
import type { HistoricoEditorialInterno } from './HistoricoAnalises';
import type { EstadoRetencaoEditorial, ResultadoRetencaoEditorial } from './RetencaoEditorial';
import type { ResumoEditorialRA4 } from './estadoEditorial';

export function RevisaoApresentada({
  relatorio,
  quem,
  aoDecidir,
  aoCarregarEnvio,
  aoSolicitarEnvio,
  aoCarregarRetencao,
  aoDescartarRetencao,
  aoRegistrarObservacao,
  aoAnalisarIntroducao,
  aoAnalisarSecoes,
  modoAnalise,
  aoMudarModoAnalise,
  historicoAnalises,
}: {
  relatorio: RelatorioDaRevisao | null;
  historicoAnalises?: HistoricoEditorialInterno | null;
  quem?: string;
  aoDecidir?: (pedido: PedidoDeDecisao) => Promise<ResultadoDaDecisao>;
  aoCarregarEnvio?: () => Promise<ResultadoDoEnvioP5>;
  aoSolicitarEnvio?: () => Promise<ResultadoDoEnvioP5>;
  aoCarregarRetencao?: () => Promise<ResultadoRetencaoEditorial>;
  aoDescartarRetencao?: (confirmacao: string) => Promise<ResultadoRetencaoEditorial>;
  aoRegistrarObservacao?: (secao: string, texto: string) => Promise<ResultadoDaDecisao>;
  aoAnalisarIntroducao?: (acao: AcaoDaIntroducao, sugestao?: SugestaoDaIntroducao, texto?: string) => Promise<SugestaoDaIntroducao | null>;
  aoAnalisarSecoes?: (acao: AcaoAnalisesUI, dados?: { secao?: string; sugestao?: SugestaoSecao; texto?: string; contexto?: string }) => Promise<ResultadoAnalisesUI>;
  modoAnalise?: ModoAnaliseUI;
  aoMudarModoAnalise?: (modo: ModoAnaliseUI) => void;
}) {
  const [introducaoRevisada, setIntroducaoRevisada] = useState<string | null>(null);
  const snapshotDaRevisao = useMemo(() => {
    if (!relatorio || !introducaoRevisada) return relatorio?.snapshot;
    return {
      ...relatorio.snapshot,
      leitura: {
        ...relatorio.snapshot.leitura,
        resumoExecutivo: afirmacoesDaIntroducaoRevisada(introducaoRevisada),
      },
    };
  }, [relatorio, introducaoRevisada]);
  const introducaoOriginal = relatorio?.snapshot.leitura.resumoExecutivo.map((item) => item.texto).join('\n\n') ?? '';
  const espacosAnaliticos = useMemo(() => relatorio ? espacosAnaliticosDoSnapshot(relatorio.snapshot).map(({ secao, blocoId, titulo, objetivo }) => ({ secao, blocoId, titulo, objetivo })) : [], [relatorio]);
  const renderizarAnaliseDaSecao = useCallback((secao: `bloco:${string}`) => <AnaliseDaSecao secao={secao} />, []);
  /* Referência factual da coleta deste snapshot. `publicacao.geradoEm` diz
     quando a linha do relatório foi produzida; AV2 precisa dizer quando os
     DADOS foram consultados. Por isso usamos o `coletadoEm` mais recente das
     fontes do próprio snapshot e nunca o relógio de quem abre a tela. */
  const coletadoEm = useMemo(() => {
    const carimbos = relatorio?.snapshot.fontes
      ?.map((fonte) => fonte.coletadoEm)
      .filter((valor): valor is string => typeof valor === 'string' && Number.isFinite(Date.parse(valor)))
      ?? [];
    if (carimbos.length === 0) return null;
    return carimbos.reduce((maisRecente, atual) =>
      Date.parse(atual) > Date.parse(maisRecente) ? atual : maisRecente);
  }, [relatorio]);
  const documento = relatorio ? (
    <RelatorioMontado
      snapshot={snapshotDaRevisao ?? relatorio.snapshot}
      proposta="B"
      competencias={[{
        competencia: relatorio.competencia,
        rotulo: formatarCompetencia(relatorio.competencia),
        publicada: relatorio.estado === 'liberado' || relatorio.estado === 'enviado',
      }]}
      introducaoDaRevisao={aoAnalisarIntroducao && relatorio.podeDecidir ? <>
        <AnaliseIntroducao
          original={introducaoOriginal}
          podeRevisar={relatorio.podeDecidir === true}
          coletadoEm={coletadoEm}
          aoAcionar={aoAnalisarIntroducao}
          aoMudarTexto={setIntroducaoRevisada}
        />
        {/* A introdução é seção obrigatória como qualquer bloco, e por isso
            também precisa da saída "revisada sem análise". A caneta dela tem
            endpoint próprio; a dispensa é a mesma das seções. */}
        <DispensaDaSecao secao="introducao" titulo="Introdução" />
        <HistoricoDaSecao secao="introducao" titulo="Introdução" />
      </> : undefined}
      analiseDaSecao={aoAnalisarSecoes && relatorio.podeDecidir ? renderizarAnaliseDaSecao : undefined}
    />
  ) : null;
  const seletorDeModelo = relatorio?.podeDecidir && modoAnalise && aoMudarModoAnalise ? (
    <section className="dcp-modo-analise" aria-label="Modelo da análise assistida">
      <label htmlFor="dcp-modo-analise">Modelo de IA</label>
      <select id="dcp-modo-analise" value={modoAnalise} onChange={(evento) => aoMudarModoAnalise(evento.target.value as ModoAnaliseUI)}>
        {OPCOES_MODO_ANALISE.map((opcao) => <option key={opcao.valor} value={opcao.valor}>{opcao.rotulo}</option>)}
      </select>
      <p>Usado nas próximas sugestões de revisão.</p>
    </section>
  ) : null;
  return <RevisaoMoldura
    relatorio={relatorio}
    quem={quem}
    aoDecidir={aoDecidir}
    aoCarregarEnvio={aoCarregarEnvio}
    aoSolicitarEnvio={aoSolicitarEnvio}
    aoCarregarRetencao={aoCarregarRetencao}
    aoDescartarRetencao={aoDescartarRetencao}
    aoRegistrarObservacao={aoRegistrarObservacao}
    historicoAnalises={historicoAnalises}
  ><>{seletorDeModelo}{relatorio && aoAnalisarSecoes && relatorio.podeDecidir ? (
    <AnalisesSecaoProvider podeRevisar espacos={espacosAnaliticos} coletadoEm={coletadoEm} historico={historicoAnalises} aoAcionar={aoAnalisarSecoes}>
      {documento}
    </AnalisesSecaoProvider>
  ) : documento}</></RevisaoMoldura>;
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
  const [tentativaHistorico, setTentativaHistorico] = useState(0);
  const [historicoAnalises, setHistoricoAnalises] = useState<HistoricoEditorialInterno | null>(null);
  /* A prontidão editorial que o SERVIDOR calculou por último.
     Ela vive fora de `relatorio` de propósito. Trocar o objeto `relatorio`
     mudaria a identidade de `analisarSecoes`/`analisarIntroducao`, e os dois
     efeitos de carga (`AnalisesSecaoProvider` e `AnaliseIntroducao`) dependem
     dessas funções: cada revalidação recarregaria as análises do servidor e
     apagaria o rascunho do "Contexto do mês". Aqui só a prontidão anda. */
  const [prontidaoEditorial, setProntidaoEditorial] = useState<ResumoEditorialRA4 | null>(null);
  const [modoAnalise, setModoAnalise] = useState<ModoAnaliseUI>('automatico');
  const linkDeVolta = useLinkDeVoltaParaFila();
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
      setProntidaoEditorial(null);
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

  useEffect(() => {
    const sessaoAtual = sessaoAtualRef.current;
    if (!usuarioId || !sessaoAtual) return;
    const controle = new AbortController();
    setHistoricoAnalises(null);
    void fetch(`/api/painel-historico-analises?id=${encodeURIComponent(relatorioId)}`, {
      headers: { Authorization: `Bearer ${sessaoAtual.access_token}` },
      signal: controle.signal,
    }).then(async (resposta) => {
      const corpo = await resposta.json().catch(() => null);
      if (controle.signal.aborted) return;
      if (!resposta.ok || corpo?.historico?.disponivel !== true) {
        setHistoricoAnalises({
          disponivel: false,
          total: 0,
          revisoes: [],
          mensagem: String(corpo?.mensagem ?? 'O histórico das análises não pôde ser carregado agora.'),
        });
        return;
      }
      setHistoricoAnalises(corpo.historico as HistoricoEditorialInterno);
    }).catch((falha) => {
      if ((falha as Error)?.name === 'AbortError' || controle.signal.aborted) return;
      setHistoricoAnalises({
        disponivel: false,
        total: 0,
        revisoes: [],
        mensagem: 'O histórico das análises não pôde ser carregado agora.',
      });
    });
    return () => controle.abort();
  }, [relatorioId, tentativaHistorico, usuarioId]);

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
        body: JSON.stringify(corpoDaDecisao(pedido, relatorio.id, relatorio.checksum)),
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

  /**
   * Relê do servidor **só a prontidão editorial** do documento que está na tela.
   *
   * Toda ação editorial pode mudar o 8/8 que libera o botão "Aprovar
   * relatório", e quem calcula esse número é o servidor
   * (`conferirEstadoEditorial`, em `api/painel-relatorio.ts`). Sem esta
   * segunda leitura, a tela resolvia a última pendência, o banco passava a
   * considerar o relatório pronto e o botão continuava desabilitado até um
   * F5 — que foi exatamente o defeito relatado no Dr. Flávio Zenun/2026-08.
   *
   * Três recusas, todas para o mesmo lado:
   *
   *  • **falha de rede ou HTTP** não mexe em nada. O estado anterior veio do
   *    servidor e continua valendo; nada é inferido aqui.
   *  • **resposta sem `revisaoEditorial`** também não mexe em nada, pelo mesmo
   *    motivo.
   *  • **documento diferente** — id ou checksum divergentes — é descartado.
   *    Uma coleta nova pode ter trocado o documento corrente embaixo da tela,
   *    e a prontidão dele fala de fatos que esta tela não mostrou. Adotá-la
   *    poderia liberar a aprovação de um documento que ninguém leu.
   *
   * A tela nunca deriva `podeAprovar` por conta própria: ela só transporta o
   * que o servidor respondeu, e o portão real continua sendo `painel-decisao`.
   */
  const revalidarProntidao = useCallback(async (): Promise<void> => {
    const sessaoAtual = sessaoAtualRef.current;
    const relatorioAtual = relatorio;
    if (!sessaoAtual || !relatorioAtual?.id) return;
    try {
      const resposta = await fetch(`/api/painel-relatorio?id=${encodeURIComponent(relatorioAtual.id)}`, {
        headers: { Authorization: `Bearer ${sessaoAtual.access_token}` },
      });
      if (!resposta.ok) return;
      const corpo = await resposta.json().catch(() => null);
      const lido = corpo?.relatorio;
      if (!lido?.revisaoEditorial) return;
      if (lido.id !== relatorioAtual.id || lido.checksum !== relatorioAtual.checksum) return;
      setProntidaoEditorial(lido.revisaoEditorial as ResumoEditorialRA4);
    } catch {
      /* Silêncio proposital: a ação editorial já foi gravada e confirmada pelo
         servidor. Falhar aqui não pode transformar um sucesso em erro na cara
         de quem revisa — e não muda a prontidão para lado nenhum. */
    }
  }, [relatorio, usuarioId]);

  const registrarObservacao = useCallback(async (secao: string, texto: string): Promise<ResultadoDaDecisao> => {
    const sessaoAtual = sessaoAtualRef.current;
    if (!sessaoAtual || !relatorio?.id || !relatorio.checksum) return { ok: false, mensagem: 'A sessão expirou nesta aba. Nada foi gravado.' };
    try {
      const resposta = await fetch('/api/painel-analises-secao', {
        method: 'POST',
        headers: { Authorization: `Bearer ${sessaoAtual.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: relatorio.id, checksum: relatorio.checksum, acao: 'registrar_observacao_publica', secao, texto }),
      });
      const corpo = await resposta.json().catch(() => null);
      if (!resposta.ok || corpo?.observacaoPublica?.secao !== secao) return { ok: false, mensagem: String(corpo?.mensagem ?? 'A observação não foi confirmada. Nada foi exibido publicamente.') };
      return { ok: true, mensagem: 'Observação pública registrada nesta versão. Ela continua invisível até a aprovação e o fechamento AV4.' };
    } catch {
      return { ok: false, mensagem: 'Não foi possível registrar a observação agora. Nada foi confirmado.' };
    }
  }, [relatorio, usuarioId]);

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

  const carregarRetencao = useCallback(async (): Promise<ResultadoRetencaoEditorial> => {
    const sessaoAtual = sessaoAtualRef.current;
    const relatorioAtual = relatorio;
    if (!sessaoAtual || !relatorioAtual?.id) {
      return { ok: false, mensagem: 'A sessão expirou nesta aba. Entre novamente e reabra a revisão.' };
    }
    try {
      const resposta = await fetch(
        `/api/painel-historico-analises?modo=retencao&id=${encodeURIComponent(relatorioAtual.id)}`,
        { headers: { Authorization: `Bearer ${sessaoAtual.access_token}` } },
      );
      const corpo = await resposta.json().catch(() => null);
      if (!resposta.ok || !corpo?.retencao) {
        return { ok: false, mensagem: String(corpo?.mensagem ?? 'Não foi possível consultar a retenção editorial.') };
      }
      return { ok: true, estado: corpo.retencao as EstadoRetencaoEditorial };
    } catch {
      return { ok: false, mensagem: 'Não foi possível consultar a retenção editorial agora.' };
    }
  }, [relatorio, usuarioId]);

  const descartarRetencao = useCallback(async (confirmacao: string): Promise<ResultadoRetencaoEditorial> => {
    const sessaoAtual = sessaoAtualRef.current;
    const relatorioAtual = relatorio;
    if (!sessaoAtual || !relatorioAtual?.id) {
      return { ok: false, mensagem: 'A sessão expirou nesta aba. Entre novamente e reabra a revisão.' };
    }
    try {
      const resposta = await fetch('/api/painel-historico-analises', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${sessaoAtual.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: relatorioAtual.id, acao: 'descartar_historico', confirmacao }),
      });
      const corpo = await resposta.json().catch(() => null);
      if (!resposta.ok || !corpo?.retencao) {
        return { ok: false, mensagem: String(corpo?.mensagem ?? 'O histórico permanece arquivado.') };
      }
      setTentativaHistorico((valor) => valor + 1);
      return { ok: true, estado: corpo.retencao as EstadoRetencaoEditorial };
    } catch {
      return { ok: false, mensagem: 'Não foi possível confirmar o descarte. O histórico permanece arquivado até leitura de volta.' };
    }
  }, [relatorio, usuarioId]);

  const analisarIntroducao = useCallback(async (
    acao: AcaoDaIntroducao,
    sugestao?: SugestaoDaIntroducao,
    texto?: string,
  ): Promise<SugestaoDaIntroducao | null> => {
    const sessaoAtual = sessaoAtualRef.current;
    const relatorioAtual = relatorio;
    if (!sessaoAtual || !relatorioAtual?.id || !relatorioAtual.checksum) throw new Error('A sessão expirou. Reabra a revisão — nada foi alterado.');
    const url = `/api/painel-analise-introducao?id=${encodeURIComponent(relatorioAtual.id)}&checksum=${encodeURIComponent(relatorioAtual.checksum)}`;
    const resposta = acao === 'carregar'
      ? await fetch(url, { headers: { Authorization: `Bearer ${sessaoAtual.access_token}` } })
      : await fetch('/api/painel-analise-introducao', { method: 'POST', headers: { Authorization: `Bearer ${sessaoAtual.access_token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ id: relatorioAtual.id, checksum: relatorioAtual.checksum, acao, sugestaoId: sugestao?.id, ...(acao === 'gerar' ? { modo: modoAnalise } : {}), ...(acao === 'editar' ? { texto } : {}) }) });
    const corpo = await resposta.json().catch(() => null);
    if (!resposta.ok) throw new Error(String(corpo?.mensagem ?? 'A análise está indisponível agora.'));
    if (acao === 'aplicar' || acao === 'editar') setTentativaHistorico((valor) => valor + 1);
    /* `desfazer` entra aqui junto com `aplicar`/`editar`: ele TIRA a prontidão
       da introdução, e não revalidar deixaria o botão habilitado por um estado
       que o servidor já não confirma mais. */
    if (acao !== 'carregar') await revalidarProntidao();
    return corpo?.sugestao ?? null;
  }, [modoAnalise, relatorio, revalidarProntidao, usuarioId]);

  const analisarSecoes = useCallback(async (
    acao: AcaoAnalisesUI,
    dados?: { secao?: string; sugestao?: SugestaoSecao; texto?: string; contexto?: string },
  ): Promise<ResultadoAnalisesUI> => {
    const sessaoAtual = sessaoAtualRef.current;
    const relatorioAtual = relatorio;
    if (!sessaoAtual || !relatorioAtual?.id || !relatorioAtual.checksum) throw new Error('A sessão expirou. Reabra a revisão — nada foi alterado.');
    const url = `/api/painel-analises-secao?id=${encodeURIComponent(relatorioAtual.id)}&checksum=${encodeURIComponent(relatorioAtual.checksum)}`;
    const resposta = acao === 'carregar'
      ? await fetch(url, { headers: { Authorization: `Bearer ${sessaoAtual.access_token}` } })
      : await fetch('/api/painel-analises-secao', {
          method: 'POST',
          headers: { Authorization: `Bearer ${sessaoAtual.access_token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: relatorioAtual.id,
            checksum: relatorioAtual.checksum,
            acao,
            secao: dados?.secao,
            sugestaoId: dados?.sugestao?.id,
            texto: dados?.texto,
            contexto: dados?.contexto,
            ...((acao === 'gerar_todas' || acao === 'gerar_secao') ? { modo: modoAnalise } : {}),
          }),
        });
    const corpo = await resposta.json().catch(() => null);
    if (!resposta.ok) throw new Error(String(corpo?.mensagem ?? 'As análises estão indisponíveis agora.'));
    if (acao === 'aplicar' || acao === 'editar' || acao === 'dispensar') {
      setTentativaHistorico((valor) => valor + 1);
    }
    /* Vale para toda ação que mexe no estado editorial de uma seção, nos dois
       sentidos — inclusive `desfazer`, `reverter_dispensa` e as gerações, que
       podem devolver a seção para "sugerida" e derrubar a prontidão de volta.
       `salvar_contexto` não decide seção nenhuma e fica de fora. */
    if (acao !== 'carregar' && acao !== 'salvar_contexto') await revalidarProntidao();
    return corpo ?? {};
  }, [modoAnalise, relatorio, revalidarProntidao, usuarioId]);

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
          <Link className="dcp-botao dcp-botao--discreto" to={linkDeVolta}>
            Voltar para a fila
          </Link>
        </div>
      </section>
    );
  }

  return (
    <RevisaoApresentada
      relatorio={prontidaoEditorial ? { ...relatorio, revisaoEditorial: prontidaoEditorial } : relatorio}
      quem={sessao?.user?.email ?? undefined}
      aoDecidir={decidir}
      aoCarregarEnvio={carregarEnvio}
      aoSolicitarEnvio={solicitarEnvio}
      aoCarregarRetencao={carregarRetencao}
      aoDescartarRetencao={descartarRetencao}
      aoRegistrarObservacao={registrarObservacao}
      aoAnalisarIntroducao={analisarIntroducao}
      aoAnalisarSecoes={analisarSecoes}
      modoAnalise={modoAnalise}
      aoMudarModoAnalise={setModoAnalise}
      historicoAnalises={historicoAnalises}
    />
  );
}
