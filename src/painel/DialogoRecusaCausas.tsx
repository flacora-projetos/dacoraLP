/**
 * O diálogo de recusa.
 *
 * Quem usa esta tela não é de mídia paga nem de banco de dados. O texto daqui
 * fala do RELATÓRIO, não do sistema: nada de "ordem", "fábrica", "contrato de
 * métrica" ou "catálogo v1". Esses nomes existem no banco e não ajudam ninguém
 * a decidir o que está errado numa página.
 *
 * Três decisões de forma que vieram de uso real:
 *
 * 1. As causas ficam em dois grupos separados, porque o que acontece depois
 *    delas é diferente: uma o sistema tenta consertar sozinho, a outra vai para
 *    uma pessoa. Misturar as seis numa lista só esconde a única diferença que
 *    muda o que vai acontecer com o relatório.
 * 2. Onde havia lista de seleção múltipla agora há caixinhas. Lista múltipla
 *    exige segurar Ctrl para marcar mais de um item, o que quase ninguém
 *    descobre sozinho e no celular nem funciona direito.
 * 3. O botão NÃO nasce desabilitado. Ele valida no clique e diz o que falta,
 *    porque botão apagado sem explicação faz a pessoa procurar o erro na tela
 *    inteira. Foi a reclamação que originou esta versão.
 */
import { useEffect, useId, useRef, useState } from 'react';
import { formatarCompetencia } from '../reports/format';
import PortalDoDialogo from './PortalDoDialogo';
import {
  MAXIMO_CAUSAS_RECUSA,
  OPCOES_CAUSA_RECUSA,
  PLATAFORMAS_CAUSA,
  causaEhManual,
  contratosDeMetricaDoSnapshot,
  type CausaRecusa,
  type IdCausaRecusa,
} from './causasRecusa';

export interface AlvoDaRecusa {
  clienteNome: string;
  competencia: string;
  secoesRecusaveis?: Array<{ secao: string; titulo: string }>;
  metricasRecusaveis?: Array<{ id: string; rotulo: string; plataforma: string }>;
}

const NOME_DA_PLATAFORMA: Record<string, string> = {
  meta: 'Meta Ads',
  google: 'Google Ads',
  instagram: 'Instagram',
  ga4: 'Google Analytics',
  crm: 'CRM',
  ecommerce: 'Loja',
  pinterest: 'Pinterest',
};

export default function DialogoRecusaCausas({
  relatorio,
  quem,
  aoConfirmar,
  aoCancelar,
  registrando,
  falha,
}: {
  relatorio: AlvoDaRecusa;
  quem: string;
  aoConfirmar: (causas: CausaRecusa[]) => void;
  aoCancelar: () => void;
  registrando: boolean;
  /** Mensagem de falha do servidor. Aparece AQUI, e não atrás do diálogo. */
  falha?: string | null;
}) {
  const idBase = useId();
  const caixa = useRef<HTMLDivElement | null>(null);
  const primeiroControle = useRef<HTMLInputElement | null>(null);
  const avisoRef = useRef<HTMLParagraphElement | null>(null);
  const [selecionadas, setSelecionadas] = useState<IdCausaRecusa[]>([]);
  const [rascunhos, setRascunhos] = useState<Record<string, Record<string, unknown>>>({});
  const [pendencias, setPendencias] = useState<string[]>([]);

  const secoes = relatorio.secoesRecusaveis ?? [];
  const blocos = secoes.filter((item) => item.secao.startsWith('bloco:'));
  const metricas = relatorio.metricasRecusaveis ?? [];
  const contratos = contratosDeMetricaDoSnapshot(metricas);

  useEffect(() => { primeiroControle.current?.focus(); }, []);
  useEffect(() => {
    function aoTeclar(evento: KeyboardEvent) {
      if (evento.key === 'Escape') { evento.preventDefault(); aoCancelar(); return; }
      if (evento.key !== 'Tab' || !caixa.current) return;
      const focaveis = [...caixa.current.querySelectorAll<HTMLElement>('button, input, textarea, select, a[href]')]
        .filter((elemento) => !elemento.hasAttribute('disabled'));
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
    setPendencias([]);
    setRascunhos((atual) => {
      const anterior = atual[id] ?? {};
      // Trocar a plataforma limpa a métrica já escolhida: filtrar a lista não
      // basta, porque o rascunho antigo sobrevive à troca e sairia daqui um par
      // impossível, que só falharia bem depois, longe de quem escolheu.
      const limpo = campo === 'plataforma' && valor !== anterior.plataforma
        ? { ...anterior, metrica: undefined, metricas: undefined }
        : anterior;
      return { ...atual, [id]: { ...limpo, [campo]: valor } };
    });
  }

  function alternarNaLista(id: IdCausaRecusa, campo: string, valor: string, marcado: boolean) {
    const atual = (rascunhos[id]?.[campo] as string[] | undefined) ?? [];
    mudar(id, campo, marcado ? [...atual, valor] : atual.filter((item) => item !== valor));
  }

  function marcada(id: IdCausaRecusa, campo: string, valor: string) {
    return ((rascunhos[id]?.[campo] as string[] | undefined) ?? []).includes(valor);
  }

  /** Devolve a causa pronta, ou o que ainda falta preencher nela. */
  function montar(id: IdCausaRecusa): { causa: CausaRecusa } | { falta: string } {
    const r = rascunhos[id] ?? {};
    const texto = (campo: string) => String(r[campo] ?? '').trim();
    const lista = (campo: string) => ((r[campo] as string[] | undefined) ?? []);
    const titulo = OPCOES_CAUSA_RECUSA.find((item) => item.id === id)?.titulo ?? id;

    if (id === 'metrica_obrigatoria_ausente') {
      if (!texto('plataforma')) return { falta: `${titulo}: escolha a plataforma.` };
      if (!texto('metrica')) return { falta: `${titulo}: escolha qual número está faltando.` };
      if (!texto('secao')) return { falta: `${titulo}: escolha em que parte do relatório isso aparece.` };
      return { causa: { causeId: id, parameters: {
        section_id: texto('secao'), platform: texto('plataforma'), metric_id: texto('metrica'),
      } } };
    }
    if (id === 'periodo_medicao_incorreto') {
      if (!texto('plataforma')) return { falta: `${titulo}: escolha a plataforma.` };
      if (lista('metricas').length === 0) return { falta: `${titulo}: marque ao menos um número com período errado.` };
      if (lista('secoes').length === 0) return { falta: `${titulo}: marque ao menos uma parte do relatório.` };
      return { causa: { causeId: id, parameters: {
        platform: texto('plataforma'), section_ids: lista('secoes'), metric_ids: lista('metricas'),
      } } };
    }
    if (id === 'resultado_fora_do_contrato') {
      if (!texto('plataforma')) return { falta: `${titulo}: escolha a plataforma.` };
      if (lista('secoes').length === 0) return { falta: `${titulo}: marque ao menos uma parte do relatório.` };
      return { causa: { causeId: id, parameters: {
        platform: texto('plataforma'), section_ids: lista('secoes'),
      } } };
    }
    if (id === 'inconsistencia_entre_blocos') {
      if (!texto('contrato')) return { falta: `${titulo}: escolha qual número aparece diferente.` };
      if (lista('secoes').length < 2) return { falta: `${titulo}: marque pelo menos duas partes para comparar.` };
      return { causa: { causeId: id, parameters: {
        metric_contract_id: texto('contrato'), section_ids: lista('secoes'),
      } } };
    }
    if (id === 'apresentacao_visual') {
      if (lista('blocos').length === 0) return { falta: `${titulo}: marque onde está o problema.` };
      if (texto('descricao').length < 10) return { falta: `${titulo}: descreva o problema em pelo menos 10 letras.` };
      return { causa: { causeId: id, parameters: {
        block_ids: lista('blocos').map((secao) => secao.slice('bloco:'.length)),
        viewport: texto('tela') || 'ambos',
        description: texto('descricao'),
      } } };
    }
    if (texto('descricao').length < 10) return { falta: `${titulo}: descreva o problema em pelo menos 10 letras.` };
    const secoesOutra = lista('secoes');
    return { causa: { causeId: id, parameters: secoesOutra.length
      ? { description: texto('descricao'), section_ids: secoesOutra }
      : { description: texto('descricao') } } };
  }

  function registrar() {
    const faltando: string[] = [];
    const prontas: CausaRecusa[] = [];
    if (selecionadas.length === 0) faltando.push('Marque pelo menos um problema.');
    if (selecionadas.length > MAXIMO_CAUSAS_RECUSA) {
      faltando.push(`Marque no máximo ${MAXIMO_CAUSAS_RECUSA} problemas de uma vez.`);
    }
    for (const id of selecionadas) {
      const resultado = montar(id);
      if ('falta' in resultado) faltando.push(resultado.falta);
      else prontas.push(resultado.causa);
    }
    if (faltando.length > 0) {
      setPendencias(faltando);
      // Levar o foco para o aviso: sem isso, quem usa teclado ou leitor de tela
      // clica no botão e nada parece acontecer.
      window.requestAnimationFrame(() => avisoRef.current?.focus());
      return;
    }
    setPendencias([]);
    aoConfirmar(prontas);
  }

  const manual = selecionadas.some(causaEhManual);
  const automaticas = OPCOES_CAUSA_RECUSA.filter((opcao) => !opcao.manual);
  const manuais = OPCOES_CAUSA_RECUSA.filter((opcao) => opcao.manual);

  function campoDeSecoes(id: IdCausaRecusa, campo: string, rotulo: string, itens = secoes) {
    return (
      <fieldset className="dcp-causa__grupo">
        <legend>{rotulo}</legend>
        <div className="dcp-causa__caixinhas">
          {itens.map((item) => (
            <label key={item.secao} className="dcp-causa__caixinha">
              <input
                type="checkbox"
                checked={marcada(id, campo, item.secao)}
                onChange={(evento) => alternarNaLista(id, campo, item.secao, evento.target.checked)}
              />
              <span>{item.titulo}</span>
            </label>
          ))}
        </div>
      </fieldset>
    );
  }

  function campoDePlataforma(id: IdCausaRecusa) {
    return (
      <p className="dcp-causa__campo">
        <label htmlFor={`${idBase}-${id}-plataforma`}>Onde isso aparece</label>
        <select
          id={`${idBase}-${id}-plataforma`}
          value={String(rascunhos[id]?.plataforma ?? '')}
          onChange={(evento) => mudar(id, 'plataforma', evento.target.value)}
        >
          <option value="">Escolha a plataforma…</option>
          {PLATAFORMAS_CAUSA.map((p) => <option key={p} value={p}>{NOME_DA_PLATAFORMA[p] ?? p}</option>)}
        </select>
      </p>
    );
  }

  function metricasDaPlataforma(id: IdCausaRecusa) {
    const plataforma = String(rascunhos[id]?.plataforma ?? '');
    return metricas.filter((m) => !plataforma || m.plataforma === plataforma);
  }

  function corpoDaCausa(id: IdCausaRecusa) {
    if (id === 'metrica_obrigatoria_ausente') {
      return (
        <>
          {campoDePlataforma(id)}
          <p className="dcp-causa__campo">
            <label htmlFor={`${idBase}-${id}-metrica`}>Qual número está faltando</label>
            <select
              id={`${idBase}-${id}-metrica`}
              value={String(rascunhos[id]?.metrica ?? '')}
              onChange={(evento) => mudar(id, 'metrica', evento.target.value)}
            >
              <option value="">Escolha o número…</option>
              {metricasDaPlataforma(id).map((m) => (
                <option key={`${m.plataforma}:${m.id}`} value={m.id}>{m.rotulo}</option>
              ))}
            </select>
          </p>
          <p className="dcp-causa__campo">
            <label htmlFor={`${idBase}-${id}-secao`}>Em que parte do relatório</label>
            <select
              id={`${idBase}-${id}-secao`}
              value={String(rascunhos[id]?.secao ?? '')}
              onChange={(evento) => mudar(id, 'secao', evento.target.value)}
            >
              <option value="">Escolha a parte…</option>
              {secoes.map((s) => <option key={s.secao} value={s.secao}>{s.titulo}</option>)}
            </select>
          </p>
        </>
      );
    }

    if (id === 'periodo_medicao_incorreto') {
      return (
        <>
          {campoDePlataforma(id)}
          <fieldset className="dcp-causa__grupo">
            <legend>Quais números estão no período errado</legend>
            <div className="dcp-causa__caixinhas">
              {metricasDaPlataforma(id).map((m) => (
                <label key={`${m.plataforma}:${m.id}`} className="dcp-causa__caixinha">
                  <input
                    type="checkbox"
                    checked={marcada(id, 'metricas', m.id)}
                    onChange={(evento) => alternarNaLista(id, 'metricas', m.id, evento.target.checked)}
                  />
                  <span>{m.rotulo}</span>
                </label>
              ))}
            </div>
          </fieldset>
          {campoDeSecoes(id, 'secoes', 'Em que partes do relatório')}
        </>
      );
    }

    if (id === 'resultado_fora_do_contrato') {
      return (
        <>
          {campoDePlataforma(id)}
          {campoDeSecoes(id, 'secoes', 'Em que partes do relatório')}
        </>
      );
    }

    if (id === 'inconsistencia_entre_blocos') {
      return (
        <>
          <p className="dcp-causa__campo">
            <label htmlFor={`${idBase}-${id}-contrato`}>Qual número aparece diferente</label>
            <select
              id={`${idBase}-${id}-contrato`}
              value={String(rascunhos[id]?.contrato ?? '')}
              onChange={(evento) => mudar(id, 'contrato', evento.target.value)}
            >
              <option value="">Escolha o número…</option>
              {contratos.map((c) => <option key={c.id} value={c.id}>{c.rotulo}</option>)}
            </select>
          </p>
          {campoDeSecoes(id, 'secoes', 'Em quais partes ele não bate (marque pelo menos duas)', blocos)}
        </>
      );
    }

    if (id === 'apresentacao_visual') {
      return (
        <>
          {campoDeSecoes(id, 'blocos', 'Onde está o problema', blocos)}
          <p className="dcp-causa__campo">
            <label htmlFor={`${idBase}-${id}-tela`}>Em qual tela</label>
            <select
              id={`${idBase}-${id}-tela`}
              value={String(rascunhos[id]?.tela ?? 'ambos')}
              onChange={(evento) => mudar(id, 'tela', evento.target.value)}
            >
              <option value="ambos">Computador e celular</option>
              <option value="desktop">Só no computador</option>
              <option value="mobile">Só no celular</option>
            </select>
          </p>
          <p className="dcp-causa__campo">
            <label htmlFor={`${idBase}-${id}-descricao`}>O que você está vendo</label>
            <textarea
              id={`${idBase}-${id}-descricao`}
              rows={3}
              maxLength={1000}
              placeholder="Ex.: o título da tabela fica por cima do número…"
              value={String(rascunhos[id]?.descricao ?? '')}
              onChange={(evento) => mudar(id, 'descricao', evento.target.value)}
            />
          </p>
        </>
      );
    }

    return (
      <>
        <p className="dcp-causa__campo">
          <label htmlFor={`${idBase}-${id}-descricao`}>O que precisa mudar</label>
          <textarea
            id={`${idBase}-${id}-descricao`}
            rows={3}
            maxLength={1000}
            placeholder="Escreva com suas palavras o que está errado…"
            value={String(rascunhos[id]?.descricao ?? '')}
            onChange={(evento) => mudar(id, 'descricao', evento.target.value)}
          />
        </p>
        {campoDeSecoes(id, 'secoes', 'Em que partes do relatório (opcional)')}
      </>
    );
  }

  function listaDeCausas(opcoes: typeof OPCOES_CAUSA_RECUSA, primeiroGrupo: boolean) {
    return opcoes.map((opcao, indice) => {
      const ativa = selecionadas.includes(opcao.id);
      return (
        <div className={`dcp-causa${ativa ? ' dcp-causa--ativa' : ''}`} key={opcao.id}>
          <label className="dcp-causa__cabecalho">
            <input
              ref={primeiroGrupo && indice === 0 ? primeiroControle : undefined}
              type="checkbox"
              checked={ativa}
              onChange={(evento) => {
                setPendencias([]);
                setSelecionadas((atual) => evento.target.checked
                  ? [...atual, opcao.id]
                  : atual.filter((id) => id !== opcao.id));
              }}
            />
            <span>
              <strong>{opcao.titulo}</strong>
              <small>{opcao.apoio}</small>
            </span>
          </label>
          {ativa && <div className="dcp-causa__campos">{corpoDaCausa(opcao.id)}</div>}
        </div>
      );
    });
  }

  return (
    <PortalDoDialogo>
      <div className="dcp-modal" role="presentation">
        <div
          className="dcp-modal__caixa dcp-modal__caixa--causas"
          role="dialog"
          aria-modal="true"
          aria-labelledby={`${idBase}-titulo`}
          ref={caixa}
        >
          <header className="dcp-causas__topo">
            <h2 id={`${idBase}-titulo`} className="dcp-modal__titulo">
              O que precisa mudar no relatório de {relatorio.clienteNome}?
            </h2>
            <p className="dcp-modal__apoio">
              {formatarCompetencia(relatorio.competencia)}. Marque o que está errado. O relatório
              volta para você depois de corrigido.
            </p>
          </header>

          <div className="dcp-causas__corpo">
            <section className="dcp-causas__grupo">
              <h3>O sistema tenta corrigir sozinho</h3>
              {listaDeCausas(automaticas, true)}
            </section>

            <section className="dcp-causas__grupo">
              <h3>Precisa de alguém olhando</h3>
              {listaDeCausas(manuais, false)}
            </section>
          </div>

          <footer className="dcp-causas__rodape">
            {manual && (
              <p className="dcp-causas__nota" role="status">
                Você marcou um problema da segunda parte, então o relatório inteiro vai para
                correção manual. Nada será refeito automaticamente.
              </p>
            )}

            {pendencias.length > 0 && (
              <p className="dcp-causas__aviso" role="alert" tabIndex={-1} ref={avisoRef}>
                {pendencias.length === 1 ? pendencias[0] : `Falta preencher: ${pendencias.join(' ')}`}
              </p>
            )}

            {falha && <p className="dcp-causas__aviso" role="alert">{falha}</p>}

            <p className="dcp-causas__eco">
              Vou registrar a recusa em seu nome ({quem}). Nada foi gravado ainda.
            </p>

            <div className="dcp-modal__acoes">
              <button
                type="button"
                className="dcp-botao dcp-botao--sinal"
                onClick={registrar}
                disabled={registrando}
              >
                {registrando ? 'Registrando…' : 'Registrar recusa'}
              </button>
              <button
                type="button"
                className="dcp-botao dcp-botao--discreto"
                onClick={aoCancelar}
                disabled={registrando}
              >
                Cancelar
              </button>
            </div>
          </footer>
        </div>
      </div>
    </PortalDoDialogo>
  );
}
