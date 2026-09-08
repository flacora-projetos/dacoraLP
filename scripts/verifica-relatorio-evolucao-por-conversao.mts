/**
 * A seção "o ano até aqui" com uma série por conversão contratada.
 *
 * Duas coisas que a página não pode errar, e as duas nasceram de defeito real
 * relatado pelo PO em 08/09/2026:
 *
 *  1. **A coluna de denominador não é desenhada.** O investimento por conversão
 *     viaja no snapshot porque o total do ano precisa dividir os dois lados do
 *     mesmo recorte; desenhá-lo dobraria os painéis sem acrescentar leitura.
 *  2. **A grade nunca deixa um painel órfão.** Com `auto-fit` de trilha mínima
 *     280px, três painéis não cabiam nos ~893px úteis (pediam 904px) e o
 *     terceiro caía sozinho na linha de baixo — em TODO desktop, não numa tela
 *     específica.
 *
 * ⚠️ A varredura do CSS remove comentários ANTES de procurar. Sem isso, o texto
 * que documenta a regra entra na captura do seletor e a busca passa por casar
 * com o próprio comentário — armadilha que este repositório já pagou duas vezes.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import B3EvolucaoMensal from '../src/reports/blocos/B3EvolucaoMensal.tsx';
import { criarChartTheme } from '../src/reports/charts/chartTheme.ts';
import type { EvolucaoMensal, BlocoB3 } from '../src/reports/blocos/tipos.ts';

const ok = (numero: number) => ({ estado: 'ok' as const, numero });

const EVOLUCAO: EvolucaoMensal = {
  id: 'evolucao_meta',
  plataforma: 'meta',
  colunas: [
    { id: 'custo', rotulo: 'Investimento', unidade: 'brl' },
    { id: 'resultado_conversas_iniciadas', rotulo: 'Conversas iniciadas', unidade: 'inteiro' },
    {
      id: 'investimento_conversas_iniciadas',
      rotulo: 'Investimento em conversas iniciadas',
      unidade: 'brl',
      oculta: true,
    },
    { id: 'custo_resultado_conversas_iniciadas', rotulo: 'Custo por conversa', unidade: 'brl' },
  ],
  meses: [
    {
      competencia: '2026-01',
      valores: {
        custo: ok(1000),
        resultado_conversas_iniciadas: ok(40),
        investimento_conversas_iniciadas: ok(800),
        custo_resultado_conversas_iniciadas: ok(20),
      },
    },
  ],
  total: {
    rotulo: 'Total do ano até aqui',
    valores: {
      custo: ok(1000),
      resultado_conversas_iniciadas: ok(40),
      investimento_conversas_iniciadas: ok(800),
      custo_resultado_conversas_iniciadas: ok(20),
    },
  },
  definicoes: ['O total é do período inteiro, e não a média dos meses.'],
};

const theme = criarChartTheme('A');

function markup(apresentacao: 'grafico' | 'tabela') {
  const config = { bloco: 'B3', id: 'evolucao-meta', titulo: 'O ano', apresentacao } as unknown as BlocoB3;
  return renderToStaticMarkup(
    createElement(B3EvolucaoMensal as never, { evolucao: EVOLUCAO, config, theme } as never),
  );
}

for (const apresentacao of ['grafico', 'tabela'] as const) {
  const html = markup(apresentacao);

  /* A prova positiva vem primeiro: sem ela, a ausência do rótulo oculto
     passaria por vacuidade num render que não desenhou nada. */
  assert.ok(
    html.includes('Conversas iniciadas'),
    `${apresentacao}: o render precisa MESMO ter saído, senão toda ausência passa por vacuidade`,
  );
  assert.ok(html.includes('Custo por conversa'), `${apresentacao}: a coluna de custo por conversão é desenhada`);
  assert.ok(
    !html.includes('Investimento em conversas iniciadas'),
    `${apresentacao}: a coluna de denominador NÃO pode ser desenhada`,
  );
}

/* ---------------------------------------------------------------- */
/* A grade dos painéis                                              */
/* ---------------------------------------------------------------- */

const css = readFileSync('src/reports/report.css', 'utf8');
const semComentarios = css.replace(/\/\*[\s\S]*?\*\//g, '');
const regras = [...semComentarios.matchAll(/\.dc-paineis-metrica[^{}]*\{([^{}]*)\}/g)];
assert.ok(regras.length >= 2, 'a varredura do CSS não achou as regras da grade — vazia, tudo passaria por vacuidade');

const seletores = [...semComentarios.matchAll(/([^{}]*)\{([^{}]*)\}/g)]
  .map(([, sel, corpo]) => ({ sel: sel.trim(), corpo }))
  .filter((r) => r.sel.includes('dc-paineis-metrica'));

const daGrade = seletores.find((r) => r.corpo.includes('grid-template-columns'));
assert.ok(daGrade, 'a grade precisa declarar as colunas');
assert.match(
  daGrade!.corpo,
  /grid-template-columns:\s*repeat\(2,/,
  'as duas colunas são fixas: `auto-fit` com trilha de 280px não cabe três vezes nos ~893px úteis e deixa o terceiro painel órfão',
);
assert.ok(
  !daGrade!.corpo.includes('auto-fit'),
  'auto-fit foi removido de propósito — ver o comentário da regra',
);

const daExcecao = seletores.find((r) => r.corpo.includes('grid-column'));
assert.ok(daExcecao, 'faltam as exceções que impedem painel órfão');
assert.ok(
  daExcecao!.sel.includes(':first-child:not(:nth-last-child(-n + 2))'),
  'o primeiro painel só ocupa a linha inteira a partir de três: com dois, esticar empilharia a evolução de quem já estava correta',
);
assert.ok(
  daExcecao!.sel.includes(':last-child:nth-child(even):nth-child(n + 4)'),
  'o último painel ocupa a linha inteira quando ficaria órfão, e o caso de dois painéis fica de fora',
);

console.log('verifica-relatorio-evolucao-por-conversao: ok');
