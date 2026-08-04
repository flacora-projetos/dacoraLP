/**
 * B7 — Glossário de métricas.
 *
 * Aparece em cinco dos seis relatórios validados. Só a Sant'Alberti não tem.
 *
 * O texto NÃO vem do snapshot: vem de `src/reports/glossario.ts`, escrito uma
 * vez por métrica e igual para todo cliente. A montagem só diz quais métricas
 * explicar. É o item mais barato do catálogo e um dos que mais se pagam — hoje
 * a mesma explicação de CPM existe em quatro redações diferentes espalhadas
 * por quatro relatórios.
 *
 * Id sem texto escrito é omitido em silêncio, de propósito: um glossário
 * incompleto é um problema pequeno; um glossário que inventa explicação para
 * caber é um problema grande.
 */

import { termosDoGlossario } from '../glossario';
import type { BlocoB7 } from './tipos';

export default function B7Glossario({ config }: { config: BlocoB7 }) {
  const termos = termosDoGlossario(config.metricas);
  if (termos.length === 0) return null;

  return (
    <dl className="dc-glossario">
      {termos.map((termo) => (
        <div className="dc-glossario__item" key={termo.id}>
          <dt>{termo.termo}</dt>
          <dd>{termo.texto}</dd>
        </div>
      ))}
    </dl>
  );
}
