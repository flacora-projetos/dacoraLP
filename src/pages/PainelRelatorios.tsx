/**
 * `/painel-de-relatorios` — a mesa de trabalho de aprovação (fase P0).
 *
 * Rota privada: fora do `scripts/seo-routes.mjs` (e portanto fora da
 * pré-renderização e do sitemap), com `noindex` na página e no cabeçalho
 * definido no `vercel.json`.
 *
 * Entra por `lazy` no `App.tsx`, como as rotas de relatório: quem abre o site
 * institucional não baixa o `@supabase/supabase-js`.
 *
 * Uma superfície, um endereço: não existe `/login`. Quem não entrou vê a tela
 * de entrada aqui mesmo, e é o que faz o retorno do Google e a sessão expirada
 * devolverem a pessoa ao lugar de onde ela saiu.
 */
import { PainelAuthProvider } from '../painel/AuthContext';
import PainelInicio from '../painel/PainelInicio';
import Portao from '../painel/Portao';
import { usaPaginaPrivada } from '../painel/usaPaginaPrivada';
import '../painel/painel.css';

export default function PainelRelatorios() {
  usaPaginaPrivada('Painel de relatórios | Dácora');

  return (
    <div className="dc-painel">
      <div className="dcp-portal" />
      <PainelAuthProvider>
        <Portao>
          <PainelInicio />
        </Portao>
      </PainelAuthProvider>
    </div>
  );
}
