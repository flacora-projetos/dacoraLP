import { type ReactNode } from 'react';
import { createPortal } from 'react-dom';

/**
 * Mantém os diálogos fora da faixa lateral (`sticky`/`fixed` + `overflow`)
 * sem tirá-los do escopo de `.dc-painel`, onde vivem os tokens CSS.
 *
 * A página real oferece um `.dcp-portal` como filho direto de `.dc-painel`.
 * Em regressões isoladas/SSR, onde esse nó não existe, o conteúdo continua
 * inline para preservar o comportamento anterior e evitar dependência de DOM.
 */
export default function PortalDoDialogo({ children }: { children: ReactNode }) {
  if (typeof document === 'undefined') return <>{children}</>;

  const destino = document.querySelector<HTMLElement>('.dc-painel > .dcp-portal');
  return destino ? createPortal(children, destino) : <>{children}</>;
}
