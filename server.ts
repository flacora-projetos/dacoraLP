import dotenv from "dotenv";
import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import metaCapiHandler from "./api/meta-capi";
import painelFilaHandler from "./api/painel-fila";
import painelRelatorioHandler from "./api/painel-relatorio";
import painelSessaoHandler from "./api/painel-sessao";

/**
 * Variáveis de ambiente do desenvolvimento na máquina. Na Vercel elas vêm do
 * painel do projeto, e este arquivo nem serve o site.
 *
 * `.env.local` PRIMEIRO e listado explicitamente: `dotenv` sozinho lê só
 * `.env`, enquanto `.env.local` é convenção do Vite. Sem esta linha, o
 * navegador enxerga as variáveis (o Vite as carrega) e as funções em `api/`
 * não — o painel respondia "não configurado" numa máquina que estava
 * configurada, e o defeito aparecia só depois do login.
 *
 * Quem vem antes ganha: `.env.local` (que não vai para o repositório)
 * sobrescreve o `.env`.
 */
dotenv.config({ path: [".env.local", ".env"] });

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT || 3000);

  app.use(express.json());

  // Mount the CAPI endpoint to emulate Vercel's Edge/Serverless Functions behavior
  app.post("/api/meta-capi", metaCapiHandler);

  // Mesma emulação para a conferência de acesso ao painel. `app.all` (e não
  // `app.get`) para que um método errado caia no 405 do próprio handler, como
  // cairia na Vercel, em vez de virar 404 e mandar o painel investigar rota.
  app.all("/api/painel-sessao", painelSessaoHandler);
  app.all("/api/painel-fila", painelFilaHandler);
  app.all("/api/painel-relatorio", painelRelatorioHandler);

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const hmrPort = process.env.VITE_HMR_PORT ? Number(process.env.VITE_HMR_PORT) : undefined;
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        ...(hmrPort ? { hmr: { port: hmrPort } } : {}),
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production serving
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    // For Express 4
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
