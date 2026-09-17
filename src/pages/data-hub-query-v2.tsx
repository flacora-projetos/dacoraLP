import { useEffect, useMemo, useState } from 'react';
import type React from 'react';
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

export type AbaPlanilha = { sheetId: number; title: string };
export type DestinoPlanilha = {
  provider: 'google_sheets';
  spreadsheetId: string;
  spreadsheetName: string;
  sheetId: number;
  sheetTitle: string;
  startCell: string;
  writeMode: 'append' | 'replace';
};
type DestinoResolvido = { destino: DestinoPlanilha; abas: readonly AbaPlanilha[] };
type EstadoEntrega =
  | { tipo: 'ocioso' }
  | { tipo: 'entregando' }
  | { tipo: 'entregue' }
  | { tipo: 'repetida' }
  | { tipo: 'erro'; mensagem: string };

const CELULA = /^[A-Z]{1,3}[1-9][0-9]{0,6}$/;

export function ConsultaQueryV2({
  catalogo, aoExecutar, aoEscolherPlanilha, aoResolverDestino, aoCriarAba, aoExportar, destinoLembrado,
}: {
  catalogo: Catalogo;
  aoExecutar: (payload: ConsultaV2Payload) => Promise<ResultadoV2>;
  aoEscolherPlanilha?: () => Promise<DestinoResolvido | null>;
  aoResolverDestino?: (valor: string, selecao?: { sheetId?: number; startCell?: string }) => Promise<DestinoResolvido>;
  aoCriarAba?: (spreadsheetId: string, title: string, startCell: string) => Promise<DestinoResolvido>;
  aoExportar?: (entrada: { queryRunId: string; accountId: string; destino: DestinoPlanilha; dateStart: string; dateStop: string }) => Promise<'enqueued' | 'duplicate'>;
  destinoLembrado?: (accountId: string) => DestinoPlanilha | null;
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
  const [aberto, setAberto] = useState(false);
  const [ativo, setAtivo] = useState(-1);
  const [destino, setDestino] = useState<DestinoPlanilha | null>(null);
  const [abas, setAbas] = useState<readonly AbaPlanilha[]>([]);
  const [celula, setCelula] = useState('A1');
  const [novaAba, setNovaAba] = useState('');
  const [entrega, setEntrega] = useState<EstadoEntrega>({ tipo: 'ocioso' });
  const [ocupadoDestino, setOcupadoDestino] = useState(false);

  const entregaDisponivel = Boolean(aoExportar && aoEscolherPlanilha && aoResolverDestino);

  // O vinculo e por cliente: ao trocar de conta, o destino lembrado dela volta sozinho.
  useEffect(() => {
    setEntrega({ tipo: 'ocioso' });
    if (!contaId) { setDestino(null); setAbas([]); return; }
    const lembrado = destinoLembrado?.(contaId) ?? null;
    setDestino(lembrado);
    setCelula(lembrado?.startCell ?? 'A1');
    setAbas([]);
    if (lembrado && aoResolverDestino) {
      void aoResolverDestino(lembrado.spreadsheetId, { sheetId: lembrado.sheetId, startCell: lembrado.startCell })
        .then((resolvido) => { setDestino(resolvido.destino); setAbas(resolvido.abas); })
        .catch(() => { /* planilha lembrada pode ter sumido: escolher de novo resolve */ });
    }
  }, [contaId]);

  async function comDestino(acao: () => Promise<DestinoResolvido | null>) {
    setOcupadoDestino(true);
    setEntrega({ tipo: 'ocioso' });
    try {
      const resolvido = await acao();
      if (!resolvido) return;
      setDestino(resolvido.destino);
      setAbas(resolvido.abas);
      setCelula(resolvido.destino.startCell);
      setNovaAba('');
    } catch (error) {
      setEntrega({ tipo: 'erro', mensagem: error instanceof Error ? error.message : 'Não foi possível preparar o destino.' });
    } finally {
      setOcupadoDestino(false);
    }
  }

  async function entregar() {
    if (!resultado || !destino || !aoExportar) return;
    setEntrega({ tipo: 'entregando' });
    try {
      const status = await aoExportar({
        queryRunId: resultado.queryRunId, accountId: contaId, destino: { ...destino, startCell: celula },
        dateStart, dateStop,
      });
      setEntrega({ tipo: status === 'duplicate' ? 'repetida' : 'entregue' });
    } catch (error) {
      setEntrega({ tipo: 'erro', mensagem: error instanceof Error ? error.message : 'Não foi possível entregar na planilha.' });
    }
  }

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

  // Com o catalogo em centenas de chaves, abrir tudo ao focar e uma parede.
  // Ao focar sem termo, mostramos um recorte util: primeiro os campos prontos
  // para usar. O resto continua alcancavel digitando.
  const LIMITE_SUGESTOES = 60;
  const sugestoes = useMemo(() => {
    const termo = termoNormalizado(busca);
    const base = termo
      ? campos.filter((campo) => termoNormalizado(`${campo.nome} ${campo.id} ${campo.categoria ?? ''}`).includes(termo))
      : [...campos].sort((um, outro) => Number(executaveis.has(outro.id)) - Number(executaveis.has(um.id)));
    return { itens: base.slice(0, LIMITE_SUGESTOES), total: base.length };
  }, [busca, campos, executaveis]);

  const escolhidos = useMemo(
    () => selectedFields.map((id) => campos.find((campo) => campo.id === id) ?? { id, nome: id, categoria: undefined }),
    [selectedFields, campos],
  );

  function aoTeclar(evento: React.KeyboardEvent<HTMLInputElement>) {
    const total = sugestoes.itens.length;
    if (evento.key === 'Escape') { setAberto(false); setAtivo(-1); return; }
    if (evento.key === 'ArrowDown' || evento.key === 'ArrowUp') {
      evento.preventDefault();
      if (!aberto) { setAberto(true); setAtivo(0); return; }
      if (total === 0) return;
      const passo = evento.key === 'ArrowDown' ? 1 : -1;
      setAtivo((atual) => (atual + passo + total) % total);
      return;
    }
    if (evento.key === 'Home' && aberto) { evento.preventDefault(); setAtivo(0); return; }
    if (evento.key === 'End' && aberto) { evento.preventDefault(); setAtivo(total - 1); return; }
    if (evento.key === 'Enter' && aberto && ativo >= 0 && ativo < total) {
      evento.preventDefault();
      alternarCampo(sugestoes.itens[ativo].id);
    }
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
      setErro(error instanceof Error ? error.message : 'Não foi possível executar a consulta.');
    } finally {
      setExecutando(false);
    }
  }

  return (
    <section className="dcp-secao dch-query-v2" aria-labelledby="query-v2-titulo">
      <p className="dcp-eyebrow">Consulta</p>
      <h2 id="query-v2-titulo" className="dcp-secao__titulo">Montar consulta por campos</h2>
      <p className="dcp-secao__apoio">
        Campos já comprovados nesta conta consultam direto. Os marcados como “verificar nesta conta” são conferidos na Meta antes da consulta e só entram se houver dado compatível.
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

      <div className="dch-query-v2__busca-grupo">
        <label className="dch-campo dch-query-v2__busca" htmlFor="query-v2-busca"><span>Buscar campos</span>
          <input
            id="query-v2-busca" type="text" role="combobox" autoComplete="off" spellCheck={false}
            aria-expanded={aberto} aria-controls="query-v2-lista" aria-autocomplete="list"
            aria-activedescendant={aberto && ativo >= 0 ? `query-v2-opcao-${ativo}` : undefined}
            value={busca}
            placeholder="Investimento, cliques, compras…"
            onFocus={() => setAberto(true)}
            onBlur={(evento) => { if (!evento.currentTarget.closest('.dch-query-v2__busca-grupo')?.contains(evento.relatedTarget as Node)) setAberto(false); }}
            onChange={(evento) => { setBusca(evento.target.value); setAberto(true); setAtivo(0); }}
            onKeyDown={aoTeclar}
          />
        </label>

        {aberto ? (
          <div className="dch-query-v2__lista" id="query-v2-lista" role="listbox" aria-label="Campos disponíveis" aria-multiselectable="true">
            {sugestoes.itens.length === 0 ? (
              <p className="dch-query-v2__vazio">Nenhum campo com esse nome. Tente outra palavra, como “compra” ou “clique”.</p>
            ) : (
              <>
                {sugestoes.itens.map((campo, indice) => {
                  const porVerificar = descobriveis.has(campo.id) && !executaveis.has(campo.id);
                  const marcado = selectedFields.includes(campo.id);
                  return (
                    <div
                      key={campo.id} id={`query-v2-opcao-${indice}`} role="option" aria-selected={marcado}
                      className={`dch-query-v2__opcao${indice === ativo ? ' dch-query-v2__opcao--ativa' : ''}`}
                      onMouseDown={(evento) => { evento.preventDefault(); alternarCampo(campo.id); }}
                      onMouseEnter={() => setAtivo(indice)}
                    >
                      <span className="dch-query-v2__marca" aria-hidden="true">{marcado ? '✓' : ''}</span>
                      <span className="dch-query-v2__rotulo">
                        {campo.nome}
                        <small className="dch-query-v2__estado">{porVerificar ? 'Verificar nesta conta' : 'Pronto para usar'}</small>
                      </span>
                    </div>
                  );
                })}
                {sugestoes.total > sugestoes.itens.length ? (
                  <p className="dch-query-v2__vazio">
                    Mostrando {sugestoes.itens.length} de {sugestoes.total}. Digite para encontrar o resto.
                  </p>
                ) : null}
              </>
            )}
          </div>
        ) : null}
      </div>

      {escolhidos.length > 0 ? (
        <ul className="dch-query-v2__escolhidos" aria-label="Campos escolhidos">
          {escolhidos.map((campo) => (
            <li key={campo.id}>
              <button type="button" className="dch-query-v2__chip" onClick={() => alternarCampo(campo.id)}
                aria-label={`Remover ${campo.nome}`}>
                {campo.nome}<span aria-hidden="true">×</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="dch-query-v2__acoes">
        <p className="dch-query-v2__resumo">
          {escolhidos.length === 0 ? 'Nenhum campo escolhido ainda.' : `${escolhidos.length} campo(s) escolhido(s).`}
          {selecionadosParaDiscovery.length > 0 ? ` ${selecionadosParaDiscovery.length} de 3 serão conferidos na Meta.` : ''}
        </p>
        <button type="button" className="dcp-botao dcp-botao--primario" disabled={!valido || executando} onClick={() => void executar()}>
          {executando ? 'Consultando…' : 'Executar consulta'}
        </button>
      </div>

      {dateStart && dateStop && dateStart > dateStop ? <p className="dcp-erro" role="alert">A data inicial não pode ser posterior à final.</p> : null}
      {erro ? <p className="dch-status dch-status--erro" role="alert">{erro}</p> : null}

      {resultado ? (
        <div className="dch-query-v2__resultado" aria-live="polite">
          <p className="dch-status dch-status--ok">Consulta concluída. Referência desta consulta: <code>{resultado.queryRunId}</code></p>
          <p className="dcp-secao__apoio">Nível dos dados: {resultado.result.resolvedGrain} · Dados completos: {resultado.result.sourceComplete && resultado.result.pagingComplete ? 'sim' : 'não'}</p>
          <div className="dch-query-v2__tabela-wrap">
            <table className="dch-query-v2__tabela">
              <thead><tr>{resultado.result.columns.map((field) => <th key={field} scope="col">{field}</th>)}</tr></thead>
              <tbody>
                {resultado.result.rows.map((row, index) => <tr key={index}>{resultado.result.columns.map((field) => <td key={field}>{valorCelula(row, field)}</td>)}</tr>)}
              </tbody>
            </table>
          </div>

          {entregaDisponivel ? (
            <div className="dch-entrega">
              <span className="dch-etapa">Entregar na planilha</span>
              <p className="dcp-secao__apoio">
                Uma planilha por cliente, uma aba por tipo de consulta. O destino fica guardado para esta conta e a
                consulta seguinte substitui a anterior na mesma aba — é isso que deixa o Looker Studio se atualizar sozinho.
              </p>

              <div className="dch-entrega__linha">
                <button type="button" className="dcp-botao" disabled={ocupadoDestino}
                  onClick={() => void comDestino(() => aoEscolherPlanilha!())}>
                  {destino ? 'Trocar planilha' : 'Escolher planilha'}
                </button>
                {destino ? <span className="dch-entrega__planilha">{destino.spreadsheetName}</span> : null}
              </div>

              {destino ? (
                <div className="dch-entrega__linha">
                  <label className="dch-entrega__campo">
                    <span>Aba</span>
                    <select value={destino.sheetId} disabled={ocupadoDestino || abas.length === 0}
                      onChange={(evento) => void comDestino(() => aoResolverDestino!(destino.spreadsheetId, {
                        sheetId: Number(evento.target.value), startCell: celula,
                      }))}>
                      {(abas.length > 0 ? abas : [{ sheetId: destino.sheetId, title: destino.sheetTitle }])
                        .map((aba) => <option key={aba.sheetId} value={aba.sheetId}>{aba.title}</option>)}
                    </select>
                  </label>
                  <label className="dch-entrega__campo">
                    <span>Começar em</span>
                    <input value={celula} inputMode="text" aria-describedby="dch-celula-ajuda"
                      onChange={(evento) => setCelula(evento.target.value.toUpperCase().trim())} />
                  </label>
                </div>
              ) : null}

              {destino && aoCriarAba ? (
                <div className="dch-entrega__linha">
                  <label className="dch-entrega__campo">
                    <span>Criar aba</span>
                    <input value={novaAba} placeholder="Mensal, Criativos, Posicionamentos…"
                      onChange={(evento) => setNovaAba(evento.target.value)} />
                  </label>
                  <button type="button" className="dcp-botao" disabled={ocupadoDestino || novaAba.trim() === ''}
                    onClick={() => void comDestino(() => aoCriarAba(destino.spreadsheetId, novaAba.trim(), celula))}>
                    Criar e usar
                  </button>
                </div>
              ) : null}

              <p id="dch-celula-ajuda" className="dcp-secao__apoio">
                Célula como A1 ou B3. Linhas sem dado chegam em branco na planilha — não viram zero.
              </p>

              <button type="button" className="dcp-botao dcp-botao--primario"
                disabled={!destino || !CELULA.test(celula) || entrega.tipo === 'entregando'}
                onClick={() => void entregar()}>
                {entrega.tipo === 'entregando' ? 'Entregando…' : 'Entregar nesta aba'}
              </button>

              {!CELULA.test(celula) ? <p className="dcp-erro" role="alert">Célula inválida. Use algo como A1.</p> : null}
              {entrega.tipo === 'entregue'
                ? <p className="dch-status dch-status--ok" role="status">Entregue em {destino?.sheetTitle} a partir de {celula}.</p> : null}
              {entrega.tipo === 'repetida'
                ? <p className="dch-status dch-status--ok" role="status">Esta mesma entrega já tinha sido feita. Nada foi escrito de novo.</p> : null}
              {entrega.tipo === 'erro'
                ? <p className="dch-status dch-status--erro" role="alert">{entrega.mensagem}</p> : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
