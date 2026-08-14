import { formatarNumero, formatarParticipacao, formatarPeriodo } from '../format';
import type { FunilRelatorio } from './tipos';

/**
 * `transicaoId` é o nome antigo, que só o funil de e-commerce usava. A fábrica
 * unificou em `id`, mas snapshot gravado não muda: relatório persistido antes
 * disso continua chegando com o nome antigo, e some da tela se a leitura o
 * ignorar. Ler os dois não é indecisão de contrato — é o preço de documento
 * imutável.
 */
function idDoGargalo(funil: FunilRelatorio): string | null {
  return funil.gargalo?.id ?? funil.gargalo?.transicaoId ?? null;
}

export default function BlocoFunil({ funil }: { funil: FunilRelatorio }) {
  const gargaloId = idDoGargalo(funil);
  const transicoes = new Map(funil.transicoes.map((item) => [item.de, item]));

  return (
    <div className="dc-superficie dc-funil" data-funil={funil.id}>
      {funil.janela && (
        <p className="dc-funil__janela">
          <span>Janela analisada</span>
          <strong>{formatarPeriodo(funil.janela.inicio, funil.janela.fim)}</strong>
          {funil.janela.dias ? <span>· {funil.janela.dias} dias</span> : null}
        </p>
      )}

      <ol className="dc-funil__etapas" aria-label="Etapas do funil">
        {funil.etapas.map((etapa, indice) => {
          const transicao = transicoes.get(etapa.id);
          const ehGargalo = transicao?.id === gargaloId;
          return (
            <li className="dc-funil__passo" key={etapa.id}>
              <article className="dc-funil__etapa">
                <span className="dc-funil__ordem">{String(indice + 1).padStart(2, '0')}</span>
                <span className="dc-funil__rotulo">{etapa.rotulo}</span>
                <strong className="dc-funil__valor dc-numero">
                  {formatarNumero(etapa.valor, 'inteiro')}
                </strong>
              </article>

              {transicao && (
                <div
                  className="dc-funil__transicao"
                  data-gargalo={ehGargalo ? 'true' : 'false'}
                  aria-label={`${etapa.rotulo} para a próxima etapa`}
                >
                  <span className="dc-funil__seta" aria-hidden="true">→</span>
                  <span className="dc-funil__taxa">
                    {transicao.taxa == null ? 'taxa não calculável' : formatarParticipacao(transicao.taxa)}
                  </span>
                  {ehGargalo && <span className="dc-funil__gargalo">Maior gargalo</span>}
                </div>
              )}
            </li>
          );
        })}
      </ol>

      {(funil.desfechosAdicionais?.length ?? 0) > 0 && (
        <div className="dc-funil__desfechos" aria-label="Desfechos adicionais">
          {funil.desfechosAdicionais?.map((item) => (
            <article className="dc-funil__desfecho" key={item.id}>
              <span className="dc-funil__rotulo">{item.rotulo}</span>
              <strong className="dc-funil__valor dc-numero">
                {formatarNumero(item.valor, 'inteiro')}
              </strong>
              {item.observacao && <p>{item.observacao}</p>}
            </article>
          ))}
        </div>
      )}

      {funil.observacao && <p className="dc-funil__observacao">{funil.observacao}</p>}
    </div>
  );
}
