import { useEffect, useId, useRef, useState, type ChangeEvent } from 'react';
import { formatarCompetencia } from '../reports/format';
import PortalDoDialogo from './PortalDoDialogo';
import {
  CATALOGO_CAUSAS_RECUSA,
  MAXIMO_CAUSAS_RECUSA,
  OPCOES_CAUSA_RECUSA,
  PLATAFORMAS_CAUSA,
  causaEhManual,
  contratosDeMetricaDoSnapshot,
  resumoHumanoDasCausas,
  type CausaRecusa,
  type IdCausaRecusa,
} from './causasRecusa';

export interface AlvoDaRecusa {
  clienteNome: string;
  competencia: string;
  secoesRecusaveis?: Array<{ secao: string; titulo: string }>;
  metricasRecusaveis?: Array<{ id: string; rotulo: string; plataforma: string }>;
}

export default function DialogoRecusaCausas({ relatorio, quem, aoConfirmar, aoCancelar, registrando }: {
  relatorio: AlvoDaRecusa;
  quem: string;
  aoConfirmar: (causas: CausaRecusa[]) => void;
  aoCancelar: () => void;
  registrando: boolean;
}) {
  const idBase = useId();
  const caixa = useRef<HTMLDivElement | null>(null);
  const primeiroControle = useRef<HTMLInputElement | null>(null);
  const [selecionadas, setSelecionadas] = useState<IdCausaRecusa[]>([]);
  const [rascunhos, setRascunhos] = useState<Record<string, Record<string, unknown>>>({});
  const secoes = relatorio.secoesRecusaveis ?? [];
  const metricas = relatorio.metricasRecusaveis ?? [];

  useEffect(() => { primeiroControle.current?.focus(); }, []);
  useEffect(() => {
    function aoTeclar(evento: KeyboardEvent) {
      if (evento.key === 'Escape') { evento.preventDefault(); aoCancelar(); return; }
      if (evento.key !== 'Tab' || !caixa.current) return;
      const focaveis = caixa.current.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), a[href]');
      if (focaveis.length === 0) return;
      const primeiro = focaveis[0];
      const ultimo = focaveis[focaveis.length - 1];
      if (evento.shiftKey && document.activeElement === primeiro) { evento.preventDefault(); ultimo.focus(); }
      else if (!evento.shiftKey && document.activeElement === ultimo) { evento.preventDefault(); primeiro.focus(); }
    }
    document.addEventListener('keydown', aoTeclar);
    return () => document.removeEventListener('keydown', aoTeclar);
  }, [aoCancelar]);

  function mudar(id: IdCausaRecusa, campo: string, valor: unknown) {
    setRascunhos((atual) => {
      const anterior = atual[id] ?? {};
      /**
       * Trocar a plataforma LIMPA a métrica já escolhida.
       *
       * Filtrar a lista não basta: o rascunho antigo sobrevive à troca, o
       * `select` só deixa de mostrar a opção, e `montar` continuaria enviando
       * a métrica da outra plataforma — o par impossível voltaria calado, que
       * é exatamente o modo de falhar que este filtro existe para impedir.
       */
      const limpo = campo === 'platform' && valor !== anterior.platform
        ? { ...anterior, metric_id: undefined, metric_ids: undefined }
        : anterior;
      return { ...atual, [id]: { ...limpo, [campo]: valor } };
    });
  }
  function selecionados(evento: ChangeEvent<HTMLSelectElement>) {
    return Array.from(evento.target.selectedOptions).map((opcao) => opcao.value);
  }
  function montar(id: IdCausaRecusa): CausaRecusa | null {
    const r = rascunhos[id] ?? {};
    if (id === 'metrica_obrigatoria_ausente') {
      const section_id = String(r.section_id ?? ''); const platform = String(r.platform ?? ''); const metric_id = String(r.metric_id ?? '');
      return section_id && platform && metric_id ? { causeId: id, parameters: { section_id, platform, metric_id } } : null;
    }
    if (id === 'periodo_medicao_incorreto') {
      const section_ids = Array.isArray(r.section_ids) ? r.section_ids : []; const metric_ids = Array.isArray(r.metric_ids) ? r.metric_ids : []; const platform = String(r.platform ?? '');
      return section_ids.length && metric_ids.length && platform ? { causeId: id, parameters: { platform, section_ids, metric_ids } } : null;
    }
    if (id === 'resultado_fora_do_contrato') {
      const section_ids = Array.isArray(r.section_ids) ? r.section_ids : []; const platform = String(r.platform ?? '');
      return section_ids.length && platform ? { causeId: id, parameters: { platform, section_ids } } : null;
    }
    if (id === 'inconsistencia_entre_blocos') {
      const section_ids = Array.isArray(r.section_ids) ? r.section_ids : []; const metric_contract_id = String(r.metric_contract_id ?? '').trim();
      return section_ids.length >= 2 && metric_contract_id ? { causeId: id, parameters: { metric_contract_id, section_ids } } : null;
    }
    if (id === 'apresentacao_visual') {
      const block_ids = Array.isArray(r.block_ids) ? r.block_ids : []; const viewport = String(r.viewport ?? 'ambos'); const description = String(r.description ?? '').trim();
      return block_ids.length && description.length >= 10 ? { causeId: id, parameters: { block_ids, viewport, description } } : null;
    }
    const description = String(r.description ?? '').trim(); const section_ids = Array.isArray(r.section_ids) ? r.section_ids : [];
    return description.length >= 10 ? { causeId: id, parameters: section_ids.length ? { description, section_ids } : { description } } : null;
  }

  const causas = selecionadas.map(montar).filter((item): item is CausaRecusa => Boolean(item));
  /**
   * O teto de 5 é conferido AQUI e não só no servidor. O catálogo tem 6 causas,
   * então marcar todas é alcançável com um clique a mais — e sem esta trava o
   * humano só descobre o limite depois de preencher tudo e apertar o botão,
   * recebendo um erro genérico do banco em vez de um aviso na tela.
   */
  const excedeu = selecionadas.length > MAXIMO_CAUSAS_RECUSA;
  const completas = selecionadas.length > 0 && causas.length === selecionadas.length && !excedeu;
  const manual = selecionadas.some(causaEhManual);
  const contratos = contratosDeMetricaDoSnapshot(metricas);

  const opcoesSecao = () => secoes.map((s) => <option key={s.secao} value={s.secao}>{s.titulo}</option>);
  /**
   * A lista de métricas segue a plataforma JÁ escolhida naquela causa.
   * Sem isso, `platform: 'meta'` com uma métrica do Google é montável na tela,
   * e a ordem nasce impossível: o verificador procura o fato pelo par
   * (plataforma, métrica) e nunca o encontra. O defeito só apareceria no
   * worker, depois da recusa registrada.
   */
  const opcoesMetricas = (plataforma: string) => metricas
    .filter((m) => !plataforma || m.plataforma === plataforma)
    .map((m) => <option key={`${m.plataforma}:${m.id}`} value={m.id}>{m.rotulo} · {m.plataforma}</option>);
  const opcoesPlataforma = () => PLATAFORMAS_CAUSA.map((p) => <option key={p} value={p}>{p}</option>);

  return <PortalDoDialogo>
    <div className="dcp-modal" role="presentation"><div className="dcp-modal__caixa dcp-modal__caixa--causas" role="dialog" aria-modal="true" aria-labelledby={`${idBase}-titulo`} ref={caixa}>
      <h2 id={`${idBase}-titulo`} className="dcp-modal__titulo">Recusar o relatório de {relatorio.clienteNome}, {formatarCompetencia(relatorio.competencia)}</h2>
      <p className="dcp-modal__apoio">Escolha as causas que precisam ser corrigidas. A fábrica recebe estes campos estruturados; ela não interpreta texto livre.</p>
      <fieldset className="dcp-causas" disabled={registrando}><legend className="dcp-modal__rotulo">Causas da recusa</legend>
        {OPCOES_CAUSA_RECUSA.map((opcao, indice) => {
          const ativa = selecionadas.includes(opcao.id);
          const r = rascunhos[opcao.id] ?? {};
          return <div className={`dcp-causa${ativa ? ' dcp-causa--ativa' : ''}`} key={opcao.id}>
            <label className="dcp-causa__cabecalho"><input ref={indice === 0 ? primeiroControle : undefined} type="checkbox" checked={ativa} onChange={(e) => setSelecionadas((atual) => e.target.checked ? [...atual, opcao.id] : atual.filter((id) => id !== opcao.id))} /><span><strong>{opcao.titulo}</strong><small>{opcao.apoio}</small></span></label>
            {ativa && opcao.id === 'metrica_obrigatoria_ausente' && <div className="dcp-causa__campos"><select aria-label="Seção" value={String(r.section_id ?? '')} onChange={(e) => mudar(opcao.id, 'section_id', e.target.value)}><option value="">Seção…</option>{opcoesSecao()}</select><select aria-label="Plataforma" value={String(r.platform ?? '')} onChange={(e) => mudar(opcao.id, 'platform', e.target.value)}><option value="">Plataforma…</option>{opcoesPlataforma()}</select><select aria-label="Métrica" value={String(r.metric_id ?? '')} onChange={(e) => mudar(opcao.id, 'metric_id', e.target.value)}><option value="">Métrica…</option>{opcoesMetricas(String(r.platform ?? ''))}</select></div>}
            {ativa && opcao.id === 'periodo_medicao_incorreto' && <div className="dcp-causa__campos"><select aria-label="Plataforma" value={String(r.platform ?? '')} onChange={(e) => mudar(opcao.id, 'platform', e.target.value)}><option value="">Plataforma…</option>{opcoesPlataforma()}</select><select multiple aria-label="Seções" value={(r.section_ids as string[] | undefined) ?? []} onChange={(e) => mudar(opcao.id, 'section_ids', selecionados(e))}>{opcoesSecao()}</select><select multiple aria-label="Métricas" value={(r.metric_ids as string[] | undefined) ?? []} onChange={(e) => mudar(opcao.id, 'metric_ids', selecionados(e))}>{opcoesMetricas(String(r.platform ?? ''))}</select></div>}
            {ativa && opcao.id === 'resultado_fora_do_contrato' && <div className="dcp-causa__campos"><select aria-label="Plataforma" value={String(r.platform ?? '')} onChange={(e) => mudar(opcao.id, 'platform', e.target.value)}><option value="">Plataforma…</option>{opcoesPlataforma()}</select><select multiple aria-label="Seções" value={(r.section_ids as string[] | undefined) ?? []} onChange={(e) => mudar(opcao.id, 'section_ids', selecionados(e))}>{opcoesSecao()}</select></div>}
            {ativa && opcao.id === 'inconsistencia_entre_blocos' && <div className="dcp-causa__campos"><select aria-label="Contrato da métrica" value={String(r.metric_contract_id ?? '')} onChange={(e) => mudar(opcao.id, 'metric_contract_id', e.target.value)}><option value="">Contrato da métrica…</option>{contratos.map((c) => <option key={c.id} value={c.id}>{c.rotulo}</option>)}</select><select multiple aria-label="Blocos comparados" value={(r.section_ids as string[] | undefined) ?? []} onChange={(e) => mudar(opcao.id, 'section_ids', selecionados(e))}>{secoes.filter((s) => s.secao.startsWith('bloco:')).map((s) => <option key={s.secao} value={s.secao}>{s.titulo}</option>)}</select></div>}
            {ativa && opcao.id === 'apresentacao_visual' && <div className="dcp-causa__campos"><select multiple aria-label="Blocos visuais" value={(r.block_ids as string[] | undefined) ?? []} onChange={(e) => mudar(opcao.id, 'block_ids', selecionados(e))}>{secoes.filter((s) => s.secao.startsWith('bloco:')).map((s) => <option key={s.secao} value={s.secao.slice(6)}>{s.titulo}</option>)}</select><select aria-label="Viewport" value={String(r.viewport ?? 'ambos')} onChange={(e) => mudar(opcao.id, 'viewport', e.target.value)}><option value="desktop">Desktop</option><option value="mobile">Celular</option><option value="ambos">Ambos</option></select><textarea aria-label="Descrição visual" rows={3} maxLength={1000} placeholder="Descreva o problema visual com pelo menos 10 caracteres." value={String(r.description ?? '')} onChange={(e) => mudar(opcao.id, 'description', e.target.value)} /></div>}
            {ativa && opcao.id === 'outra_causa' && <div className="dcp-causa__campos"><textarea aria-label="Descrição da outra causa" rows={3} maxLength={1000} placeholder="Descreva a causa com pelo menos 10 caracteres." value={String(r.description ?? '')} onChange={(e) => mudar(opcao.id, 'description', e.target.value)} /><select multiple aria-label="Seções relacionadas" value={(r.section_ids as string[] | undefined) ?? []} onChange={(e) => mudar(opcao.id, 'section_ids', selecionados(e))}>{opcoesSecao()}</select></div>}
          </div>;
        })}
      </fieldset>
      {excedeu && <p className="dcp-modal__apoio" role="status"><strong>Causas demais.</strong> Escolha no máximo {MAXIMO_CAUSAS_RECUSA} causas nesta recusa.</p>}
      {manual && <p className="dcp-modal__apoio" role="status"><strong>Esta ordem será manual.</strong> Uma causa manual impede a correção automática da ordem inteira.</p>}
      <p className="dcp-decisao__eco">Vou registrar a RECUSA, assinada por {quem}, no catálogo {CATALOGO_CAUSAS_RECUSA}. Auditoria: “{completas ? resumoHumanoDasCausas(causas) : 'complete os campos das causas selecionadas'}”. Nada foi gravado ainda.</p>
      <div className="dcp-modal__acoes"><button type="button" className="dcp-botao dcp-botao--sinal" onClick={() => aoConfirmar(causas)} disabled={!completas || registrando}>{registrando ? 'Registrando…' : 'Registrar recusa'}</button><button type="button" className="dcp-botao dcp-botao--discreto" onClick={aoCancelar} disabled={registrando}>Cancelar</button></div>
    </div></div>
  </PortalDoDialogo>;
}
