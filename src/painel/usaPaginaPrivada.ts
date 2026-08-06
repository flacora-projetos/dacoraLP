import { useEffect } from 'react';

/**
 * Título da aba + `noindex` na própria página.
 *
 * É o mesmo gesto que `src/reports/Esqueleto.tsx` faz para as rotas de
 * relatório, escrito de novo aqui em vez de exportado de lá: aquele arquivo é
 * o esqueleto de cinco relatórios já publicados, e mexer nele para reaproveitar
 * quinze linhas coloca um entregável fechado no caminho de uma fase nova.
 *
 * O `noindex` do painel tem TRÊS camadas, e nenhuma é redundância inútil:
 * este meta na página, o cabeçalho `X-Robots-Tag` no `vercel.json` (que o
 * rastreador lê sem executar JavaScript) e a ausência da rota em
 * `scripts/seo-routes.mjs`, que a mantém fora da pré-renderização e do sitemap.
 */
export function usaPaginaPrivada(titulo: string) {
  useEffect(() => {
    const tituloAnterior = document.title;
    document.title = titulo;

    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex, nofollow, noarchive';
    document.head.appendChild(meta);

    return () => {
      document.title = tituloAnterior;
      meta.remove();
    };
  }, [titulo]);
}
