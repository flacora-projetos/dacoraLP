// Carrega o .env/.env.local antes de tudo. Só vale para o desenvolvimento na
// máquina: na Vercel as variáveis vêm do painel do projeto, e este arquivo nem
// é usado para servir o site. Sem isto, as funções em `api/` rodam localmente
// sem enxergar nenhuma variável, e o painel diria "não configurado" numa
// máquina que ESTÁ configurada.
import "dotenv/config";
import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import metaCapiHandler from "./api/meta-capi";
import painelSessaoHandler from "./api/painel-sessao";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Mount the CAPI endpoint to emulate Vercel's Edge/Serverless Functions behavior
  app.post("/api/meta-capi", metaCapiHandler);

  // Mesma emulação para a conferência de acesso ao painel. `app.all` (e não
  // `app.get`) para que um método errado caia no 405 do próprio handler, como
  // cairia na Vercel, em vez de virar 404 e mandar o painel investigar rota.
  app.all("/api/painel-sessao", painelSessaoHandler);

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
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
