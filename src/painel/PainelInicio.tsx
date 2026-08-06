/**
 * A tela autenticada da P0 — vazia de propósito.
 *
 * A P0 é fundação e login. Nenhum dado de relatório entra aqui: a fila é a P1,
 * e ela depende da W2, que é o que passa a gravar o relatório no banco. Hoje a
 * tabela `public.relatorios` tem zero linhas, e uma fila inventada para
 * "mostrar como vai ficar" seria dado falso numa tela cujo propósito é decidir
 * o que vai para o cliente.
 *
 * Então esta tela diz onde a pessoa está, quem ela é, e o que ainda não existe.
 */
import { usarPainelAuth } from './AuthContext';

const PROXIMAS_FASES: Array<{ chave: string; texto: React.ReactNode }> = [
  {
    chave: 'P1',
    texto: (
      <>
        <strong>A fila do mês</strong> — uma linha por cliente e competência, ordenada pelo que
        precisa de atenção. Depende de os relatórios passarem a ser gravados no banco.
      </>
    ),
  },
  {
    chave: 'P2',
    texto: (
      <>
        <strong>A revisão</strong> — o relatório exatamente como o cliente vê, com a faixa de
        aprovação ao lado.
      </>
    ),
  },
  {
    chave: 'P3',
    texto: (
      <>
        <strong>Aprovar e recusar</strong> — o "sim" carimbado e o "não" com motivo.
      </>
    ),
  },
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
  const email = autorizacao?.estado === 'autorizado' ? autorizacao.email : usuario?.email ?? '';
  const nome = autorizacao?.estado === 'autorizado' ? autorizacao.nome : null;
  const primeiroNome = nome ? nome.split(' ')[0] : null;

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
        <section className="dcp-secao">
          <h1 className="dcp-secao__titulo">
            {primeiroNome ? `Tudo certo, ${primeiroNome}.` : 'Tudo certo.'} Você está dentro do painel.
          </h1>
          <p className="dcp-secao__apoio">
            Esta é a fundação: a entrada funciona e o acesso é conferido no servidor a cada
            requisição. Ainda não há relatório nenhum para listar — a geração mensal ainda não grava
            no banco, e inventar uma fila de exemplo numa tela de aprovação seria dado falso no
            lugar exato onde ele não pode existir.
          </p>
        </section>

        <section className="dcp-secao">
          <h2 className="dcp-secao__titulo">O que entra depois</h2>
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
        </section>
      </main>
    </>
  );
}
