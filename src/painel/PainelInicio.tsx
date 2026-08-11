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

      </main>
    </>
  );
}
