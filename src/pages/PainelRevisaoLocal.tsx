/** Fixture local da RA3: revisão completa sem consultar ou persistir no Supabase. */
import { Navigate } from 'react-router-dom';
import { RevisaoApresentada } from '../painel/Revisao';
import type { RelatorioDaRevisao } from '../painel/RevisaoMoldura';
import type { AcaoAnalisesUI, ResultadoAnalisesUI, SugestaoSecao } from '../painel/AnalisesSecao';
import { espacosAnaliticosDoSnapshot } from '../reports/blocos/analise';
import { karyneMontada202607 } from '../reports/fixtures/karyne-montada-2026-07';

const snapshot = structuredClone(karyneMontada202607);

const relatorio: RelatorioDaRevisao = {
  id: 'fixture-local-ra1-karyne-2026-07',
  clienteNome: snapshot.identidade.clienteNome,
  competencia: snapshot.identidade.competencia,
  versao: snapshot.publicacao.versao,
  estado: snapshot.publicacao.estado,
  sinais: [],
  conteudoCarregado: true,
  snapshot,
  checksum: snapshot.publicacao.checksum,
  podeDecidir: true,
};

const espacos = espacosAnaliticosDoSnapshot(snapshot).map(({ secao, blocoId, titulo, objetivo }) => ({ secao, blocoId, titulo, objetivo }));

async function analisarLocalmente(
  acao: AcaoAnalisesUI,
  dados?: { secao?: string; sugestao?: SugestaoSecao; texto?: string; contexto?: string },
): Promise<ResultadoAnalisesUI> {
  if (acao === 'carregar') return { contexto: { texto: 'Em julho houve mudança da página de destino e uma promoção entre os dias 15 e 21.' }, sugestoes: [], espacos };
  if (acao === 'salvar_contexto') return { contexto: { texto: dados?.contexto ?? '', atualizadoPor: 'fixture-local' } };
  const alvos = acao === 'gerar_secao' ? espacos.filter((item) => item.secao === dados?.secao) : espacos;
  if (acao === 'gerar_todas' || acao === 'gerar_secao') {
    return { sugestoes: alvos.map((espaco, indice) => ({
      id: `fixture-${espaco.blocoId}-${indice}`,
      secao: espaco.secao,
      estado: 'pronta',
      texto: espaco.blocoId.includes('meta')
        ? 'A melhora na segunda metade do mês coincidiu com a promoção e com a troca da página. O contexto ajuda a priorizar essa janela, mas não prova sozinho qual mudança causou o resultado.'
        : `Esta seção concentra um movimento útil para decisão em ${espaco.titulo.toLowerCase()}, sem transformar coincidência em causa confirmada.`,
      checksum: snapshot.publicacao.checksum,
    })) };
  }
  const atual: SugestaoSecao = {
    ...(dados?.sugestao ?? { id: 'fixture-local', secao: dados?.secao ?? '', texto: '', checksum: snapshot.publicacao.checksum, estado: 'pronta' }),
    estado: acao === 'editar' ? 'editada' : acao === 'desfazer' ? 'desfeita' : 'aplicada',
    texto: acao === 'editar' ? (dados?.texto ?? '') : (dados?.sugestao?.texto ?? ''),
  };
  return { sugestao: atual };
}

export default function PainelRevisaoLocal() {
  if (!import.meta.env.DEV) return <Navigate to="/painel-de-relatorios" replace />;
  return <RevisaoApresentada relatorio={relatorio} aoAnalisarSecoes={analisarLocalmente} />;
}
