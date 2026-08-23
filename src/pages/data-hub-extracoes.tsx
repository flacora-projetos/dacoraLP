import { useMemo, useState } from 'react';
import {
  BREAKDOWNS,
  CAMPOS,
  CONTAS,
  GRANULARIDADES,
  NIVEIS,
  PERIODOS,
  RASCUNHO_INICIAL,
  avisoDeVolume,
  impedimentos,
  naturezaDosCamposEscolhidos,
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
 * Extração criada nesta fase existe só na memória desta aba. A PWI1 não toca
 * em backend remoto, então a tela precisa dizer isso na cara do usuário: uma
 * lista que parece salva e some no F5 é pior do que uma lista vazia.
 */
export type ExtracaoLocal = { id: string; nome: string; resumo: string };

const ETAPAS = ['Origem', 'Campos', 'Período', 'Revisão'] as const;

export function ListaDeExtracoes({ extracoes, aoCriar }: { extracoes: readonly ExtracaoLocal[]; aoCriar: () => void }) {
  return (
    <section className="dch-lista" aria-labelledby="lista-titulo">
      <div className="dch-lista__topo">
        <div>
          <p className="dcp-eyebrow">Suas extrações</p>
          <h1 id="lista-titulo">Dados de marketing, sob controle.</h1>
        </div>
        <button type="button" className="dcp-botao dcp-botao--primario" onClick={aoCriar}>Criar extração</button>
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
        <>
          <p className="dch-aviso-local" role="status">
            Rascunhos desta fase existem só nesta aba e somem ao recarregar a página. Salvar no servidor chega na
            próxima etapa.
          </p>
          <ul className="dch-cartoes">
            {extracoes.map((extracao) => (
              <li key={extracao.id} className="dcp-secao dch-cartao">
                <h2 className="dcp-secao__titulo">{extracao.nome}</h2>
                <p className="dcp-secao__apoio">{extracao.resumo}</p>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

export function CriadorDeExtracao({
  aoCancelar,
  aoConcluir,
}: {
  aoCancelar: () => void;
  aoConcluir: (extracao: ExtracaoLocal) => void;
}) {
  const [etapa, setEtapa] = useState(0);
  const [rascunho, setRascunho] = useState<Rascunho>(RASCUNHO_INICIAL);

  const problemas = useMemo(() => impedimentos(rascunho), [rascunho]);
  const aviso = useMemo(() => avisoDeVolume(rascunho), [rascunho]);
  const naturezas = useMemo(() => naturezaDosCamposEscolhidos(rascunho), [rascunho]);
  const conta = CONTAS.find((item) => item.id === rascunho.contaId);
  const periodo = PERIODOS.find((item) => item.id === rascunho.periodoId);
  const breakdown = BREAKDOWNS.find((item) => item.id === rascunho.breakdownId);
  const nivel = NIVEIS.find((item) => item.id === rascunho.nivel);
  const granularidade = GRANULARIDADES.find((item) => item.id === rascunho.granularidade);
  const naoAditivos = naturezas.filter((campo) => campo.natureza !== 'aditiva');

  function alternarCampo(id: string) {
    setRascunho((atual) => ({
      ...atual,
      campos: atual.campos.includes(id) ? atual.campos.filter((campo) => campo !== id) : [...atual.campos, id],
    }));
  }

  return (
    <section className="dch-criador" aria-labelledby="criador-titulo">
      <div className="dch-criador__cabecalho">
        <div>
          <p className="dcp-eyebrow">Nova extração</p>
          <h1 id="criador-titulo">Monte sua consulta.</h1>
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
              <h2>Origem dos dados</h2>
              <p className="dch-formulario__apoio">
                Contas de demonstração. O catálogo real chega quando o portal passar a ler o Data Hub.
              </p>
              <label className="dch-campo" htmlFor="conta">
                <span>Conta</span>
                <select
                  id="conta"
                  value={rascunho.contaId}
                  onChange={(evento) => setRascunho((atual) => ({ ...atual, contaId: evento.target.value }))}
                >
                  <option value="">Escolha uma conta</option>
                  {CONTAS.map((item) => (
                    <option key={item.id} value={item.id}>{item.nome}</option>
                  ))}
                </select>
              </label>
              <label className="dch-campo" htmlFor="nivel">
                <span>Nível</span>
                <select
                  id="nivel"
                  value={rascunho.nivel}
                  onChange={(evento) => setRascunho((atual) => ({ ...atual, nivel: evento.target.value as NivelEntidade }))}
                >
                  {NIVEIS.map((item) => (
                    <option key={item.id} value={item.id}>{item.nome}</option>
                  ))}
                </select>
              </label>
            </>
          ) : null}

          {etapa === 1 ? (
            <>
              <h2>Campos e recorte</h2>
              <fieldset className="dch-fieldset">
                <legend>Campos</legend>
                <div className="dch-opcoes">
                  {CAMPOS.map((campo) => (
                    <label key={campo.id} className="dch-opcao">
                      <input
                        type="checkbox"
                        checked={rascunho.campos.includes(campo.id)}
                        onChange={() => alternarCampo(campo.id)}
                      />
                      <span>{campo.nome}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <label className="dch-campo" htmlFor="breakdown">
                <span>Breakdown</span>
                <select
                  id="breakdown"
                  value={rascunho.breakdownId}
                  onChange={(evento) => setRascunho((atual) => ({ ...atual, breakdownId: evento.target.value }))}
                >
                  {BREAKDOWNS.map((item) => (
                    <option key={item.id} value={item.id}>{item.nome}</option>
                  ))}
                </select>
              </label>
            </>
          ) : null}

          {etapa === 2 ? (
            <>
              <h2>Período e granularidade</h2>
              <p className="dch-formulario__apoio">
                Período é o intervalo consultado. Granularidade é o tamanho de cada linha dentro dele. São controles
                independentes.
              </p>
              <label className="dch-campo" htmlFor="periodo">
                <span>Período</span>
                <select
                  id="periodo"
                  value={rascunho.periodoId}
                  onChange={(evento) => setRascunho((atual) => ({ ...atual, periodoId: evento.target.value }))}
                >
                  {PERIODOS.map((item) => (
                    <option key={item.id} value={item.id}>{item.nome}</option>
                  ))}
                </select>
              </label>
              <label className="dch-campo" htmlFor="granularidade">
                <span>Granularidade</span>
                <select
                  id="granularidade"
                  value={rascunho.granularidade}
                  onChange={(evento) => setRascunho((atual) => ({ ...atual, granularidade: evento.target.value as Granularidade }))}
                >
                  {GRANULARIDADES.map((item) => (
                    <option key={item.id} value={item.id}>{item.nome}</option>
                  ))}
                </select>
              </label>
            </>
          ) : null}

          {etapa === 3 ? (
            <>
              <h2>Revisão</h2>
              <dl className="dch-revisao">
                <div><dt>Conta</dt><dd>{conta?.nome ?? 'Não escolhida'}</dd></div>
                <div><dt>Nível</dt><dd>{nivel?.nome ?? '—'}</dd></div>
                <div><dt>Campos</dt><dd>{naturezas.length > 0 ? naturezas.map((campo) => campo.nome).join(', ') : 'Nenhum'}</dd></div>
                <div><dt>Breakdown</dt><dd>{breakdown?.nome ?? '—'}</dd></div>
                <div><dt>Período</dt><dd>{periodo?.nome ?? '—'}</dd></div>
                <div><dt>Granularidade</dt><dd>{granularidade?.nome ?? '—'}</dd></div>
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

          <div className="dch-resumo__estado" aria-live="polite">
            {problemas.length > 0 ? (
              <ul className="dch-impedimentos">
                {problemas.map((problema) => (
                  <li key={problema.campo} className="dcp-erro">{problema.mensagem}</li>
                ))}
              </ul>
            ) : (
              <p className="dch-resumo__ok">Combinação válida.</p>
            )}
            {aviso ? <p className="dcp-nota">{aviso}</p> : null}
          </div>

          <div className="dch-resumo__acoes">
            <button
              type="button"
              className="dcp-botao dcp-botao--discreto"
              disabled={etapa === 0}
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
                disabled={problemas.length > 0}
                onClick={() =>
                  aoConcluir({
                    id: `local-${Date.now()}`,
                    nome: `${conta?.nome ?? 'Conta'} — ${nivel?.nome ?? ''}`.trim(),
                    resumo: `${rascunho.campos.length} campos · ${periodo?.nome ?? ''} · ${granularidade?.nome ?? ''} · ${breakdown?.nome ?? ''}`,
                  })
                }
              >
                Concluir rascunho
              </button>
            )}
          </div>
          <p className="dch-resumo__nota">Nada é salvo no servidor nesta fase.</p>
        </aside>
      </div>
    </section>
  );
}
