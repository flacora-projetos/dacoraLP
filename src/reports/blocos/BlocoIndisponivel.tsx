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
 *
 * ---------------------------------------------------------------------------
 * DOIS LEITORES, UM DOCUMENTO — C1 da direção de 2026-08-12
 * (`docs/DIRECAO_LINGUAGEM_DE_CLIENTE_NOS_RELATORIOS_2026-08-12.md`, no
 * `OpenClaw-Dacora`; classificador em `./motivo-cliente.ts`).
 *
 * `motivo` e `oQueTemos` são escritos pela fábrica para quem audita o
 * sistema — é assim que "a lista de anúncios veio cortada nesta consulta"
 * chegava, ao pé da letra, à tela do cliente. Aqui eles passam pelo
 * classificador antes de aparecer: texto que já é fato do negócio do cliente
 * ("Nenhum anúncio deste grupo veiculou no mês.") sai como está; texto que
 * carrega vocabulário de quem constrói o sistema vira uma frase neutra e
 * verdadeira. O diagnóstico técnico completo não desaparece — ele já está no
 * painel, na fila, junto dos sinais de atenção.
 *
 * `dependeDe` nunca aparece aqui. Pela própria definição do campo ("de que
 * depende para ficar pronto"), ele descreve um próximo passo NOSSO — uma
 * nova coleta, uma integração respondendo, um cadastro preenchido. O cliente
 * não tem o que fazer com essa informação, e ela não muda como ele lê os
 * números: é exatamente a régua da direção de 2026-08-12. Continua gravada
 * no snapshot e visível para quem revisa.
 */

import { motivoParaCliente, itensParaCliente } from './motivo-cliente';
import type { Indisponibilidade } from './tipos';

const FRASE_NEUTRA = 'Esta seção ainda não está disponível neste relatório.';

export default function BlocoIndisponivel({ info }: { info: Indisponibilidade }) {
  const motivo = motivoParaCliente(info.motivo, FRASE_NEUTRA);
  const oQueTemos = itensParaCliente(info.oQueTemos);

  return (
    <div className="dc-indisponivel">
      <p className="dc-indisponivel__rotulo">Dado indisponível</p>
      <p className="dc-indisponivel__motivo">{motivo}</p>

      {oQueTemos.length > 0 && (
        <div className="dc-indisponivel__temos">
          <h3 className="dc-indisponivel__subtitulo">O que já está disponível</h3>
          <ul>
            {oQueTemos.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
