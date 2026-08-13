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
    /**
     * Dois nomes no mesmo termo, de propósito. Parte da carteira lê "mensagens
     * iniciadas" e parte lê "conversas iniciadas" — é a mesma medida, e o
     * relatório de cada cliente usa a palavra que ele já reconhece. Criar dois
     * termos de glossário para isso seria justamente o que este arquivo existe
     * para impedir: duas redações da mesma explicação, para desencontrar mais
     * tarde.
     */
    termo: 'Mensagens iniciadas (ou conversas iniciadas)',
    texto:
      'Quantas conversas novas começaram a partir do anúncio. Conta a conversa que se inicia, não a venda que ela pode ter gerado depois.',
  },
  {
    id: 'custo_por_mensagem',
    termo: 'Custo por mensagem (ou por conversa)',
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
    id: 'conversoes',
    termo: 'Conversões',
    texto:
      'Quantas vezes alguém fez a ação que combinamos contar como resultado — abrir conversa, ligar, preencher formulário. A plataforma pode contar frações de conversão quando divide o crédito entre mais de um anúncio, e por isso o número às vezes não é inteiro.',
  },
  {
    id: 'custo_por_conversao',
    termo: 'Custo por conversão',
    texto: 'Quanto custou, em média, cada resultado obtido no período.',
  },
  /**
   * Os quatro termos de venda entraram com o primeiro relatório de e-commerce
   * montado pelo catálogo. Os três primeiros dizem, cada um do seu jeito, a
   * mesma coisa que o cliente precisa entender uma vez e nunca mais esquecer:
   * **a plataforma está contando o resultado dela mesma.** Duas plataformas
   * podem reivindicar a mesma venda, e nenhuma delas sabe o que a loja
   * registrou de fato.
   */
  {
    id: 'compras',
    termo: 'Compras atribuídas',
    texto:
      'Quantas compras a plataforma reconhece como resultado dos anúncios dela, dentro da janela de tempo que ela mesma declara. É a contagem da plataforma, e não o número de pedidos que a loja registrou.',
  },
  {
    id: 'receita_atribuida',
    termo: 'Receita atribuída',
    texto:
      'Quanto de venda a plataforma reivindica para si na janela dela. Duas plataformas podem reivindicar a mesma venda, então somar as receitas atribuídas não devolve o faturamento da loja.',
  },
  {
    id: 'roas',
    termo: 'ROAS — retorno sobre o investimento em anúncios',
    texto:
      'Quantos reais de receita a plataforma atribui a si para cada real investido nela. Como a receita é a que ela própria reivindica, o ROAS é a leitura da plataforma sobre o resultado dela.',
  },
  {
    id: 'custo_por_compra',
    termo: 'Custo por compra',
    texto:
      'Quanto foi investido, em média, para cada compra atribuída — sempre dentro do mesmo recorte mostrado ao lado do número.',
  },
  {
    id: 'cpc_medio',
    termo: 'CPC médio',
    texto:
      'O valor médio pago por clique, calculado pela própria plataforma sobre o período inteiro.',
  },
  {
    id: 'impressao_topo',
    termo: 'Aparições no topo',
    texto:
      'De cada cem vezes que o anúncio apareceu, em quantas ele ficou acima dos resultados normais da busca.',
  },
  {
    id: 'impressao_primeiro_lugar',
    termo: 'Aparições no primeiro lugar',
    texto:
      'De cada cem vezes que o anúncio apareceu, em quantas ele foi o primeiro anúncio da página.',
  },
  {
    id: 'tipo_conversao',
    termo: 'Tipo de conversão',
    texto:
      'A separação dos resultados por tipo de ação: conversa iniciada, ligação, formulário. Serve para saber por onde as pessoas preferem entrar em contato.',
  },
  {
    id: 'palavra_chave',
    termo: 'Palavra-chave',
    texto:
      'O termo que a gente comprou na busca. É diferente do termo de pesquisa, que é o que a pessoa realmente digitou antes de o anúncio aparecer.',
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
/**
 * Repetição some aqui, na primeira ocorrência, e não na montagem de cada
 * cliente. A Karyne provou o caso em 12/08: trocar `mensagens` por `conversoes`
 * na lista colidiu com um `conversoes` que já estava lá, e o cliente passou a
 * ler a mesma explicação duas vezes, com aviso de chave repetida no React.
 * Pedir cuidado a quem monta a lista resolveria uma vez; deduplicar resolve
 * para todo cliente, inclusive os que ainda não existem.
 */
export function termosDoGlossario(ids: string[]): TermoGlossario[] {
  const vistos = new Set<string>();
  const termos: TermoGlossario[] = [];
  for (const id of ids) {
    if (vistos.has(id)) continue;
    vistos.add(id);
    const termo = POR_ID.get(id);
    if (termo) termos.push(termo);
  }
  return termos;
}

export function termoDoGlossario(id: string): TermoGlossario | undefined {
  return POR_ID.get(id);
}
