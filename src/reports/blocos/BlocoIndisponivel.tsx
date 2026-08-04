/**
 * A seção que diz o que falta.
 *
 * É a peça que impede os dois jeitos errados de lidar com um dado que ainda
 * não temos:
 *
 *  • **sumir com a seção** — o leitor não sente falta do que não vê, e do
 *    nosso lado ninguém lembra de voltar;
 *  • **preencher com estimativa** — vira número que ninguém mediu, com a
 *    mesma aparência dos que foram medidos.
 *
 * Ela é deliberadamente sóbria: sem cor de alarme, sem ícone de erro. Não é
 * falha do mês nem problema do cliente — é uma parte do relatório que ainda
 * está sendo construída, e o tom precisa dizer isso. Um aviso vermelho aqui
 * faria o cliente achar que a campanha dele tem algo errado.
 *
 * Quando o dado chega, apaga-se a declaração `indisponivel` da montagem e o
 * bloco passa a renderizar normalmente. Nada mais precisa mudar.
 */

import type { Indisponibilidade } from './tipos';

export default function BlocoIndisponivel({ info }: { info: Indisponibilidade }) {
  return (
    <div className="dc-indisponivel">
      <p className="dc-indisponivel__motivo">{info.motivo}</p>

      {info.oQueTemos && info.oQueTemos.length > 0 && (
        <div className="dc-indisponivel__temos">
          <h4 className="dc-indisponivel__subtitulo">O que já está disponível</h4>
          <ul>
            {info.oQueTemos.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      )}

      {info.dependeDe && <p className="dc-indisponivel__depende">{info.dependeDe}</p>}
    </div>
  );
}
