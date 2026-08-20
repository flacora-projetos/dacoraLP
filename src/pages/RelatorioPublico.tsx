import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import RelatorioMontado from '../reports/RelatorioMontado';
import { formatarCompetencia } from '../reports/format';
import type { SnapshotMontado } from '../reports/blocos/tipos';

interface RelatorioExterno {
  clienteNome: string;
  competencia: string;
  versao: number;
  conteudoCarregado: true;
  snapshot: SnapshotMontado;
  observacoesPublicas?: Array<{ secao: string; texto: string }>;
}

export function RelatorioPublicoApresentado({ relatorio }: { relatorio: RelatorioExterno }) {
  return (
    <RelatorioMontado
      snapshot={relatorio.snapshot}
      proposta="B"
      competencias={[{
        competencia: relatorio.competencia,
        rotulo: formatarCompetencia(relatorio.competencia),
        publicada: true,
      }]}
      observacoesPublicas={relatorio.observacoesPublicas ?? []}
    />
  );
}

export default function RelatorioPublico() {
  const { token = '' } = useParams();
  const [relatorio, setRelatorio] = useState<RelatorioExterno | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [tentativa, setTentativa] = useState(0);

  useEffect(() => {
    const controle = new AbortController();
    setRelatorio(null);
    setErro(null);

    async function carregar() {
      try {
        const resposta = await fetch(`/api/relatorio-publico?token=${encodeURIComponent(token)}`, {
          signal: controle.signal,
          credentials: 'omit',
          referrerPolicy: 'no-referrer',
        });
        const corpo = await resposta.json().catch(() => null);
        if (!resposta.ok || corpo?.relatorio?.conteudoCarregado !== true) {
          setErro(String(corpo?.mensagem ?? 'Este relatório não está disponível.'));
          return;
        }
        setRelatorio(corpo.relatorio as RelatorioExterno);
      } catch (falha) {
        if ((falha as Error)?.name !== 'AbortError') {
          setErro('Não foi possível carregar o relatório agora. Verifique a conexão e tente novamente.');
        }
      }
    }

    if (token) void carregar();
    else setErro('Este relatório não está disponível.');
    return () => controle.abort();
  }, [token, tentativa]);

  if (relatorio) return <RelatorioPublicoApresentado relatorio={relatorio} />;

  return (
    <main className="dc-publico-estado" role={erro ? 'alert' : 'status'} aria-live="polite">
      <div>
        <p className="dc-capa__eyebrow">Dácora Performance Digital</p>
        <h1>{erro ? 'Relatório indisponível' : 'Carregando relatório…'}</h1>
        {erro && <p>{erro}</p>}
        {erro && (
          <button type="button" className="dcp-botao dcp-botao--primario" onClick={() => setTentativa(valor => valor + 1)}>
            Tentar novamente
          </button>
        )}
      </div>
    </main>
  );
}
