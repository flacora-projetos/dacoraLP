/**
 * Relatório montado a partir do CATÁLOGO DE BLOCOS.
 *
 * É o caminho da W0 depois da mudança de abordagem: em vez de propor um
 * formato novo e perguntar "você gostou?", reproduzir os relatórios que a
 * Fernanda já entrega e valida, e perguntar "está fiel?".
 *
 * A fidelidade combinada é de **informação, não de pixel**: mesmas seções,
 * mesmas métricas, mesma ordem; a forma é nossa. E ela tem um limite explícito
 * — **as regras da casa não se dobram à fidelidade**. Onde o relatório de
 * origem transforma ausência em zero, imprime status cru de API em inglês ou
 * mistura escopos numa mesma faixa de números, nós apontamos em vez de copiar.
 *
 * Este componente é curto de propósito. Ele não sabe o que é uma campanha, uma
 * região ou um criativo: percorre a montagem, pede ao catálogo que renderize
 * cada bloco e entrega a lista de seções ao esqueleto. Toda a inteligência de
 * apresentação está nos blocos, e todo o dado está no snapshot.
 */

import { useMemo, type ReactNode } from 'react';

import type { CompetenciaDisponivel } from './snapshot';
import { criarChartTheme, type PropostaId } from './charts/chartTheme';
import Esqueleto, { type SecaoRelatorio } from './Esqueleto';
import { renderizarBloco } from './blocos/catalogo';
import type { SnapshotMontado } from './blocos/tipos';
import {
  aplicarIntroducaoAprovada,
  introducaoDasAnalises,
  paragrafosDaAnalise,
  type AnalisePublicada,
} from './analisePublicada';

interface Props {
  snapshot: SnapshotMontado;
  competencias: CompetenciaDisponivel[];
  proposta: PropostaId;
  demo?: { rotulo: string; href: string; descricao: string };
  introducaoDaRevisao?: ReactNode;
  analiseDaSecao?: (secao: `bloco:${string}`) => ReactNode;
  /** Vem apenas da view pública já amarrada ao fechamento AV4. */
  observacoesPublicas?: Array<{ secao: string; texto: string }>;
  /**
   * A análise humana aprovada, também amarrada ao fechamento AV4.
   *
   * Diferente da observação: a observação é um recado avulso escrito para o
   * cliente; esta é a análise da seção, que quem revisa escreve, edita e
   * aprova. Até 04/09/2026 ela não chegava aqui — ver `analisePublicada.ts`.
   */
  analisesPublicadas?: AnalisePublicada[];
}

export default function RelatorioMontado({ snapshot, competencias, proposta, demo, introducaoDaRevisao, analiseDaSecao, observacoesPublicas = [], analisesPublicadas = [] }: Props) {
  const theme = useMemo(() => criarChartTheme(proposta), [proposta]);

  /* A introdução aprovada ENTRA NO LUGAR da leitura automática, como já
     acontecia na prévia de quem revisa. A regra mora em `analisePublicada.ts`
     justamente para as duas não poderem divergir. */
  const snapshotPublicado = useMemo(
    () => aplicarIntroducaoAprovada(snapshot, introducaoDasAnalises(analisesPublicadas)),
    [snapshot, analisesPublicadas],
  );

  const secoes: SecaoRelatorio[] = useMemo(() => {
    /**
     * Os rótulos de plataforma saem das FONTES, não de uma lista de canais: a
     * fonte é quem já declara "Meta Ads" com a conta consultada e a situação da
     * coleta. Manter duas listas de nome de plataforma seria criar duas
     * verdades para a mesma coisa.
     */
    const rotulosPlataforma = Object.fromEntries(
      snapshot.fontes.map((fonte) => [fonte.plataforma, fonte.rotulo]),
    );

    const analiseAprovadaDa = (secao: string) => analisesPublicadas
      .filter((analise) => analise.secao === secao)
      .map((analise, indice) => (
        <aside className="dc-analise-publicada" key={`analise-${secao}-${indice}`}>
          {paragrafosDaAnalise(analise.texto).map((paragrafo, posicao) => (
            <p key={`${secao}-${indice}-${posicao}`}>{paragrafo}</p>
          ))}
        </aside>
      ));

    return snapshot.montagem
      .map((config) => {
        const conteudo = renderizarBloco(config, {
          dados: snapshot.dados,
          theme,
          rotulosPlataforma,
        });
        return {
          id: config.id,
          titulo: config.titulo,
          apoio: config.apoio,
          nota: config.nota,
          conteudo: conteudo === null ? null : <>{conteudo}{analiseAprovadaDa(`bloco:${config.id}`)}{analiseDaSecao?.(`bloco:${config.id}`)}{observacoesPublicas.filter((observacao) => observacao.secao === `bloco:${config.id}`).map((observacao, indice) => <aside className="dc-observacao-publica" key={`${config.id}-${indice}`}><strong>Observação</strong><p>{observacao.texto}</p></aside>)}</>,
        };
      })
      /**
       * Bloco que devolve nada sai da lista antes da numeração. Hoje só o B8
       * faz isso, e de propósito: comentário humano é opcional de verdade, e
       * um mês sem comentário não pode deixar um número de seção órfão nem um
       * título com o corpo vazio embaixo.
       */
      .filter((secao) => secao.conteudo !== null);
  }, [analiseDaSecao, analisesPublicadas, snapshot, theme]);

  return (
    <Esqueleto
      snapshot={snapshotPublicado}
      competencias={competencias}
      proposta={proposta}
      secoes={secoes}
      demo={demo}
      introducaoDaRevisao={<>{introducaoDaRevisao}{observacoesPublicas.filter((observacao) => observacao.secao === 'introducao' || observacao.secao === 'relatorio_inteiro').map((observacao, indice) => <aside className="dc-observacao-publica" key={`${observacao.secao}-${indice}`}><strong>Observação</strong><p>{observacao.texto}</p></aside>)}</>}
    />
  );
}
