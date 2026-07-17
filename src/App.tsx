import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import PrivacyPolicy from './pages/PrivacyPolicy';
import PropostaLandingPage from './pages/PropostaLandingPage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/politica-de-privacidade" element={<PrivacyPolicy />} />
      <Route path="/proposta-landing-page" element={<PropostaLandingPage />} />
    </Routes>
  );
}
