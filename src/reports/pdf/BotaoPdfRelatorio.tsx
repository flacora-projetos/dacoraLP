import { useState } from 'react';

import fonteRegular from '@expo-google-fonts/red-hat-display/400Regular/RedHatDisplay_400Regular.ttf?url';
import fonteMedia from '@expo-google-fonts/red-hat-display/500Medium/RedHatDisplay_500Medium.ttf?url';
import fonteNegrita from '@expo-google-fonts/red-hat-display/700Bold/RedHatDisplay_700Bold.ttf?url';

import type { AnalisePublicada } from '../analisePublicada';
import type { SnapshotMontado } from '../blocos/tipos';

interface Props {
  snapshot: SnapshotMontado;
  analisesPublicadas: AnalisePublicada[];
  observacoesPublicas: Array<{ secao: string; texto: string }>;
}

const semAcento = (valor: string) => valor
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-zA-Z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '');

export function nomeDoArquivoPdf(snapshot: SnapshotMontado): string {
  const cliente = semAcento(snapshot.identidade.clienteNome) || 'Cliente';
  const competencia = semAcento(snapshot.identidade.competencia) || 'periodo';
  return `Dacora-${cliente}-${competencia}-v${snapshot.publicacao.versao}.pdf`;
}

export default function BotaoPdfRelatorio({ snapshot, analisesPublicadas, observacoesPublicas }: Props) {
  const [gerando, setGerando] = useState(false);
  const [erro, setErro] = useState(false);

  async function baixar() {
    if (gerando) return;
    setGerando(true);
    setErro(false);
    try {
      const [{ pdf }, modulo] = await Promise.all([
        import('@react-pdf/renderer'),
        import('./RelatorioPdf'),
      ]);
      modulo.registrarFontesDoRelatorioPdf({
        regular: fonteRegular,
        medium: fonteMedia,
        bold: fonteNegrita,
      });
      const documento = modulo.default({ snapshot, analisesPublicadas, observacoesPublicas });
      const arquivo = await pdf(documento).toBlob();
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
      console.error('[relatorio-pdf] Falha ao gerar o documento.', falha);
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
          Não foi possível gerar agora.{' '}
          <button type="button" className="dc-topo__pdf-fallback" onClick={() => window.print()}>
            Usar impressão
          </button>
        </span>
      )}
    </div>
  );
}
