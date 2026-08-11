import { Link } from 'react-router-dom';
import { LINK_INTERNOS_ALLGROTECH } from './InternosAllgrotech';

export type VistaDoPainel = 'fila' | 'revisao' | 'internos-allgrotech';

export function resolverVistaDoPainel(secao: string | null, relatorioId: string | null): VistaDoPainel {
  if (secao === 'internos-allgrotech') return 'internos-allgrotech';
  return relatorioId ? 'revisao' : 'fila';
}

export function NavegacaoDoPainel({ vista }: { vista: VistaDoPainel }) {
  const internosAtivo = vista === 'internos-allgrotech';

  return (
    <nav className="dcp-areas" aria-label="Áreas do painel">
      <Link
        className={`dcp-areas__item${internosAtivo ? '' : ' dcp-areas__item--ativa'}`}
        aria-current={internosAtivo ? undefined : 'page'}
        to="/painel-de-relatorios"
      >
        Fila atual
      </Link>
      <Link
        className={`dcp-areas__item${internosAtivo ? ' dcp-areas__item--ativa' : ''}`}
        aria-current={internosAtivo ? 'page' : undefined}
        to={LINK_INTERNOS_ALLGROTECH}
      >
        Internos Allgrotech
      </Link>
    </nav>
  );
}
