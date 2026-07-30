/**
 * Entrada de SSR usada apenas em build-time pelo script de pré-renderização
 * (scripts/prerender.mjs). Não é enviada ao navegador.
 */
import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom';
import App from './App';

export function render(url: string): string {
  return renderToString(
    <StaticRouter location={url}>
      <App />
    </StaticRouter>,
  );
}
