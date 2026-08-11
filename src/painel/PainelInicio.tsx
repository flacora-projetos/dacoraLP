/**
 * A tela autenticada do painel — hoje ela é a FILA.
 *
 * Até a P0 esta tela era vazia de propósito, porque a tabela `public.relatorios`
 * tinha zero linhas e uma fila inventada para "mostrar como vai ficar" seria
 * dado falso numa tela cujo trabalho é decidir o que vai para o cliente. Os
 * relatórios entraram no banco, então a fila deixou de ser exemplo e virou a
 * mesa de trabalho.
 *
 * O que ainda não existe continua listado embaixo, e continua ali pelo mesmo
 * motivo de sempre: quem abre uma ferramenta em construção precisa saber o que
 * ela ainda não faz, para não procurar botão que não existe.
 */
import { usarPainelAuth } from './AuthContext';
import Fila from './Fila';
import Revisao from './Revisao';
import { useSearchParams } from 'react-router-dom';
import type { ReactNode } from 'react';

/**
 * O que ainda NÃO existe aqui.
 *
 * A P3 saiu desta lista quando aprovar e recusar passaram a funcionar de
 * verdade, na tela de revisão. Item que já existe e continua listado como
 * pendência manda a próxima pessoa procurar um botão que está bem à frente
 * dela — é a mesma falsa pendência que os documentos deste projeto proíbem.
 */
const PROXIMAS_FASES: Array<{ chave: string; texto: ReactNode }> = [
  {
    chave: 'P5',
    texto: (
      <>
        <strong>Envio</strong> — com o nome do grupo escrito antes de disparar.
      </>
    ),
  },
];

export default function PainelInicio() {
  const { autorizacao, usuario, sair } = usarPainelAuth();
  const [busca] = useSearchParams();
  const relatorioId = busca.get('relatorio');
  const email = autorizacao?.estado === 'autorizado' ? autorizacao.email : usuario?.email ?? '';

  return (
    <>
      <header className="dcp-topo">
        <div className="dcp-topo__conteudo">
          <span className="dcp-topo__marca">Dácora</span>
          <span className="dcp-topo__separador" aria-hidden="true" />
          <span className="dcp-topo__titulo">Painel de relatórios</span>
          <div className="dcp-topo__identidade">
            <span className="dcp-topo__email" title={email}>
              {email}
            </span>
            <button type="button" className="dcp-botao dcp-botao--discreto" onClick={() => void sair()}>
              Sair
            </button>
          </div>
        </div>
      </header>

      <main className="dcp-corpo">
        {relatorioId ? (
          <Revisao relatorioId={relatorioId} />
        ) : (
          <Fila />
        )}

        {!relatorioId && <section className="dcp-secao dcp-secao--recuada">
          <h2 className="dcp-secao__titulo">O que ainda não dá para fazer aqui</h2>
          <p className="dcp-secao__apoio">
            Cada etapa abaixo entrega algo que funciona sozinho, na ordem.
          </p>
          <ul className="dcp-proximas">
            {PROXIMAS_FASES.map((fase) => (
              <li key={fase.chave}>
                <span className="dcp-proximas__chave">{fase.chave}</span>
                <span className="dcp-proximas__texto">{fase.texto}</span>
              </li>
            ))}
          </ul>
        </section>}
      </main>
    </>
  );
}
