/**
 * `GET /api/relatorio-pdf?token=<credencial>` — o PDF do relatório mensal.
 *
 * ⚠️ NÃO É UMA FUNÇÃO PRÓPRIA DA VERCEL, e o `_` no nome é de propósito: o
 * plano Hobby aceita no máximo 12 funções por publicação, e a prévia desta
 * entrega falhou com `exceeded_serverless_functions_per_deployment` quando o
 * PDF tentou ser a 13ª. O endereço público continua `/api/relatorio-pdf`, que
 * o `vercel.json` encaminha para `api/relatorio-publico.ts` com
 * `formato=pdf`; lá o pedido é despachado para cá, carregado sob demanda para
 * não pesar a abertura do link.
 *
 * ---------------------------------------------------------------------------
 * ESTE É O ÚNICO LUGAR QUE PRODUZ O PDF DE UM RELATÓRIO (29/09/2026)
 *
 * O botão "Exportar PDF" da página e a rotina que grava o mensal na pasta do
 * cliente no Drive baixam o arquivo DAQUI. Antes havia dois geradores — o
 * botão montava um documento no navegador e o Drive imprimia a página com o
 * Chrome — e o cliente recebia dois PDFs diferentes do mesmo relatório.
 * Decisão do PO: um gerador só. Não crie outro caminho de PDF.
 * ---------------------------------------------------------------------------
 *
 * Mesmas travas do link: a leitura é `lerRelatorioPublico`, a mesma função
 * que serve a página. Só versão liberada, com fechamento conferido, e só
 * análise e observação publicadas. O token é credencial e não aparece na
 * resposta nem no nome do arquivo.
 */
import type { Request, Response } from 'express';

import { lerRelatorioPublico, tokenDaRequisicao } from './relatorio-publico.js';
import { gerarPdfDoRelatorio } from '../src/reports/pdf/gerarPdf.js';
import { nomeDoArquivoPdf } from '../src/reports/pdf/nomeDoArquivo.js';
import type { SnapshotMontado } from '../src/reports/blocos/tipos.js';

export async function atenderPdfDoRelatorio(req: Request, res: Response) {
  res.setHeader('Cache-Control', 'private, no-store, no-cache, must-revalidate');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
  res.setHeader('Referrer-Policy', 'no-referrer');

  if (req.method !== 'GET') {
    return res.status(405).json({ erro: 'metodo_nao_permitido' });
  }

  const leitura = await lerRelatorioPublico(tokenDaRequisicao(req));
  if (leitura.status !== 200) return res.status(leitura.status).json(leitura.corpo);

  const relatorio = leitura.corpo.relatorio as {
    snapshot: SnapshotMontado;
    analisesPublicadas: Array<{ secao: string; texto: string }>;
    observacoesPublicas: Array<{ secao: string; texto: string }>;
  };

  try {
    const pdf = await gerarPdfDoRelatorio({
      snapshot: relatorio.snapshot,
      analisesPublicadas: relatorio.analisesPublicadas,
      observacoesPublicas: relatorio.observacoesPublicas,
    });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Length', String(pdf.length));
    res.setHeader('Content-Disposition', `attachment; filename="${nomeDoArquivoPdf(relatorio.snapshot)}"`);
    return res.status(200).send(pdf);
  } catch (erro) {
    console.error('[relatorio-pdf] Falha ao montar o PDF:', erro instanceof Error ? erro.message : erro);
    return res.status(500).json({
      erro: 'pdf_indisponivel',
      mensagem: 'Não foi possível gerar o PDF agora. Tente novamente em instantes.',
    });
  }
}
