/**
 * O botão "Exportar PDF" do link do cliente.
 *
 * ⚠️ ELE NÃO GERA PDF — BAIXA O QUE O SERVIDOR GEROU (29/09/2026). O arquivo
 * vem de `api/_relatorio-pdf.ts` (endereço `/api/relatorio-pdf`), o mesmo endereço de onde a rotina do Drive
 * baixa. Antes o botão montava o documento no navegador e oferecia "Usar
 * impressão" como plano B; eram dois PDFs diferentes do mesmo relatório, e a
 * decisão do PO foi um gerador só. Não volte a gerar no navegador nem a
 * oferecer a impressão da página como PDF.
 */
import { useState } from 'react';

import type { SnapshotMontado } from '../blocos/tipos';
import { nomeDoArquivoPdf } from './nomeDoArquivo';

export { nomeDoArquivoPdf };

interface Props {
  /** Token do link; é a credencial que o servidor confere. */
  token: string;
  snapshot: SnapshotMontado;
}

export default function BotaoPdfRelatorio({ token, snapshot }: Props) {
  const [gerando, setGerando] = useState(false);
  const [erro, setErro] = useState(false);

  async function baixar() {
    if (gerando) return;
    setGerando(true);
    setErro(false);
    try {
      const resposta = await fetch(`/api/relatorio-pdf?token=${encodeURIComponent(token)}`, {
        credentials: 'omit',
        referrerPolicy: 'no-referrer',
      });
      if (!resposta.ok || !(resposta.headers.get('content-type') ?? '').includes('application/pdf')) {
        throw new Error(`HTTP ${resposta.status}`);
      }
      const arquivo = await resposta.blob();
      const url = URL.createObjectURL(arquivo);
      const link = document.createElement('a');
      link.href = url;
      link.download = nomeDoArquivoPdf(snapshot);
      link.rel = 'noopener';
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1_000);
    } catch (falha) {
      console.error('[relatorio-pdf] Falha ao baixar o documento.', falha);
      setErro(true);
    } finally {
      setGerando(false);
    }
  }

  return (
    <div className="dc-topo__pdf">
      <button
        type="button"
        className="dc-topo__imprimir"
        onClick={() => void baixar()}
        disabled={gerando}
        aria-busy={gerando}
      >
        {gerando ? 'Gerando PDF…' : 'Exportar PDF'}
      </button>
      {erro && (
        <span className="dc-topo__pdf-erro" role="alert">
          Não foi possível gerar agora. Tente de novo em instantes.
        </span>
      )}
    </div>
  );
}
