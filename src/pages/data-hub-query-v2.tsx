import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { CampoQueryV2, Catalogo } from './data-hub-catalogo';
import {
  GRUPOS_CAMPO_V2,
  buscarEntradasCampoV2,
  construirEntradasCampoV2,
  grupoDoCampoV2,
  normalizarTermoCampoV2,
  type EntradaCampoV2,
  type GrupoCampoV2,
} from './data-hub-field-picker-v2';

type ResultadoV2 = {
  queryRunId: string;
  result: {
    columns: readonly string[];
    rows: readonly Record<string, unknown>[];
    resolvedGrain: string;
    sourceComplete: boolean;
    pagingComplete: boolean;
  };
};

export type ConsultaV2Payload = {
  accountId: string;
  selectedFields: readonly string[];
  dateStart: string;
  dateStop: string;
  granularity: 'day';
};

const RESULTADO_LIMITE = 16;
const SELECAO_POR_PAGINA = 8;
const PROJECAO_NOME: Readonly<Record<string, string>> = {
  count: 'Quantidade',
  value: 'Valor',
  cost: 'Custo',
};

function valorCelula(row: Record<string, unknown>, field: string) {
  if (!Object.hasOwn(row, field)) return <span title="Campo ausente na resposta">—</span>;
  const value = row[field];
  if (value === null) return <span title="Valor nulo retornado pela fonte">null</span>;
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function useTelaEstreita() {
  const [estreita, setEstreita] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const media = window.matchMedia('(max-width: 700px)');
    const atualizar = () => setEstreita(media.matches);
    atualizar();
    media.addEventListener?.('change', atualizar);
    return () => media.removeEventListener?.('change', atualizar);
  }, []);
  return estreita;
}

function estadoCampo(id: string, executaveis: ReadonlySet<string>) {
  return executaveis.has(id) ? 'Pronto' : 'Verificar nesta conta';
}

function opcaoDomId(listboxId: string, fieldId: string) {
  return `${listboxId}-${fieldId.replace(/[^a-zA-Z0-9_-]/gu, '-')}`;
}

function ResultadoCampo({
  campo,
  listboxId,
  ativo,
  selecionado,
  bloqueado,
  executaveis,
  aoAlternar,
  aoAtivar,
}: {
  campo: CampoQueryV2;
  listboxId: string;
  ativo: boolean;
  selecionado: boolean;
  bloqueado: boolean;
  executaveis: ReadonlySet<string>;
  aoAlternar: (id: string) => void;
  aoAtivar: (id: string) => void;
}) {
  return (
    <div
      id={opcaoDomId(listboxId, campo.id)}
      role="option"
      aria-selected={selecionado}
      aria-disabled={bloqueado || undefined}
      className={`dch-field-picker__option${ativo ? ' dch-field-picker__option--active' : ''}${selecionado ? ' dch-field-picker__option--selected' : ''}${bloqueado ? ' dch-field-picker__option--disabled' : ''}`}
      onMouseDown={(event) => event.preventDefault()}
      onMouseEnter={() => aoAtivar(campo.id)}
      onClick={() => { if (!bloqueado) { aoAtivar(campo.id); aoAlternar(campo.id); } }}
    >
      <span className="dch-field-picker__option-copy">
        <strong>{campo.nome}</strong>
        <code translate="no">{campo.id}</code>
      </span>
      <span className={`dch-field-picker__state${executaveis.has(campo.id) ? ' dch-field-picker__state--ready' : ''}`}>
        {estadoCampo(campo.id, executaveis)}
      </span>
    </div>
  );
}

function ResultadoEntrada({
  entrada,
  listboxId,
  activeFieldId,
  selectedFields,
  executaveis,
  bloqueado,
  aoAlternar,
  aoAtivar,
}: {
  entrada: EntradaCampoV2;
  listboxId: string;
  activeFieldId: string | null;
  selectedFields: readonly string[];
  executaveis: ReadonlySet<string>;
  bloqueado: (id: string) => boolean;
  aoAlternar: (id: string) => void;
  aoAtivar: (id: string) => void;
}) {
  if (entrada.tipo === 'field') {
    return <ResultadoCampo campo={entrada.campo} listboxId={listboxId} ativo={activeFieldId === entrada.campo.id}
      selecionado={selectedFields.includes(entrada.campo.id)} bloqueado={bloqueado(entrada.campo.id)} executaveis={executaveis}
      aoAlternar={aoAlternar} aoAtivar={aoAtivar} />;
  }

  const labelId = `${listboxId}-group-${entrada.sourceActionType.replace(/[^a-zA-Z0-9_-]/gu, '-')}`;
  return (
    <div role="group" aria-labelledby={labelId} className="dch-field-picker__action-group">
      <div className="dch-field-picker__action-heading" id={labelId}>
        <span><strong>{entrada.label}</strong><code translate="no">{entrada.sourceActionType}</code></span>
        <small>Ação</small>
      </div>
      <div className="dch-field-picker__action-projections">
        {entrada.campos.map((campo) => (
          <div
            key={campo.id}
            id={opcaoDomId(listboxId, campo.id)}
            role="option"
            aria-selected={selectedFields.includes(campo.id)}
            aria-disabled={bloqueado(campo.id) || undefined}
            className={`dch-field-picker__projection${activeFieldId === campo.id ? ' dch-field-picker__projection--active' : ''}${selectedFields.includes(campo.id) ? ' dch-field-picker__projection--selected' : ''}${bloqueado(campo.id) ? ' dch-field-picker__projection--disabled' : ''}`}
            onMouseDown={(event) => event.preventDefault()}
            onMouseEnter={() => aoAtivar(campo.id)}
            onClick={() => { if (!bloqueado(campo.id)) { aoAtivar(campo.id); aoAlternar(campo.id); } }}
          >
            <span>{PROJECAO_NOME[campo.sourceProjection ?? ''] ?? campo.nome}</span>
            <small>{estadoCampo(campo.id, executaveis)}</small>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ConsultaQueryV2({ catalogo, aoExecutar }: {
  catalogo: Catalogo;
  aoExecutar: (payload: ConsultaV2Payload) => Promise<ResultadoV2>;
}) {
  const v2 = catalogo.queryEngineV2;
  const executaveis = useMemo(() => new Set(v2?.executableFieldKeys ?? []), [v2]);
  const descobriveis = useMemo(() => new Set(v2?.discoverableFieldKeys ?? []), [v2]);
  const campos = useMemo(() => (v2?.fields ?? []).filter((field) => executaveis.has(field.id) || descobriveis.has(field.id)), [v2, executaveis, descobriveis]);
  const defaults = ['ad_name', 'insights.quality_ranking', 'spend'].filter((id) => executaveis.has(id));
  const [contaId, setContaId] = useState('');
  const [dateStart, setDateStart] = useState('');
  const [dateStop, setDateStop] = useState('');
  const [selectedFields, setSelectedFields] = useState<readonly string[]>(defaults);
  const [busca, setBusca] = useState('');
  const [grupoAtivo, setGrupoAtivo] = useState<GrupoCampoV2 | null>(null);
  const [painelAberto, setPainelAberto] = useState(false);
  const [activeFieldId, setActiveFieldId] = useState<string | null>(null);
  const [paginaSelecao, setPaginaSelecao] = useState(0);
  const [resultado, setResultado] = useState<ResultadoV2 | null>(null);
  const [executando, setExecutando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const listboxId = useId();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchShellRef = useRef<HTMLDivElement>(null);
  const mobileReturnFocusRef = useRef<HTMLElement | null>(null);
  const telaEstreita = useTelaEstreita();

  const fieldById = useMemo(() => new Map(campos.map((field) => [field.id, field])), [campos]);
  const entradas = useMemo(() => construirEntradasCampoV2(campos), [campos]);
  const termoBusca = normalizarTermoCampoV2(busca);
  const resultadosTotais = useMemo(() => buscarEntradasCampoV2(entradas, busca, termoBusca ? null : grupoAtivo), [entradas, busca, termoBusca, grupoAtivo]);
  const resultadosVisiveis = resultadosTotais.slice(0, RESULTADO_LIMITE);
  const camposOpcoesVisiveis = resultadosVisiveis.flatMap((entry) => entry.tipo === 'field' ? [entry.campo] : [...entry.campos]);
  const selecionadosParaDiscovery = selectedFields.filter((field) => descobriveis.has(field) && !executaveis.has(field));
  const discoveryNoLimite = selecionadosParaDiscovery.length >= 3;
  const painelVisivel = painelAberto && (termoBusca !== '' || grupoAtivo !== null);
  const paginasSelecao = Math.max(1, Math.ceil(selectedFields.length / SELECAO_POR_PAGINA));
  const selecionadosVisiveis = selectedFields.slice(paginaSelecao * SELECAO_POR_PAGINA, (paginaSelecao + 1) * SELECAO_POR_PAGINA);
  const contagemPorGrupo = useMemo(() => {
    const result = new Map<GrupoCampoV2, number>(GRUPOS_CAMPO_V2.map(({ id }) => [id, 0]));
    campos.forEach((field) => result.set(grupoDoCampoV2(field), (result.get(grupoDoCampoV2(field)) ?? 0) + 1));
    return result;
  }, [campos]);

  useEffect(() => {
    setPaginaSelecao((current) => Math.min(current, paginasSelecao - 1));
  }, [paginasSelecao]);

  useEffect(() => {
    if (!v2) return;
    setSelectedFields((atuais) => {
      const validos = atuais.filter((id) => executaveis.has(id) || descobriveis.has(id));
      if (validos.length === atuais.length && atuais.length > 0) return atuais;
      if (validos.length > 0) return validos;
      return ['ad_name', 'insights.quality_ranking', 'spend'].filter((id) => executaveis.has(id));
    });
  }, [v2, executaveis, descobriveis]);

  useEffect(() => {
    const firstAvailable = camposOpcoesVisiveis.find((field) => selectedFields.includes(field.id) || !(descobriveis.has(field.id) && !executaveis.has(field.id) && discoveryNoLimite));
    setActiveFieldId(firstAvailable?.id ?? null);
  }, [busca, grupoAtivo, resultadosTotais.length]);

  if (!v2 || !v2.executableFieldKeys.includes('insights.quality_ranking')) return null;

  function campoBloqueado(id: string) {
    return !selectedFields.includes(id) && descobriveis.has(id) && !executaveis.has(id) && discoveryNoLimite;
  }

  function alternarCampo(id: string) {
    if (selectedFields.includes(id)) {
      setSelectedFields((atuais) => atuais.filter((field) => field !== id));
      setErro(null);
      return;
    }
    if (descobriveis.has(id) && !executaveis.has(id) && selecionadosParaDiscovery.length >= 3) {
      setErro('O limite de discovery desta consulta é 3/3. Remova um campo “Verificar nesta conta” antes de escolher outro.');
      return;
    }
    setSelectedFields((atuais) => [...atuais, id]);
    setErro(null);
  }

  function ativarCampoComScroll(id: string) {
    setActiveFieldId(id);
    requestAnimationFrame(() => {
      document.getElementById(opcaoDomId(listboxId, id))?.scrollIntoView({ block: 'nearest' });
    });
  }

  function moverAtivo(delta: number) {
    const disponiveis = camposOpcoesVisiveis.filter((field) => !campoBloqueado(field.id));
    if (disponiveis.length === 0) return;
    const currentIndex = disponiveis.findIndex((field) => field.id === activeFieldId);
    const nextIndex = currentIndex < 0
      ? (delta > 0 ? 0 : disponiveis.length - 1)
      : (currentIndex + delta + disponiveis.length) % disponiveis.length;
    ativarCampoComScroll(disponiveis[nextIndex].id);
  }

  function fecharPainel() {
    setPainelAberto(false);
    setActiveFieldId(null);
    const returnFocus = mobileReturnFocusRef.current;
    mobileReturnFocusRef.current = null;
    requestAnimationFrame(() => {
      if (telaEstreita && returnFocus?.isConnected) returnFocus.focus();
      else if (telaEstreita) searchInputRef.current?.blur();
    });
  }

  function tecladoSheet(event: React.KeyboardEvent<HTMLDivElement>) {
    if (!telaEstreita || !painelVisivel || event.key !== 'Tab') return;
    const shell = searchShellRef.current;
    if (!shell) return;
    const focusables = [...shell.querySelectorAll<HTMLElement>('input:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex="-1"])')]
      .filter((element) => element.getClientRects().length > 0);
    if (focusables.length === 0) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function tecladoBusca(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      if (!painelVisivel && (termoBusca !== '' || grupoAtivo !== null)) {
        event.preventDefault();
        setPainelAberto(true);
        const disponiveis = camposOpcoesVisiveis.filter((field) => !campoBloqueado(field.id));
        const campo = event.key === 'ArrowUp' ? disponiveis.at(-1) : disponiveis[0];
        if (campo) ativarCampoComScroll(campo.id);
        return;
      }
      if (!painelVisivel) return;
      event.preventDefault();
      moverAtivo(event.key === 'ArrowDown' ? 1 : -1);
      return;
    }
    if (event.key === 'Enter' && painelVisivel && activeFieldId) {
      event.preventDefault();
      alternarCampo(activeFieldId);
      return;
    }
    if (event.key === 'Escape') fecharPainel();
  }

  function explorar(grupo: GrupoCampoV2) {
    if (telaEstreita && document.activeElement instanceof HTMLElement && document.activeElement !== searchInputRef.current) {
      mobileReturnFocusRef.current = document.activeElement;
    }
    setBusca('');
    setGrupoAtivo(grupo);
    setPainelAberto(true);
    requestAnimationFrame(() => searchInputRef.current?.focus());
  }

  const valido = contaId !== '' && dateStart !== '' && dateStop !== '' && dateStart <= dateStop && selectedFields.length > 0;

  async function executar() {
    if (!valido || executando) return;
    setExecutando(true);
    setErro(null);
    setResultado(null);
    try {
      setResultado(await aoExecutar({ accountId: contaId, selectedFields, dateStart, dateStop, granularity: 'day' }));
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Não foi possível executar a consulta V2.');
    } finally {
      setExecutando(false);
    }
  }

  return (
    <section className="dcp-secao dch-query-v2" aria-labelledby="query-v2-titulo">
      <p className="dcp-eyebrow">Query Engine V2</p>
      <h2 id="query-v2-titulo" className="dcp-secao__titulo">Consulta direta por campos</h2>
      <p className="dcp-secao__apoio">
        Comece pelo campo que você quer analisar. O catálogo continua vindo do Data Hub; campos ainda não comprovados nesta conta passam por discovery antes da consulta.
      </p>

      <div className="dch-query-v2__controles">
        <label className="dch-campo" htmlFor="query-v2-conta"><span>Conta</span>
          <select id="query-v2-conta" name="query-v2-conta" value={contaId} onChange={(event) => setContaId(event.target.value)}>
            <option value="">Escolha uma conta</option>
            {catalogo.contas.filter((conta) => conta.disponivel === true).map((conta) => <option key={conta.id} value={conta.id}>{conta.nome}</option>)}
          </select>
        </label>
        <label className="dch-campo" htmlFor="query-v2-inicio"><span>Data inicial</span>
          <input id="query-v2-inicio" name="query-v2-inicio" type="date" value={dateStart} onChange={(event) => setDateStart(event.target.value)} />
        </label>
        <label className="dch-campo" htmlFor="query-v2-fim"><span>Data final</span>
          <input id="query-v2-fim" name="query-v2-fim" type="date" value={dateStop} onChange={(event) => setDateStop(event.target.value)} />
        </label>
      </div>

      <div className="dch-field-picker" aria-labelledby="query-v2-fields-title">
        <div className="dch-field-picker__heading">
          <div>
            <p className="dch-field-picker__kicker">Campos</p>
            <h3 id="query-v2-fields-title">Monte a consulta pela busca</h3>
            <p id="query-v2-field-hint">Pesquise por nome, ID técnico ou categoria. A ordem em que você escolhe é a ordem enviada em <code translate="no">selectedFields</code>.</p>
          </div>
          <div id="query-v2-discovery-status" className="dch-field-picker__discovery" role="status" aria-live="polite">
            <span>Discovery por consulta</span>
            <strong>{selecionadosParaDiscovery.length}/3</strong>
            <div aria-hidden="true" className="dch-field-picker__meter">
              {[0, 1, 2].map((slot) => <i key={slot} className={slot < selecionadosParaDiscovery.length ? 'is-filled' : ''} />)}
            </div>
            <small>{discoveryNoLimite ? 'Limite atingido — remova um para verificar outro.' : 'Até 3 campos podem exigir verificação nesta conta.'}</small>
          </div>
        </div>

        <div className="dch-field-picker__layout">
          <div className="dch-field-picker__main">
            <div
              ref={searchShellRef}
              className={`dch-field-picker__search-shell${telaEstreita && painelVisivel ? ' dch-field-picker__search-shell--open' : ''}`}
              role={telaEstreita && painelVisivel ? 'dialog' : undefined}
              aria-modal={telaEstreita && painelVisivel ? true : undefined}
              aria-label={telaEstreita && painelVisivel ? 'Buscar e escolher campos' : undefined}
              onKeyDown={tecladoSheet}
              onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setPainelAberto(false);
              }}
            >
              <div className="dch-field-picker__mobile-head">
                <strong>Escolher campos</strong>
                <button type="button" onClick={fecharPainel}>Fechar</button>
              </div>
              <label htmlFor="query-v2-busca">Buscar no catálogo V2</label>
              <div className="dch-field-picker__search-row">
                <input
                  ref={searchInputRef}
                  id="query-v2-busca"
                  name="query-v2-busca"
                  type="search"
                  role="combobox"
                  aria-autocomplete="list"
                  aria-expanded={painelVisivel}
                  aria-controls={painelVisivel ? listboxId : undefined}
                  aria-activedescendant={painelVisivel && activeFieldId ? opcaoDomId(listboxId, activeFieldId) : undefined}
                  aria-describedby="query-v2-field-hint query-v2-discovery-status"
                  autoComplete="off"
                  spellCheck={false}
                  value={busca}
                  onFocus={() => setPainelAberto(true)}
                  onChange={(event) => { setBusca(event.target.value); setGrupoAtivo(null); setPainelAberto(true); }}
                  onKeyDown={tecladoBusca}
                  placeholder="Busque uma métrica ou campo…"
                />
                {busca ? <button type="button" className="dch-field-picker__clear" aria-label="Limpar busca" onClick={() => { setBusca(''); searchInputRef.current?.focus(); }}>Limpar</button> : null}
              </div>

              {painelVisivel ? (
                <div className="dch-field-picker__popover">
                  <div className="dch-field-picker__results-meta" aria-live="polite">
                    <span>{termoBusca ? `Resultados para “${busca.trim()}”` : GRUPOS_CAMPO_V2.find(({ id }) => id === grupoAtivo)?.nome}</span>
                    <small>Mostrando {resultadosVisiveis.length} de {resultadosTotais.length} grupo(s)/campo(s). {resultadosTotais.length > RESULTADO_LIMITE ? 'Refine a busca para ver outros.' : ''}</small>
                  </div>
                  {resultadosVisiveis.length > 0 ? (
                    <div id={listboxId} role="listbox" aria-label="Resultados de campos" aria-multiselectable="true" className="dch-field-picker__listbox">
                      {resultadosVisiveis.map((entrada) => <ResultadoEntrada key={entrada.chave} entrada={entrada} listboxId={listboxId}
                        activeFieldId={activeFieldId} selectedFields={selectedFields} executaveis={executaveis} bloqueado={campoBloqueado}
                        aoAlternar={alternarCampo} aoAtivar={setActiveFieldId} />)}
                    </div>
                  ) : <p className="dch-field-picker__empty">Nenhum campo encontrado. Tente o nome técnico, uma categoria ou outra palavra.</p>}
                </div>
              ) : null}
            </div>

            <div className="dch-field-picker__explore" aria-label="Explorar campos por grupo">
              <div className="dch-field-picker__explore-heading">
                <strong>Ou explore por grupo</strong>
                <span>{campos.length} campos no catálogo desta tela</span>
              </div>
              <div className="dch-field-picker__groups">
                {GRUPOS_CAMPO_V2.map((grupo) => (
                  <button key={grupo.id} type="button" className={grupoAtivo === grupo.id ? 'is-active' : ''} aria-pressed={grupoAtivo === grupo.id} onClick={() => explorar(grupo.id)}>
                    <span><strong>{grupo.nome}</strong><small>{grupo.apoio}</small></span>
                    <b>{contagemPorGrupo.get(grupo.id) ?? 0}</b>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <aside className="dch-field-picker__selected" aria-labelledby="query-v2-selected-title">
            <div className="dch-field-picker__selected-head">
              <div><span>Sua seleção</span><h4 id="query-v2-selected-title">Campos selecionados</h4></div>
              <strong>{selectedFields.length}</strong>
            </div>
            {selectedFields.length === 0 ? (
              <p className="dch-field-picker__selected-empty">Nenhum campo ainda. Use a busca ou um grupo para começar.</p>
            ) : (
              <ol className="dch-field-picker__selected-list" start={paginaSelecao * SELECAO_POR_PAGINA + 1}>
                {selecionadosVisiveis.map((id, index) => {
                  const campo = fieldById.get(id);
                  const ordem = paginaSelecao * SELECAO_POR_PAGINA + index + 1;
                  return (
                    <li key={id}>
                      <span className="dch-field-picker__selected-order" aria-hidden="true">{ordem}</span>
                      <span><strong>{campo?.nome ?? id}</strong><small>{estadoCampo(id, executaveis)}</small></span>
                      <button type="button" aria-label={`Remover ${campo?.nome ?? id}`} onClick={() => alternarCampo(id)}><span aria-hidden="true">×</span></button>
                    </li>
                  );
                })}
              </ol>
            )}
            {paginasSelecao > 1 ? (
              <div className="dch-field-picker__selected-pages" aria-label="Paginação dos campos selecionados">
                <button type="button" disabled={paginaSelecao === 0} onClick={() => setPaginaSelecao((page) => Math.max(0, page - 1))}>Anteriores</button>
                <span>Página {paginaSelecao + 1} de {paginasSelecao}</span>
                <button type="button" disabled={paginaSelecao >= paginasSelecao - 1} onClick={() => setPaginaSelecao((page) => Math.min(paginasSelecao - 1, page + 1))}>Próximos</button>
              </div>
            ) : null}
            <p className="dch-field-picker__selected-note">A lista mostra no máximo {SELECAO_POR_PAGINA} campos por página para continuar legível mesmo em consultas grandes.</p>
          </aside>
        </div>
      </div>

      <button type="button" className="dcp-botao dcp-botao--primario dch-query-v2__execute" disabled={!valido || executando} onClick={() => void executar()}>
        {executando ? 'Consultando…' : 'Executar consulta V2'}
      </button>
      {dateStart && dateStop && dateStart > dateStop ? <p className="dcp-erro" role="alert">A data inicial não pode ser posterior à final.</p> : null}
      {erro ? <p className="dch-status dch-status--erro" role="alert">{erro}</p> : null}

      {resultado ? (
        <div className="dch-query-v2__resultado" aria-live="polite">
          <p className="dch-status dch-status--ok">Consulta V2 concluída. Referência: <code translate="no">{resultado.queryRunId}</code></p>
          <p className="dcp-secao__apoio">Grão: {resultado.result.resolvedGrain} · Fonte completa: {resultado.result.sourceComplete ? 'sim' : 'não'} · Paginação completa: {resultado.result.pagingComplete ? 'sim' : 'não'}</p>
          <div className="dch-query-v2__tabela-wrap">
            <table className="dch-query-v2__tabela">
              <thead><tr>{resultado.result.columns.map((field) => <th key={field} scope="col">{field}</th>)}</tr></thead>
              <tbody>
                {resultado.result.rows.map((row, index) => <tr key={index}>{resultado.result.columns.map((field) => <td key={field}>{valorCelula(row, field)}</td>)}</tr>)}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </section>
  );
}
