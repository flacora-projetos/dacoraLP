import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import metaCapiHandler from "./api/meta-capi";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Mount the CAPI endpoint to emulate Vercel's Edge/Serverless Functions behavior
  app.post("/api/meta-capi", metaCapiHandler);

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
