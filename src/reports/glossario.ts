/**
 * GLOSSÁRIO DAS MÉTRICAS — fonte única.
 *
 * Cinco dos seis relatórios validados trazem um glossário para o cliente, e
 * hoje a mesma métrica é explicada com redação diferente em cada um. O CPM
 * aparece descrito de quatro jeitos. Isso não é variedade: é quatro lugares
 * para atualizar quando a explicação melhorar, e três chances de esquecer.
 *
 * Aqui o texto é escrito **uma vez por métrica** e vale para todo cliente. A
 * montagem do relatório só diz QUAIS métricas explicar.
 *
 * Regras de redação, para quem for acrescentar:
 *
 *  • uma frase, em português de cliente — quem lê não trabalha com mídia;
 *  • diz o que a métrica MEDE, não se ela está boa ou ruim;
 *  • quando a métrica depende de uma escolha nossa (o CPC é o caso), a frase
 *    avisa que a fórmula está impressa junto da tabela, em vez de fingir que
 *    existe uma definição universal;
 *  • nada de sigla sem tradução na primeira aparição.
 */

export interface TermoGlossario {
  id: string;
  termo: string;
  texto: string;
}

const TERMOS: TermoGlossario[] = [
  {
    id: 'investimento',
    termo: 'Investimento',
    texto:
      'Quanto foi efetivamente gasto na plataforma no período, já com os impostos que ela cobra.',
  },
  {
    id: 'impressoes',
    termo: 'Impressões',
    texto:
      'Quantas vezes o anúncio apareceu na tela de alguém. Uma mesma pessoa pode ver várias vezes, então isso não é o número de pessoas alcançadas.',
  },
  {
    id: 'alcance',
    termo: 'Alcance',
    texto: 'Quantas pessoas diferentes viram o anúncio pelo menos uma vez no período.',
  },
  {
    id: 'cpm',
    termo: 'CPM — custo por mil impressões',
    texto:
      'Quanto custou, em média, aparecer mil vezes. Serve para comparar o preço do espaço de anúncio entre períodos e entre campanhas.',
  },
  {
    id: 'cliques',
    termo: 'Cliques',
    texto:
      'Quantas vezes alguém clicou no anúncio. A plataforma conta como clique também o toque em partes do anúncio que não levam ao site — por isso o número de cliques e o de visitas costumam ser diferentes.',
  },
  {
    id: 'cpc',
    termo: 'CPC — custo por clique',
    texto:
      'Quanto custou, em média, cada clique. A fórmula exata usada neste relatório está impressa embaixo da tabela, porque ela muda de cliente para cliente: uns contam só os cliques que levam ao destino, outros contam todos.',
  },
  {
    id: 'ctr',
    termo: 'Taxa de cliques',
    texto: 'De cada cem vezes que o anúncio apareceu, em quantas alguém clicou.',
  },
  {
    id: 'mensagens',
    termo: 'Mensagens iniciadas',
    texto:
      'Quantas conversas novas começaram a partir do anúncio. Conta a conversa que se inicia, não a venda que ela pode ter gerado depois.',
  },
  {
    id: 'custo_por_mensagem',
    termo: 'Custo por mensagem',
    texto:
      'Quanto custou, em média, cada conversa iniciada. Neste relatório o investimento usado na conta é sempre o do mesmo recorte mostrado ao lado — se o bloco é de uma campanha, é o investimento daquela campanha.',
  },
  {
    id: 'visitas_perfil',
    termo: 'Visitas ao perfil',
    texto:
      'Quantas vezes alguém abriu o perfil do Instagram depois de ver o anúncio. A Meta devolve esse número em qualquer campanha que passe pelo Instagram, inclusive nas que não foram feitas para isso — por isso ele só é apresentado como resultado onde a campanha realmente foi comprada para levar ao perfil.',
  },
  {
    id: 'custo_por_visita',
    termo: 'Custo por visita ao perfil',
    texto: 'Quanto custou, em média, cada visita ao perfil vinda do anúncio.',
  },
  {
    id: 'regiao',
    termo: 'Investimento por região',
    texto:
      'Onde o dinheiro foi aplicado, segundo a localização que a plataforma atribuiu a cada exibição. Uma parte pode aparecer como não determinada: é a própria plataforma dizendo que não soube identificar a região, e não uma falha da coleta.',
  },
];

const POR_ID = new Map(TERMOS.map((t) => [t.id, t]));

/**
 * Resolve os ids pedidos pela montagem. Id sem texto escrito é **omitido**,
 * nunca preenchido com o próprio id nem com texto genérico: um glossário que
 * inventa explicação é pior que um glossário incompleto.
 */
export function termosDoGlossario(ids: string[]): TermoGlossario[] {
  return ids.map((id) => POR_ID.get(id)).filter((t): t is TermoGlossario => Boolean(t));
}

export function termoDoGlossario(id: string): TermoGlossario | undefined {
  return POR_ID.get(id);
}
