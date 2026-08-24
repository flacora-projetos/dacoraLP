import { useEffect, useMemo, useRef, useState } from 'react';
import {
  RASCUNHO_INICIAL,
  CATALOGO_PADRAO,
  type Catalogo,
  avisoDeVolume,
  impedimentos,
  naturezaDosCamposEscolhidos,
  filtrarCampos,
  aplicarPreset,
  type Granularidade,
  type NivelEntidade,
  type Rascunho,
} from './data-hub-catalogo';

/*
 * Componentes de apresentação do Data Hub, separados da página para poderem ser
 * renderizados em teste sem carregar CSS nem contexto de sessão. A página
 * continua sendo a dona do provedor de autenticação e do diagnóstico de canal.
 */

/*
 * A lista é preenchida pelo Data Hub e o criador envia a configuração ao BFF.
 */
export type ExtracaoLocal = { id: string; nome: string; resumo: string; revision?: number; definition?: Record<string, unknown> };

export type EstadoExecucao =
  | { tipo: 'inicial' }
  | { tipo: 'executando' }
  | { tipo: 'aceito' }
  | { tipo: 'erro'; mensagem: string };

export type DestinoGoogleSheets = {
  provider: 'google_sheets';
  spreadsheetId: string;
  spreadsheetName: string;
  sheetId: number;
  sheetTitle: string;
  startCell: 'A1';
  writeMode: 'append' | 'replace';
};

const ETAPAS = ['Origem', 'Campos', 'Período', 'Destino', 'Revisão'] as const;

export function ListaDeExtracoes({ extracoes, aoCriar, aoEditar = () => {}, googlePronto = false, execucoes = {}, aoExecutar = async () => {} }: {
  extracoes: readonly ExtracaoLocal[];
  aoCriar: () => void;
  aoEditar?: (extracao: ExtracaoLocal) => void;
  googlePronto?: boolean;
  execucoes?: Readonly<Record<string, EstadoExecucao>>;
  aoExecutar?: (extracao: ExtracaoLocal) => void | Promise<void>;
}) {
  const tituloRef = useRef<HTMLHeadingElement | null>(null);
  const cliquesEmVoo = useRef(new Set<string>());

  async function executarUmaVez(extracao: ExtracaoLocal) {
    if (cliquesEmVoo.current.has(extracao.id)) return;
    cliquesEmVoo.current.add(extracao.id);
    try { await aoExecutar(extracao); } finally { cliquesEmVoo.current.delete(extracao.id); }
  }

  /*
   * A lista e o criador se alternam por desmontagem: quando o criador some e a
   * lista volta a montar, o foco do navegador cairia no <body> se ninguém o
   * movesse. Mesmo padrão de foco explícito usado nos diálogos do painel
   * (ex.: DialogoDeEnvio, DialogoDescarte): foca o título assim que a vista aparece.
   */
  useEffect(() => {
    tituloRef.current?.focus();
  }, []);

  return (
    <section className="dch-lista" aria-labelledby="lista-titulo">
      <div className="dch-lista__topo">
        <div>
          <p className="dcp-eyebrow">Suas extrações</p>
          <h1 id="lista-titulo" ref={tituloRef} tabIndex={-1}>Dados de marketing, sob controle.</h1>
        </div>
        <button type="button" className="dcp-botao dcp-botao--primario" onClick={aoCriar}>Criar extração</button>
      </div>

      {/* O status precisa estar sempre montado: leitores de tela vigiam containers já
       * presentes na página e podem ignorar um nó "role=status" que nasce junto com
       * o texto. Container vazio não ocupa espaço (ver .dch-aviso-local:empty).
       */}
      <div className="dch-aviso-local" role="status">
        {extracoes.length > 0 ? (
          <p>
            Extrações salvas permanecem disponíveis neste Data Hub.
          </p>
        ) : null}
      </div>

      {extracoes.length === 0 ? (
        /*
         * Estado vazio explica a causa. Uma tabela sem linhas faz o usuário
         * procurar defeito onde não há — mesma regra já aplicada na fila de relatórios.
         */
        <div className="dcp-secao">
          <h2 className="dcp-secao__titulo">Nenhuma extração ainda</h2>
          <p className="dcp-secao__apoio">
            Você ainda não montou nenhuma consulta. Comece por “Criar extração”: escolha a conta, os campos, o período
            e revise antes de concluir.
          </p>
        </div>
      ) : (
        <ul className="dch-cartoes">
          {extracoes.map((extracao) => {
            const destination = extracao.definition?.destination as DestinoGoogleSheets | undefined;
            const destinoConfirmado = destination?.provider === 'google_sheets' && destination.writeMode === 'replace'
              && typeof destination.spreadsheetId === 'string' && destination.spreadsheetId.length > 0
              && Number.isInteger(destination.sheetId) && typeof destination.sheetTitle === 'string'
              && destination.sheetTitle.length > 0 && destination.startCell === 'A1';
            const append = destination?.provider === 'google_sheets' && destination.writeMode === 'append';
            const execucao = execucoes[extracao.id] ?? { tipo: 'inicial' as const };
            const executando = execucao.tipo === 'executando';
            const aceita = execucao.tipo === 'aceito';
            return <li key={extracao.id} className="dcp-secao dch-cartao">
              <h2 className="dcp-secao__titulo">{extracao.nome}</h2>
              <p className="dcp-secao__apoio">{extracao.resumo}</p>
              <div className="dch-cartao__acoes">
                <button type="button" className="dcp-botao dcp-botao--discreto" onClick={() => aoEditar(extracao)}>
                  {destinoConfirmado ? 'Editar' : 'Completar configuração'}
                </button>
                <button type="button" className="dcp-botao dcp-botao--primario"
                  disabled={!googlePronto || !destinoConfirmado || executando || aceita}
                  aria-describedby={`execucao-ajuda-${extracao.id} execucao-status-${extracao.id}`}
                  onClick={() => void executarUmaVez(extracao)}>
                  {executando ? 'Executando…' : aceita ? 'Execução aceita' : 'Executar agora'}
                </button>
                <p id={`execucao-ajuda-${extracao.id}`} className="dcp-secao__apoio">
                  {append ? 'O modo acrescentar ainda não está disponível para execução automática.'
                    : !destinoConfirmado ? 'Confirme uma planilha no modo substituir antes de executar.'
                      : !googlePronto ? 'Conecte sua conta Google para executar esta extração.' : null}
                </p>
                <div id={`execucao-status-${extracao.id}`} className="dch-status" aria-live="polite">
                  {execucao.tipo === 'executando' ? 'Preparando a atualização da planilha…'
                    : execucao.tipo === 'aceito' ? 'Execução aceita. A planilha será atualizada em segundo plano.'
                      : execucao.tipo === 'erro' ? <span className="dch-status--erro" role="alert">{execucao.mensagem}</span> : null}
                </div>
              </div>
            </li>;
          })}
        </ul>
      )}
    </section>
  );
}

export function CriadorDeExtracao({
  aoCancelar,
  aoConcluir,
  rascunhoInicial,
  destinoInicial = null,
  definicaoInicial,
  avisoCamposLegados = null,
  modo = 'criar',
  catalogo = CATALOGO_PADRAO,
  aoCriarPlanilha = async () => { throw new Error('Criação de planilha indisponível.'); },
  aoResolverPlanilha = async () => { throw new Error('Seleção de planilha indisponível.'); },
  aoEscolherNoDrive = async () => { throw new Error('Google Drive indisponível.'); },
}: {
  aoCancelar: () => void;
  aoConcluir: (extracao: ExtracaoLocal) => void | Promise<void>;
  /**
   * Só existe para o script de casca poder renderizar o formulário já com uma
   * combinação válida: renderToStaticMarkup não simula eventos, então não há
   * outro jeito de chegar a esse estado sem esta costura de teste. A página em
   * produção (DataHub.tsx) nunca passa este prop — o criador sempre abre em
   * RASCUNHO_INICIAL.
   */
  rascunhoInicial?: Rascunho;
  destinoInicial?: DestinoGoogleSheets | null;
  definicaoInicial?: Record<string, unknown>;
  avisoCamposLegados?: string | null;
  modo?: 'criar' | 'editar';
  catalogo?: Catalogo;
  aoCriarPlanilha?: (title: string) => Promise<DestinoGoogleSheets>;
  aoResolverPlanilha?: (valor: string) => Promise<DestinoGoogleSheets>;
  aoEscolherNoDrive?: () => Promise<DestinoGoogleSheets | null>;
}) {
  const [salvando, setSalvando] = useState(false);
  const [etapa, setEtapa] = useState(0);
  const [rascunho, setRascunho] = useState<Rascunho>(rascunhoInicial ?? RASCUNHO_INICIAL);
  const [destino, setDestino] = useState<DestinoGoogleSheets | null>(destinoInicial);
  const [buscaCampos, setBuscaCampos] = useState('');
  const [periodoAlterado, setPeriodoAlterado] = useState(false);
  const [tituloPlanilha, setTituloPlanilha] = useState('Extração Dácora Data Hub');
  const [referenciaPlanilha, setReferenciaPlanilha] = useState('');
  const [destinoOcupado, setDestinoOcupado] = useState<'criar' | 'resolver' | 'drive' | null>(null);
  const [erroDestino, setErroDestino] = useState<string | null>(null);

  const problemas = useMemo(() => impedimentos(rascunho, catalogo), [rascunho, catalogo]);
  const aviso = useMemo(() => avisoDeVolume(rascunho, catalogo), [rascunho, catalogo]);
  const naturezas = useMemo(() => naturezaDosCamposEscolhidos(rascunho, catalogo), [rascunho, catalogo]);
  const conta = catalogo.contas.find((item) => item.id === rascunho.contaId);
  const periodo = catalogo.periodos.find((item) => item.id === rascunho.periodoId);
  const breakdown = catalogo.breakdowns.find((item) => item.id === rascunho.breakdownId);
  const nivel = catalogo.niveis.find((item) => item.id === rascunho.nivel);
  const granularidade = catalogo.granularidades.find((item) => item.id === rascunho.granularidade);
  const naoAditivos = naturezas.filter((campo) => campo.natureza !== 'aditiva');

  const impedimentoConta = problemas.find((problema) => problema.campo === 'conta');
  const impedimentoTemplate = problemas.find((problema) => problema.campo === 'template');
  const impedimentoCampos = problemas.find((problema) => problema.campo === 'campos');
  const impedimentoBreakdown = problemas.find((problema) => problema.campo === 'breakdown');
  const impedimentoGranularidade = problemas.find((problema) => problema.campo === 'granularidade');
  const impedimentoCriativos = problemas.find((problema) => problema.campo === 'criativos');

  const tituloRef = useRef<HTMLHeadingElement | null>(null);
  const tituloEtapaRef = useRef<HTMLHeadingElement | null>(null);
  const montouRef = useRef(false);

  /* Mesmo padrão do título da lista: a vista que acabou de aparecer recebe o foco. */
  useEffect(() => {
    tituloRef.current?.focus();
  }, []);

  /*
   * Trocar de etapa (esteira ou Voltar/Avançar) substitui todo o conteúdo do
   * formulário sem navegar de página nem trocar o foco sozinho. Sem isto, quem
   * usa teclado ou leitor de tela não percebe a mudança. A primeira execução
   * (montagem) é ignorada de propósito: o foco de abertura do criador já vai
   * para o <h1> acima, e focar o <h2> da etapa também roubaria esse foco.
   */
  useEffect(() => {
    if (!montouRef.current) {
      montouRef.current = true;
      return;
    }
    tituloEtapaRef.current?.focus();
  }, [etapa]);

  function alternarCampo(id: string) {
    setRascunho((atual) => ({
      ...atual,
      campos: atual.campos.includes(id) ? atual.campos.filter((campo) => campo !== id) : [...atual.campos, id],
    }));
  }

  function alternarCriativo(id: string) {
    setRascunho((atual) => {
      const removendo = atual.creativeFields.includes(id);
      return { ...atual, templateId: removendo ? atual.templateId : 'meta_creative_performance', creativeFields: removendo
        ? atual.creativeFields.filter((campo) => campo !== id) : [...atual.creativeFields, id] };
    });
  }

  const metricasVisiveis = filtrarCampos(catalogo.campos, buscaCampos);
  const criativosVisiveis = filtrarCampos(catalogo.creativeFields ?? [], buscaCampos);
  const camposSelecionados = catalogo.campos.filter((campo) => rascunho.campos.includes(campo.id));
  const criativosSelecionados = (catalogo.creativeFields ?? []).filter((campo) => rascunho.creativeFields.includes(campo.id));
  const dimensoesSistema = ['Data', ...(rascunho.nivel === 'conta' ? ['Conta'] : rascunho.nivel === 'campanha'
    ? ['Campanha'] : rascunho.nivel === 'conjunto' ? ['Campanha', 'Conjunto'] : ['Campanha', 'Conjunto', 'Anúncio'])];
  const templateEfetivo = rascunho.creativeFields.length > 0 ? 'meta_creative_performance' : rascunho.templateId || catalogo.templates.find((item) => item.niveisCompativeis.includes(rascunho.nivel)
    && (rascunho.breakdownId === 'nenhum' || item.breakdownsCompativeis.includes(rascunho.breakdownId)))?.id || '';

  async function definirDestino(acao: 'criar' | 'resolver' | 'drive') {
    if (destinoOcupado) return;
    setDestinoOcupado(acao);
    setErroDestino(null);
    if (modo === 'criar') setDestino(null);
    try {
      const escolhido = acao === 'criar'
        ? await aoCriarPlanilha(tituloPlanilha.trim())
        : acao === 'resolver'
          ? await aoResolverPlanilha(referenciaPlanilha.trim())
          : await aoEscolherNoDrive();
      if (escolhido) setDestino(escolhido);
    } catch (error) {
      setErroDestino(error instanceof Error ? error.message : 'Não foi possível confirmar a planilha.');
    } finally {
      setDestinoOcupado(null);
    }
  }

  return (
    <section className="dch-criador" aria-labelledby="criador-titulo">
      <div className="dch-criador__cabecalho">
        <div>
          <p className="dcp-eyebrow">Nova extração</p>
          <h1 id="criador-titulo" ref={tituloRef} tabIndex={-1}>Monte sua consulta.</h1>
        </div>
        <button type="button" className="dcp-botao dcp-botao--discreto" onClick={aoCancelar}>Cancelar</button>
      </div>

      <div className="dch-criador__grade">
        <ol className="dch-esteira" aria-label="Etapas da criação">
          {ETAPAS.map((nome, indice) => (
            <li key={nome}>
              <button
                type="button"
                className={`dch-esteira__item${indice === etapa ? ' dch-esteira__item--ativa' : ''}`}
                aria-current={indice === etapa ? 'step' : undefined}
                onClick={() => setEtapa(indice)}
              >
                <span className="dch-esteira__numero">{String(indice + 1).padStart(2, '0')}</span>
                <span>{nome}</span>
              </button>
            </li>
          ))}
        </ol>

        <div className="dch-formulario">
          {etapa === 0 ? (
            <>
              <h2 ref={tituloEtapaRef} tabIndex={-1}>Origem dos dados</h2>
              <p className="dch-formulario__apoio">
                Contas e capacidades fornecidas pelo Data Hub.
              </p>
              <label className="dch-campo" htmlFor="conta">
                <span>Conta</span>
                <select
                  id="conta"
                  aria-invalid={impedimentoConta ? 'true' : undefined}
                  aria-describedby={impedimentoConta ? 'dch-impedimento-conta' : undefined}
                  value={rascunho.contaId}
                  onChange={(evento) => setRascunho((atual) => ({ ...atual, contaId: evento.target.value }))}
                >
                  <option value="">Escolha uma conta</option>
                  {catalogo.contas.map((item) => (
                    <option key={item.id} value={item.id} disabled={item.disponivel !== true}>{item.nome}{item.disponivel !== true ? ' — indisponível' : ''}</option>
                  ))}
                </select>
              </label>
              <label className="dch-campo" htmlFor="template">
                <span>Preset opcional</span>
                <select
                  id="template"
                  aria-invalid={impedimentoTemplate ? 'true' : undefined}
                  aria-describedby={impedimentoTemplate ? 'dch-impedimento-template' : undefined}
                  value={rascunho.templateId}
                  onChange={(evento) => setRascunho((atual) => aplicarPreset(atual, evento.target.value, catalogo))}
                >
                  <option value="">Montar seleção manualmente</option>
                  {catalogo.templates.map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}
                </select>
              </label>
              <label className="dch-campo" htmlFor="nivel">
                <span>Nível</span>
                <select
                  id="nivel"
                  value={rascunho.nivel}
                  onChange={(evento) => setRascunho((atual) => ({ ...atual, nivel: evento.target.value as NivelEntidade }))}
                >
                  {catalogo.niveis.map((item) => (
                    <option key={item.id} value={item.id}>{item.nome}</option>
                  ))}
                </select>
              </label>
            </>
          ) : null}

          {etapa === 1 ? (
            <>
              <h2 ref={tituloEtapaRef} tabIndex={-1}>Dimensões e métricas</h2>
              <p className="dch-formulario__apoio">Escolha o detalhe das linhas e os valores que entrarão na planilha.</p>
              <label className="dch-campo" htmlFor="busca-campos"><span>Buscar campos</span>
                <input id="busca-campos" type="search" value={buscaCampos} onChange={(evento) => setBuscaCampos(evento.target.value)}
                  placeholder="Busque por nome ou descrição" />
              </label>
              <div className="dch-seletor-campos">
                <div className="dch-seletor-campos__lista" role="group" aria-label="Campos disponíveis">
                  <h3>Dimensões do sistema</h3>
                  {dimensoesSistema.map((dimensao) => <p key={dimensao} className="dch-campo-info"><strong>{dimensao}</strong>
                    <span>{dimensao === 'Data' ? `Intervalo ${granularidade?.nome?.toLowerCase() ?? 'temporal'} de cada linha.` : 'Identidade publicada pelo nível escolhido.'}</span></p>)}
                  <h3>Métricas</h3>
                  <div className="dch-seletor-campos__rolagem" aria-invalid={impedimentoCampos ? 'true' : undefined}
                    aria-describedby={impedimentoCampos ? 'dch-impedimento-campos' : undefined}>
                    {metricasVisiveis.map((campo) => <label key={campo.id} className="dch-opcao dch-opcao--detalhada">
                      <input type="checkbox" checked={rascunho.campos.includes(campo.id)} onChange={() => alternarCampo(campo.id)} />
                      <span><strong>{campo.nome}</strong>{campo.descricao ? <small>{campo.descricao}</small> : null}
                        {campo.exemplo ? <small>Exemplo: {campo.exemplo}</small> : null}</span>
                    </label>)}
                    {metricasVisiveis.length === 0 ? <p>Nenhuma métrica encontrada.</p> : null}
                  </div>
                  {(catalogo.creativeFields ?? []).length > 0 ? <><h3>Criativo</h3>
                    <div className="dch-seletor-campos__rolagem" aria-invalid={impedimentoCriativos ? 'true' : undefined}
                      aria-describedby={impedimentoCriativos ? 'dch-impedimento-criativos' : undefined}>{criativosVisiveis.map((campo) => <label key={campo.id} className="dch-opcao dch-opcao--detalhada">
                      <input type="checkbox" checked={rascunho.creativeFields.includes(campo.id)} onChange={() => alternarCriativo(campo.id)} />
                      <span><strong>{campo.nome}</strong>{campo.descricao ? <small>{campo.descricao}</small> : null}</span>
                    </label>)}</div></> : null}
                </div>
                <aside className="dch-seletor-campos__selecao" aria-label="Campos selecionados">
                  <h3>Sua seleção <span>{dimensoesSistema.length + (rascunho.breakdownId === 'nenhum' ? 0 : 1) + rascunho.campos.length + rascunho.creativeFields.length}</span></h3>
                  <button type="button" className="dcp-botao dcp-botao--discreto" disabled={rascunho.campos.length + rascunho.creativeFields.length === 0}
                    onClick={() => setRascunho((atual) => ({ ...atual, campos: [], creativeFields: [] }))}>Limpar opcionais</button>
                  <div className="dch-chips">{dimensoesSistema.map((dimensao) => <span key={dimensao} className="dch-chip dch-chip--fixo">{dimensao}</span>)}
                    {rascunho.breakdownId !== 'nenhum' ? <span className="dch-chip">{breakdown?.nome}</span> : null}
                    {camposSelecionados.map((campo) => <button key={campo.id} type="button" className="dch-chip" aria-label={`Remover ${campo.nome}`} onClick={() => alternarCampo(campo.id)}>{campo.nome} ×</button>)}
                    {criativosSelecionados.map((campo) => <button key={campo.id} type="button" className="dch-chip" aria-label={`Remover ${campo.nome}`} onClick={() => alternarCriativo(campo.id)}>{campo.nome} ×</button>)}
                  </div>
                </aside>
              </div>
              <label className="dch-campo" htmlFor="breakdown">
                <span>Breakdown</span>
                <select
                  id="breakdown"
                  aria-invalid={impedimentoBreakdown ? 'true' : undefined}
                  aria-describedby={impedimentoBreakdown ? 'dch-impedimento-breakdown' : undefined}
                  value={rascunho.breakdownId}
                  onChange={(evento) => setRascunho((atual) => ({ ...atual, breakdownId: evento.target.value }))}
                >
                  {catalogo.breakdowns.map((item) => (
                    <option key={item.id} value={item.id}>{item.nome}</option>
                  ))}
                </select>
              </label>
            </>
          ) : null}

          {etapa === 2 ? (
            <>
              <h2 ref={tituloEtapaRef} tabIndex={-1}>Período e granularidade</h2>
              <p className="dch-formulario__apoio">
                Período é o intervalo consultado. Granularidade é o tamanho de cada linha dentro dele. São controles
                independentes.
              </p>
              <label className="dch-campo" htmlFor="periodo">
                <span>Período</span>
                <select
                  id="periodo"
                  value={rascunho.periodoId}
                  onChange={(evento) => { setPeriodoAlterado(true); setRascunho((atual) => ({ ...atual, periodoId: evento.target.value })); }}
                >
                  {catalogo.periodos.map((item) => (
                    <option key={item.id} value={item.id}>{item.nome}</option>
                  ))}
                </select>
              </label>
              <label className="dch-campo" htmlFor="granularidade">
                <span>Granularidade</span>
                <select
                  id="granularidade"
                  aria-invalid={impedimentoGranularidade ? 'true' : undefined}
                  aria-describedby={impedimentoGranularidade ? 'dch-impedimento-granularidade' : undefined}
                  value={rascunho.granularidade}
                  onChange={(evento) => { setPeriodoAlterado(true); setRascunho((atual) => ({ ...atual, granularidade: evento.target.value as Granularidade })); }}
                >
                  {catalogo.granularidades.map((item) => (
                    <option key={item.id} value={item.id}>{item.nome}</option>
                  ))}
                </select>
              </label>
              {rascunho.granularidade === 'personalizada' ? (
                <label className="dch-campo" htmlFor="granularidade-dias">
                  <span>Dias por linha</span>
                  <input
                    id="granularidade-dias"
                    type="number"
                    min="1"
                    max="90"
                    step="1"
                    value={rascunho.granularidadeDias}
                    onChange={(evento) => { setPeriodoAlterado(true); setRascunho((atual) => ({ ...atual, granularidadeDias: Number(evento.target.value) })); }}
                  />
                </label>
              ) : null}
            </>
          ) : null}

          {etapa === 3 ? (
            <>
              <h2 ref={tituloEtapaRef} tabIndex={-1}>Destino no Google Sheets</h2>
              <p className="dch-formulario__apoio">Crie uma planilha nova, cole o link de uma existente ou escolha um arquivo no Google Drive.</p>

              <div className="dch-destino-opcoes">
                <div className="dch-destino-opcao">
                  <h3>Criar uma planilha</h3>
                  <label className="dch-campo" htmlFor="titulo-planilha"><span>Nome da planilha</span>
                    <input id="titulo-planilha" value={tituloPlanilha} onChange={(evento) => {
                      setTituloPlanilha(evento.target.value);
                      if (modo === 'criar') setDestino(null);
                      setErroDestino(null);
                    }} />
                  </label>
                  <button type="button" className="dcp-botao dcp-botao--primario" disabled={!tituloPlanilha.trim() || destinoOcupado !== null} onClick={() => void definirDestino('criar')}>
                    {destinoOcupado === 'criar' ? 'Criando…' : 'Criar e usar'}
                  </button>
                </div>

                <div className="dch-destino-opcao">
                  <h3>Usar uma planilha existente</h3>
                  <label className="dch-campo" htmlFor="referencia-planilha"><span>Link ou ID da planilha</span>
                    <input id="referencia-planilha" value={referenciaPlanilha} onChange={(evento) => {
                      setReferenciaPlanilha(evento.target.value);
                      if (modo === 'criar') setDestino(null);
                      setErroDestino(null);
                    }} placeholder="Cole o link do Google Sheets" />
                  </label>
                  <button type="button" className="dcp-botao dcp-botao--discreto" disabled={!referenciaPlanilha.trim() || destinoOcupado !== null} onClick={() => void definirDestino('resolver')}>
                    {destinoOcupado === 'resolver' ? 'Confirmando…' : 'Confirmar planilha'}
                  </button>
                </div>
              </div>

              <div className="dch-destino-drive">
                <p>Ou procure entre as planilhas que o Google permite ao Data Hub acessar.</p>
                <button type="button" className="dcp-botao dcp-botao--discreto" disabled={destinoOcupado !== null} onClick={() => void definirDestino('drive')}>
                  {destinoOcupado === 'drive' ? 'Abrindo Drive…' : 'Escolher no Google Drive'}
                </button>
              </div>

              <div className="dch-destino-estado" aria-live="polite">
                {erroDestino ? <p className="dcp-erro" role="alert">{erroDestino}</p> : null}
                {destino ? (
                  <div className="dch-destino-confirmado">
                    <span>Destino confirmado</span>
                    <strong>{destino.spreadsheetName}</strong>
                    <small>Aba: {destino.sheetTitle}</small>
                  </div>
                ) : <p>Nenhuma planilha confirmada.</p>}
              </div>
            </>
          ) : null}

          {etapa === 4 ? (
            <>
              <h2 ref={tituloEtapaRef} tabIndex={-1}>Revisão</h2>
              <dl className="dch-revisao">
                <div><dt>Conta</dt><dd>{conta?.nome ?? 'Não escolhida'}</dd></div>
                <div><dt>Nível</dt><dd>{nivel?.nome ?? '—'}</dd></div>
                <div><dt>Campos</dt><dd>{naturezas.length > 0 ? naturezas.map((campo) => campo.nome).join(', ') : 'Nenhum'}</dd></div>
                <div><dt>Breakdown</dt><dd>{breakdown?.nome ?? '—'}</dd></div>
                <div><dt>Período</dt><dd>{periodo?.nome ?? '—'}</dd></div>
                <div><dt>Granularidade</dt><dd>{granularidade?.nome ?? '—'}</dd></div>
                <div><dt>Planilha</dt><dd>{destino?.spreadsheetName ?? 'Não escolhida'}</dd></div>
                <div><dt>Aba</dt><dd>{destino?.sheetTitle ?? '—'}</dd></div>
              </dl>
              {naoAditivos.length > 0 ? (
                <p className="dcp-nota">
                  Estes campos não podem ser somados entre linhas: {naoAditivos.map((campo) => campo.nome).join(', ')}.
                  Investimento, impressões e cliques somam; alcance, frequência e métricas calculadas precisam ser
                  lidos por linha.
                </p>
              ) : null}
            </>
          ) : null}
        </div>

        <aside className="dch-resumo" aria-label="Resumo da extração">
          <h2 className="dch-resumo__titulo">Resumo</h2>
          <p className="dch-resumo__linha"><strong>Conta:</strong> {conta?.nome ?? 'não escolhida'}</p>
          <p className="dch-resumo__linha"><strong>Nível:</strong> {nivel?.nome ?? '—'}</p>
          <p className="dch-resumo__linha"><strong>Campos:</strong> {rascunho.campos.length}</p>
          <p className="dch-resumo__linha"><strong>Período:</strong> {periodo?.nome ?? '—'}</p>
          <p className="dch-resumo__linha"><strong>Granularidade:</strong> {granularidade?.nome ?? '—'}</p>
          <p className="dch-resumo__linha"><strong>Destino:</strong> {destino ? `${destino.spreadsheetName} · ${destino.sheetTitle}` : 'não escolhido'}</p>

          <div className="dch-resumo__estado" aria-live="polite">
            {problemas.length > 0 ? (
              <ul className="dch-impedimentos">
                {/*
                 * O id abaixo é o mesmo referenciado pelo aria-describedby do
                 * controle correspondente (ver campo "conta" etc. no formulário
                 * acima). É proposital: a mensagem mora só aqui, no resumo, e o
                 * campo aponta para ela em vez de repetir o texto perto do
                 * <select>. Duplicar o texto faria o leitor de tela lê-lo duas
                 * vezes (uma pelo describedby, outra pelo aria-live do resumo)
                 * toda vez que a validação mudasse.
                 */}
                {problemas.map((problema) => (
                  <li key={problema.campo} id={`dch-impedimento-${problema.campo}`} className="dcp-erro">
                    {problema.mensagem}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="dch-resumo__ok">{destino ? 'Combinação e destino válidos.' : 'Combinação válida. Falta escolher o destino.'}</p>
            )}
            {aviso ? <p className="dcp-nota">{aviso}</p> : null}
            {avisoCamposLegados ? <p className="dcp-nota" role="status">{avisoCamposLegados}</p> : null}
          </div>

          <div className="dch-resumo__acoes">
            <button
              type="button"
              className="dcp-botao dcp-botao--discreto"
              disabled={etapa === 0 || salvando}
              onClick={() => setEtapa((atual) => Math.max(0, atual - 1))}
            >
              Voltar
            </button>
            {etapa < ETAPAS.length - 1 ? (
              <button
                type="button"
                className="dcp-botao dcp-botao--primario"
                onClick={() => setEtapa((atual) => Math.min(ETAPAS.length - 1, atual + 1))}
              >
                Avançar
              </button>
            ) : (
              <button
                type="button"
                className="dcp-botao dcp-botao--primario"
                disabled={problemas.length > 0 || !destino || salvando}
                onClick={async () => {
                  if (salvando) return;
                  setSalvando(true);
                  try {
                    await aoConcluir({
                    id: `local-${Date.now()}`,
                    nome: `${conta?.nome ?? 'Conta'} — ${nivel?.nome ?? ''}`.trim(),
                    resumo: `${rascunho.campos.length} campos · ${periodo?.nome ?? ''} · ${granularidade?.nome ?? ''} · ${breakdown?.nome ?? ''}`,
                    definition: {
                      ...(definicaoInicial ?? {}),
                      schemaVersion: String(definicaoInicial?.schemaVersion ?? '1.0.0'), name: `${conta?.nome ?? 'Conta'} — ${nivel?.nome ?? ''}`.trim(), provider: 'meta_official',
                      sourceAccountId: rascunho.contaId, template: templateEfetivo,
                      entityLevel: rascunho.nivel === 'conta' ? 'account' : rascunho.nivel === 'campanha' ? 'campaign' : rascunho.nivel === 'conjunto' ? 'adset' : 'ad',
                      breakdowns: breakdown?.valores ?? [], fields: rascunho.campos,
                      ...(catalogo.creativeFields == null ? {} : { creativeFields: rascunho.creativeFields }),
                      periodContract: modo === 'editar' && !periodoAlterado && definicaoInicial?.periodContract
                        ? definicaoInicial.periodContract : { ...((definicaoInicial?.periodContract as Record<string, unknown> | undefined) ?? {}),
                          version: String((definicaoInicial?.periodContract as any)?.version ?? '1.0.0'),
                          executionFrequency: (definicaoInicial?.periodContract as any)?.executionFrequency ?? { unit: 'disabled' },
                          timezone: String((definicaoInicial?.periodContract as any)?.timezone ?? 'America/Sao_Paulo'),
                          runAtLocal: (definicaoInicial?.periodContract as any)?.runAtLocal ?? null,
                          dataPeriod: { type: 'relative', unit: 'day', value: periodo?.dias ?? 7, offset: 0 }, outputGranularity: rascunho.granularidade === 'diaria' ? 'day' : rascunho.granularidade === 'semanal' ? 'week' : rascunho.granularidade === 'mensal' ? 'month' : rascunho.granularidade === 'periodo-inteiro' ? 'all_days' : `custom_${rascunho.granularidadeDias}` },
                      destination: destino,
                    },
                    });
                  } finally {
                    setSalvando(false);
                  }
                }}
              >
                {salvando ? 'Salvando…' : modo === 'editar' ? 'Salvar alterações' : 'Salvar extração'}
              </button>
            )}
          </div>
          <p className="dch-resumo__nota">A configuração será salva no Data Hub ao concluir.</p>
        </aside>
      </div>
    </section>
  );
}
