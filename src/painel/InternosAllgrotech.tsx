import { Link } from 'react-router-dom';

export const LINK_INTERNOS_ALLGROTECH =
  '/painel-de-relatorios?secao=internos-allgrotech';

export default function InternosAllgrotech({ relatorioId }: { relatorioId: string | null }) {
  if (relatorioId) {
    return (
      <section className="dcp-internos" aria-labelledby="dcp-internos-nao-encontrado">
        <p className="dcp-internos__marcador">Allgrotech · uso interno</p>
        <div className="dcp-internos__vazio" role="alert">
          <h1 id="dcp-internos-nao-encontrado" className="dcp-internos__titulo">
            Relatório interno não encontrado
          </h1>
          <p className="dcp-internos__texto">
            Esta seção ainda não tem relatórios. Trocar o identificador no endereço não abre um
            relatório de outro produto aqui.
          </p>
          <Link className="dcp-botao dcp-botao--discreto" to={LINK_INTERNOS_ALLGROTECH}>
            Voltar para a lista interna
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="dcp-internos" aria-labelledby="dcp-internos-titulo">
      <header className="dcp-internos__cabecalho">
        <p className="dcp-internos__marcador">Allgrotech · uso interno</p>
        <h1 id="dcp-internos-titulo" className="dcp-internos__titulo">
          Relatórios internos
        </h1>
        <p className="dcp-internos__texto">
          Área de trabalho exclusiva dos operadores Dácora. O acesso da Allgrotech continua pelo
          processo externo, sem entrada neste painel.
        </p>
      </header>

      <div className="dcp-internos__vazio" role="status" aria-live="polite">
        <span className="dcp-internos__zero" aria-hidden="true">
          0
        </span>
        <div>
          <h2 className="dcp-internos__vazio-titulo">Nenhum relatório interno disponível</h2>
          <p className="dcp-internos__texto">
            Este é o estado esperado agora: nenhum snapshot interno foi gerado ou carregado. A
            lista permanece vazia até existir um contrato factual validado para este produto.
          </p>
        </div>
      </div>
    </section>
  );
}
