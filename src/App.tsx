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
const RelatorioDemoAviarte = lazy(() => import('./pages/RelatorioDemoAviarte'));
const RelatorioDemoEcommerce = lazy(() => import('./pages/RelatorioDemoEcommerce'));
const RelatorioDemoIch = lazy(() => import('./pages/RelatorioDemoIch'));
const RelatorioDemoKaryne = lazy(() => import('./pages/RelatorioDemoKaryne'));
const RelatorioDemoVetsell = lazy(() => import('./pages/RelatorioDemoVetsell'));
const RelatorioDemoZenun = lazy(() => import('./pages/RelatorioDemoZenun'));

/**
 * Painel de aprovação (fase P0). Também privado, também `lazy`: só quem abre o
 * painel baixa o cliente de autenticação. Fica fora de `scripts/seo-routes.mjs`
 * pelo mesmo motivo das rotas de relatório.
 */
const PainelRelatorios = lazy(() => import('./pages/PainelRelatorios'));
const RelatorioPublico = lazy(() => import('./pages/RelatorioPublico'));

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
      <Route
        path="/relatorios/demo/aviarte"
        element={
          <Suspense fallback={<CarregandoRelatorio />}>
            <RelatorioDemoAviarte />
          </Suspense>
        }
      />
      <Route
        path="/relatorios/demo/ecommerce"
        element={
          <Suspense fallback={<CarregandoRelatorio />}>
            <RelatorioDemoEcommerce />
          </Suspense>
        }
      />
      <Route
        path="/relatorios/demo/ich"
        element={
          <Suspense fallback={<CarregandoRelatorio />}>
            <RelatorioDemoIch />
          </Suspense>
        }
      />
      <Route
        path="/relatorios/demo/karyne"
        element={
          <Suspense fallback={<CarregandoRelatorio />}>
            <RelatorioDemoKaryne />
          </Suspense>
        }
      />
      <Route
        path="/relatorios/demo/vetsell"
        element={
          <Suspense fallback={<CarregandoRelatorio />}>
            <RelatorioDemoVetsell />
          </Suspense>
        }
      />
      <Route
        path="/relatorios/demo/zenun"
        element={
          <Suspense fallback={<CarregandoRelatorio />}>
            <RelatorioDemoZenun />
          </Suspense>
        }
      />
      <Route
        path="/painel-de-relatorios"
        element={
          <Suspense fallback={<CarregandoPainel />}>
            <PainelRelatorios />
          </Suspense>
        }
      />
      <Route
        path="/relatorios/:token"
        element={
          <Suspense fallback={<CarregandoRelatorio />}>
            <RelatorioPublico />
          </Suspense>
        }
      />
    </Routes>
  );
}

function CarregandoPainel() {
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
      Carregando painel
    </div>
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
