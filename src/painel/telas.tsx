/**
 * As telas de portão do painel: entrar, barrado, erro e não configurado.
 *
 * A regra que vale para as quatro: **nenhuma delas é um erro genérico.** Quem
 * cai numa tela que só diz "algo deu errado" conclui que o sistema quebrou e
 * vai atrás de conserto — mesmo quando o sistema fez exatamente o que devia,
 * que é o caso do e-mail sem acesso.
 */

import BotaoGoogle from './BotaoGoogle';

/** Envelope comum: cartão centralizado, na pele do projeto. */
function Portao({ children }: { children: React.ReactNode }) {
  return (
    <div className="dcp-portao">
      <main className="dcp-cartao">{children}</main>
    </div>
  );
}

export function TelaEntrar({ aoEntrar }: { aoEntrar: () => Promise<void> }) {
  return (
    <Portao>
      <p className="dcp-eyebrow">Dácora</p>
      <h1 className="dcp-titulo">Painel de relatórios</h1>
      <p className="dcp-texto">
        Aqui é onde os relatórios mensais são lidos, aprovados e enviados. O acesso é por conta
        Google, e só para quem foi liberado.
      </p>
      <BotaoGoogle rotulo="Entrar com o Google" aoEntrar={aoEntrar} />
      <p className="dcp-nota">
        Os relatórios enviados aos clientes continuam abertos por link, sem login. Esta entrada
        protege apenas o painel, que enxerga a carteira inteira.
      </p>
    </Portao>
  );
}

export function TelaNaoAutorizado({
  email,
  mensagem,
  aoSair,
}: {
  email: string;
  mensagem: string;
  aoSair: () => Promise<void>;
}) {
  return (
    <Portao>
      <p className="dcp-eyebrow">Acesso não liberado</p>
      <h1 className="dcp-titulo">Sua conta entrou, mas não tem acesso ao painel</h1>
      <p className="dcp-texto">{mensagem}</p>

      <div className="dcp-dado">
        <span className="dcp-dado__rotulo">Você entrou como</span>
        <span className="dcp-dado__valor">{email || 'conta sem e-mail'}</span>
      </div>

      <p className="dcp-texto">
        Se este não é o endereço que deveria ter acesso, saia e entre de novo com a outra conta
        Google. Se é o endereço certo, fale com o <strong>Flávio</strong> para liberar.
      </p>

      <div className="dcp-acoes">
        <button type="button" className="dcp-botao dcp-botao--primario" onClick={() => void aoSair()}>
          Sair e usar outra conta
        </button>
      </div>
    </Portao>
  );
}

export function TelaErroDeVerificacao({
  mensagem,
  aoTentarDeNovo,
  aoSair,
}: {
  mensagem: string;
  aoTentarDeNovo: () => Promise<void>;
  aoSair: () => Promise<void>;
}) {
  return (
    <Portao>
      <p className="dcp-eyebrow">Verificação de acesso</p>
      <h1 className="dcp-titulo">Não deu para confirmar seu acesso agora</h1>
      <p className="dcp-texto">{mensagem}</p>
      <p className="dcp-texto">
        Por segurança o painel fica fechado enquanto a verificação não conclui — nada é liberado
        "no benefício da dúvida".
      </p>
      <div className="dcp-acoes">
        <button
          type="button"
          className="dcp-botao dcp-botao--primario"
          onClick={() => void aoTentarDeNovo()}
        >
          Tentar de novo
        </button>
        <button type="button" className="dcp-botao dcp-botao--discreto" onClick={() => void aoSair()}>
          Sair
        </button>
      </div>
    </Portao>
  );
}

/**
 * Falta variável de ambiente no NAVEGADOR (as `VITE_`). Aparece de cara em
 * qualquer ambiente novo, e é melhor que dizer o nome do que deixar a pessoa
 * caçando um erro de código que era um campo em branco na Vercel.
 *
 * Só nomes de variáveis aparecem aqui — nunca valores.
 */
export function TelaNaoConfigurado({ faltando }: { faltando: string }) {
  return (
    <div className="dcp-portao">
      <main className="dcp-cartao dcp-cartao--largo">
        <p className="dcp-eyebrow">Configuração pendente</p>
        <h1 className="dcp-titulo">O painel ainda não foi ligado neste ambiente</h1>
        <p className="dcp-texto">
          Falta cadastrar a conexão com o banco de dados. Enquanto isso, a entrada não abre.
        </p>
        <div className="dcp-dado">
          <span className="dcp-dado__rotulo">Variáveis ausentes</span>
          <span className="dcp-dado__valor">{faltando}</span>
        </div>
        <p className="dcp-nota">
          Elas são cadastradas na Vercel (e, para rodar na máquina, num arquivo <code>.env.local</code>{' '}
          que não vai para o repositório). O passo a passo está em{' '}
          <code>docs/PAINEL_PROGRESSO.md</code>.
        </p>
      </main>
    </div>
  );
}

/**
 * Espera. Esqueleto com a altura das linhas reais, e não `spinner` no meio da
 * tela — o salto de layout quando o conteúdo chega é o que faz parecer amador.
 */
export function TelaEspera({ rotulo }: { rotulo: string }) {
  const larguras = ['62%', '48%', '71%', '55%', '40%'];
  return (
    <div className="dcp-espera" role="status" aria-live="polite">
      <p className="dcp-espera__rotulo">{rotulo}</p>
      <div className="dcp-espera__linhas" aria-hidden="true">
        {larguras.map((largura, indice) => (
          <div className="dcp-espera__linha" key={indice}>
            <span className="dcp-espera__barra" style={{ width: largura }} />
          </div>
        ))}
      </div>
    </div>
  );
}
