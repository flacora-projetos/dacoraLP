import { useMemo, useState } from 'react';
import type { Catalogo } from './data-hub-catalogo';

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

function valorCelula(row: Record<string, unknown>, field: string) {
  if (!Object.hasOwn(row, field)) return <span title="Campo ausente na resposta">—</span>;
  const value = row[field];
  if (value === null) return <span title="Valor nulo retornado pela fonte">null</span>;
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function termoNormalizado(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
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
  const [resultado, setResultado] = useState<ResultadoV2 | null>(null);
  const [executando, setExecutando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const camposFiltrados = useMemo(() => {
    const termo = termoNormalizado(busca);
    if (!termo) return campos;
    return campos.filter((field) => termoNormalizado(`${field.nome} ${field.id} ${field.categoria ?? ''}`).includes(termo));
  }, [busca, campos]);
  const selecionadosParaDiscovery = selectedFields.filter((field) => descobriveis.has(field) && !executaveis.has(field));

  if (!v2 || !v2.executableFieldKeys.includes('insights.quality_ranking')) return null;

  function alternarCampo(id: string) {
    if (selectedFields.includes(id)) {
      setSelectedFields((atuais) => atuais.filter((field) => field !== id));
      setErro(null);
      return;
    }
    if (descobriveis.has(id) && !executaveis.has(id) && selecionadosParaDiscovery.length >= 3) {
      setErro('Escolha no máximo 3 campos ainda não validados por consulta. Isso limita o número de probes feitos na Meta.');
      return;
    }
    setSelectedFields((atuais) => [...atuais, id]);
    setErro(null);
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
        Campos já comprovados executam direto. Campos marcados como “verificar nesta conta” passam por discovery real antes da consulta e só seguem se a Meta devolver evidência compatível.
      </p>

      <div className="dch-query-v2__controles">
        <label className="dch-campo" htmlFor="query-v2-conta"><span>Conta</span>
          <select id="query-v2-conta" value={contaId} onChange={(event) => setContaId(event.target.value)}>
            <option value="">Escolha uma conta</option>
            {catalogo.contas.filter((conta) => conta.disponivel === true).map((conta) => <option key={conta.id} value={conta.id}>{conta.nome}</option>)}
          </select>
        </label>
        <label className="dch-campo" htmlFor="query-v2-inicio"><span>Data inicial</span>
          <input id="query-v2-inicio" type="date" value={dateStart} onChange={(event) => setDateStart(event.target.value)} />
        </label>
        <label className="dch-campo" htmlFor="query-v2-fim"><span>Data final</span>
          <input id="query-v2-fim" type="date" value={dateStop} onChange={(event) => setDateStop(event.target.value)} />
        </label>
      </div>

      <label className="dch-campo dch-query-v2__busca" htmlFor="query-v2-busca"><span>Buscar campos V2</span>
        <input id="query-v2-busca" type="search" value={busca} onChange={(event) => setBusca(event.target.value)} placeholder="Ex.: outbound, ranking, spend…" />
      </label>

      <fieldset className="dch-query-v2__campos">
        <legend>Campos do catálogo V2</legend>
        {camposFiltrados.map((campo) => {
          const requerDiscovery = descobriveis.has(campo.id) && !executaveis.has(campo.id);
          return (
            <label key={campo.id} className="dch-opcao">
              <input type="checkbox" checked={selectedFields.includes(campo.id)} onChange={() => alternarCampo(campo.id)} />
              <span>{campo.nome}<small className="dch-query-v2__estado">{requerDiscovery ? 'Verificar nesta conta' : 'Executável'}</small></span>
            </label>
          );
        })}
      </fieldset>

      {selecionadosParaDiscovery.length > 0 ? <p className="dcp-secao__apoio">Discovery nesta execução: {selecionadosParaDiscovery.length}/3 campo(s).</p> : null}
      <button type="button" className="dcp-botao dcp-botao--primario" disabled={!valido || executando} onClick={() => void executar()}>
        {executando ? 'Consultando…' : 'Executar consulta V2'}
      </button>
      {dateStart && dateStop && dateStart > dateStop ? <p className="dcp-erro" role="alert">A data inicial não pode ser posterior à final.</p> : null}
      {erro ? <p className="dch-status dch-status--erro" role="alert">{erro}</p> : null}

      {resultado ? (
        <div className="dch-query-v2__resultado" aria-live="polite">
          <p className="dch-status dch-status--ok">Consulta V2 concluída. Referência: <code>{resultado.queryRunId}</code></p>
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
