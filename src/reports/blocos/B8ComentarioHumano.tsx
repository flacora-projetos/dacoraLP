/**
 * B8 — Comentário humano ("Leitura").
 *
 * A única parte do relatório que pode afirmar **por quê**. Todo o resto
 * descreve o que foi medido; aqui alguém assume a autoria de uma
 * interpretação, e por isso o bloco é assinado.
 *
 * O que ele resolve, com um exemplo real: a página 1 da VetSell explica que o
 * Facebook foi retirado das campanhas depois que o time comercial do cliente
 * relatou leads desqualificados. Decisão, motivo e retorno de gente — nenhuma
 * API tem isso, e nenhuma leitura automática poderia inventar sem mentir.
 *
 * A separação visual não é enfeite. Um relatório que mistura apuração e
 * opinião no mesmo parágrafo ensina o leitor a duvidar dos dois. Aqui o
 * comentário tem moldura, aspas e assinatura; a leitura gerada em código, não.
 */

import { formatarDataExtenso } from '../format';
import type { ComentarioHumano } from './tipos';

export default function B8ComentarioHumano({
  comentario,
}: {
  comentario: ComentarioHumano;
}) {
  return (
    <figure className="dc-comentario">
      <blockquote className="dc-comentario__texto">
        {comentario.paragrafos.map((paragrafo) => (
          <p key={paragrafo}>{paragrafo}</p>
        ))}
      </blockquote>
      <figcaption className="dc-comentario__assinatura">
        <span className="dc-comentario__autor">{comentario.autor}</span>
        <span className="dc-comentario__data">
          escrito em {formatarDataExtenso(comentario.escritoEm)}
        </span>
      </figcaption>
    </figure>
  );
}
