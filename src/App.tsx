import { Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import PrivacyPolicy from './pages/PrivacyPolicy';
import PropostaLandingPage from './pages/PropostaLandingPage';

/**
 * Rotas privadas de relatório (fase W0).
 *
 * Entram por `lazy` de propósito: o Recharts e a serif da proposta A só são
 * baixados por quem abre um relatório. As páginas institucionais continuam
 * com o mesmo bundle de antes. Como estas rotas não estão em
 * `scripts/seo-routes.mjs`, elas também não são pré-renderizadas nem entram
 * no sitemap — o `noindex` vem da própria página e do cabeçalho definido em
 * `vercel.json`.
 */
const RelatorioDemoA = lazy(() => import('./pages/RelatorioDemoA'));
const RelatorioDemoB = lazy(() => import('./pages/RelatorioDemoB'));

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/politica-de-privacidade" element={<PrivacyPolicy />} />
      <Route path="/proposta-landing-page" element={<PropostaLandingPage />} />
      <Route
        path="/relatorios/demo/a"
        element={
          <Suspense fallback={<CarregandoRelatorio />}>
            <RelatorioDemoA />
          </Suspense>
        }
      />
      <Route
        path="/relatorios/demo/b"
        element={
          <Suspense fallback={<CarregandoRelatorio />}>
            <RelatorioDemoB />
          </Suspense>
        }
      />
    </Routes>
  );
}

function CarregandoRelatorio() {
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        minHeight: '60vh',
        display: 'grid',
        placeItems: 'center',
        color: '#4A5E55',
        fontSize: '0.85rem',
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
      }}
    >
      Carregando relatório
    </div>
  );
}
