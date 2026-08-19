/**
 * Prova que texto e número não se atropelam nos relatórios.
 *
 * Nasceu de dois prints do Flávio em 2026-08-19, tirados de relatórios REAIS de
 * agosto:
 *
 *  1. na evolução mensal, o rótulo do mês de uma conta que mede mais de uma
 *     conversão — "Maio · resultados diferentes: Conversas iniciadas + Visitas
 *     ao perfil" — impresso POR BAIXO do valor "R$ 31,92". Texto em SVG não
 *     quebra, não corta e não empurra nada: os dois se sobrepõem e perdem-se os
 *     dois;
 *  2. na faixa de indicadores, "R$ 231.866,54" atravessando a borda do cartão.
 *
 * Os casos usados aqui são os REAIS medidos na carteira, não inventados:
 * **16 clientes** publicam o rótulo de conversão múltipla em agosto/2026, o mais
 * longo com 84 caracteres (Make Plant), e o número que vazava é o do Hannover
 * Fondue.
 *
 * Por que script e não conferência em tela: a colisão é geometria, e geometria
 * se prova com aritmética. A conferência no navegador achou o defeito uma vez e
 * ficou intermitente depois — teste que às vezes não roda não protege nada.
 */

import {
  ALTURA_DA_LINHA,
  LARGURA_POR_CARACTERE,
  planejarRotulagem,
  quebrarRotulo,
} from '../src/reports/charts/rotulos';

let falhas = 0;
function conferir(nome: string, condicao: boolean, detalhe = '') {
  if (condicao) {
    console.log(`  ok   ${nome}`);
    return;
  }
  falhas += 1;
  console.error(`  FALHA ${nome}${detalhe ? ` — ${detalhe}` : ''}`);
}

/* ------------------------------------------------------------------ */
/* Os rótulos reais de agosto/2026                                     */
/* ------------------------------------------------------------------ */

const ROTULO_MAIS_LONGO =
  'Junho · resultados diferentes: Conversas iniciadas + Leads de formulário + Visitas ao perfil';
const ROTULO_DO_PRINT = 'Maio · resultados diferentes: Conversas iniciadas + Visitas ao perfil';
const ROTULO_CURTO = 'Julho · resultado: Visitas ao perfil';

/** Dois painéis lado a lado num relatório de 1.280 px. */
const LARGURA_DO_PAINEL = 380;
const TAMANHO_ROTULO = 11.5;
const TAMANHO_VALOR = 13.5;
const ESPACAMENTO = 0.02;

const larguraDe = (texto: string, fonte: number, espacamento = 0) =>
  texto.length * fonte * (LARGURA_POR_CARACTERE + espacamento);

console.log('\nEvolução mensal — rótulo e valor na mesma barra');

{
  const itens = [
    { rotulo: ROTULO_DO_PRINT, valor: 'R$ 31,92' },
    { rotulo: 'Junho · resultados diferentes: Conversas iniciadas + Visitas ao perfil', valor: 'R$ 1.253,85' },
    { rotulo: ROTULO_CURTO, valor: 'R$ 1.214,02' },
    { rotulo: 'Agosto · resultados diferentes: Conversas iniciadas + Visitas ao perfil', valor: 'indisponível' },
  ];
  const plano = planejarRotulagem({
    itens,
    larguraPlot: LARGURA_DO_PAINEL,
    tamanhoRotulo: TAMANHO_ROTULO,
    tamanhoValor: TAMANHO_VALOR,
    espacamento: ESPACAMENTO,
  });

  conferir('o caso do print empilha em vez de escrever por cima', plano.empilhado);

  // A regra que o defeito violava: NENHUMA linha do rótulo pode dividir a linha
  // do valor. O valor fica em 0; as linhas do rótulo, em deslocamentos negativos.
  const invasoras = plano.itens.flatMap((item, i) =>
    item.linhas
      .map((linha, indice) => ({ y: item.deslocamentoDoRotulo + indice * ALTURA_DA_LINHA, linha, i }))
      .filter((l) => l.y > -ALTURA_DA_LINHA + 0.001),
  );
  conferir(
    'nenhuma linha do rótulo cai na linha do valor',
    invasoras.length === 0,
    invasoras.map((l) => `"${l.linha}" em y=${l.y}`).join('; '),
  );

  // E o espaço reservado tem de comportar todas as linhas.
  const maiorAltura = Math.max(
    ...plano.itens.map((item) => item.linhas.length * ALTURA_DA_LINHA),
  );
  conferir(
    'a altura reservada comporta o rótulo mais alto',
    plano.alturaExtra >= maiorAltura,
    `reservado ${plano.alturaExtra}, preciso ${maiorAltura}`,
  );

  // Cada linha do rótulo cabe na largura do painel.
  const estouradas = plano.itens.flatMap((item) =>
    item.linhas.filter((l) => larguraDe(l, TAMANHO_ROTULO, ESPACAMENTO) > LARGURA_DO_PAINEL + 0.5),
  );
  conferir('nenhuma linha do rótulo estoura a largura do painel', estouradas.length === 0, estouradas.join(' | '));

  conferir(
    'o rótulo do print não perde nenhuma palavra',
    plano.itens[0].linhas.join(' ') === ROTULO_DO_PRINT,
    plano.itens[0].linhas.join(' | '),
  );
}

{
  // O pior rótulo da carteira, no painel mais estreito que existe (celular).
  const plano = planejarRotulagem({
    itens: [{ rotulo: ROTULO_MAIS_LONGO, valor: 'R$ 725,03' }],
    larguraPlot: 330,
    tamanhoRotulo: TAMANHO_ROTULO,
    tamanhoValor: TAMANHO_VALOR,
    espacamento: ESPACAMENTO,
  });
  const linhas = plano.itens[0].linhas;
  conferir('o rótulo mais longo da carteira empilha', plano.empilhado);
  conferir('ele não passa de duas linhas', linhas.length <= 2, `${linhas.length} linhas`);
  conferir(
    'e nenhuma delas estoura a largura',
    linhas.every((l) => larguraDe(l, TAMANHO_ROTULO, ESPACAMENTO) <= 330 + 0.5),
    linhas.join(' | '),
  );
  conferir(
    'o que não coube é DECLARADO com reticências, nunca cortado em silêncio',
    linhas.join(' ') === ROTULO_MAIS_LONGO || linhas[linhas.length - 1].endsWith('…'),
    linhas.join(' | '),
  );
}

{
  // Rótulo curto: nada muda, continua lado a lado como sempre foi.
  const plano = planejarRotulagem({
    itens: [
      { rotulo: 'Janeiro', valor: 'R$ 482,71' },
      { rotulo: 'Fevereiro', valor: 'R$ 710,73' },
    ],
    larguraPlot: LARGURA_DO_PAINEL,
    tamanhoRotulo: TAMANHO_ROTULO,
    tamanhoValor: TAMANHO_VALOR,
    espacamento: ESPACAMENTO,
  });
  conferir('mês de rótulo curto continua lado a lado', !plano.empilhado);
  conferir('e não reserva altura extra nenhuma', plano.alturaExtra === 0);
  conferir('nem quebra o rótulo', plano.itens.every((i) => i.linhas.length === 1));
}

{
  // Largura ainda não medida (primeira pintura): nada de dividir por zero nem
  // de decidir layout com informação que não existe.
  const plano = planejarRotulagem({
    itens: [{ rotulo: ROTULO_DO_PRINT, valor: 'R$ 1,00' }],
    larguraPlot: 0,
    tamanhoRotulo: TAMANHO_ROTULO,
    tamanhoValor: TAMANHO_VALOR,
  });
  conferir('sem largura medida, não empilha e não quebra', !plano.empilhado && plano.alturaExtra === 0);
  conferir('e devolve o rótulo inteiro', plano.itens[0].linhas.join(' ') === ROTULO_DO_PRINT);
}

{
  const linhas = quebrarRotulo('Palavraabsurdamentecompridaquenaocabeemlinhanenhuma', 60, TAMANHO_ROTULO);
  conferir('palavra sozinha maior que a linha não vira pedaço sem sentido', linhas.length === 1);
}

/* ------------------------------------------------------------------ */
/* O número grande dentro do cartão                                    */
/* ------------------------------------------------------------------ */

console.log('\nFaixa de indicadores — o número dentro do cartão');

/**
 * A mesma conta que o CSS faz, em `report.css`:
 *   font-size = min(tamanhoDesejado, max(piso, 100cqi / digitos / larguraChar))
 *
 * Reproduzi-la aqui não substitui o CSS — prova que a fórmula escolhida cabe
 * nos números REAIS da carteira, que é a parte que ninguém confere de olho.
 */
const LARGURA_CHAR_CSS = 0.55;
const PISO = 1.35 * 16;

function tamanhoResolvido(texto: string, larguraDoCartao: number, desejado: number) {
  return Math.min(desejado, Math.max(PISO, larguraDoCartao / texto.length / LARGURA_CHAR_CSS));
}

/** Largura real medida na Red Hat Display, por formato. */
const EM_POR_CHAR: Record<string, number> = {
  'R$ 231.866,54': 0.492,
  'R$ 29.599,51': 0.48,
  '2.173.102': 0.445,
  'R$ 1.234.567,89': 0.474,
  'R$ 98.765.432,10': 0.486,
  '100,0%': 0.54,
};

const CARTOES = [
  { nome: 'três colunas em 1.280 px', largura: 296 },
  { nome: 'duas colunas em tablet', largura: 240 },
  { nome: 'coluna única em 390 px', largura: 300 },
];

for (const cartao of CARTOES) {
  for (const [texto, emPorChar] of Object.entries(EM_POR_CHAR)) {
    const desejado = 3.05 * 16;
    const fonte = tamanhoResolvido(texto, cartao.largura, desejado);
    const largura = texto.length * emPorChar * fonte;
    conferir(
      `"${texto.replace(' ', ' ')}" cabe em ${cartao.nome}`,
      largura <= cartao.largura + 0.5,
      `precisa de ${largura.toFixed(0)}px em ${cartao.largura}px, com fonte ${fonte.toFixed(1)}px`,
    );
  }
}

{
  // A correção não pode encolher número curto: aí ela seria regressão.
  const desejado = 3.05 * 16;
  conferir(
    'número curto continua no tamanho cheio',
    tamanhoResolvido('1.234', 296, desejado) === desejado,
  );
  conferir(
    'e o número que vazava encolhe',
    tamanhoResolvido('R$ 231.866,54', 296, desejado) < desejado,
  );
}

console.log('');
if (falhas > 0) {
  console.error(`${falhas} verificação(ões) falharam.`);
  process.exit(1);
}
console.log('Todas as verificações de vazamento visual passaram.');
