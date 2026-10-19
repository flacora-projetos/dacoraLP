/** Fixture local da RA3: revisão completa sem consultar ou persistir no Supabase. */
import { Navigate } from 'react-router-dom';
import '../painel/painel.css';
import { RevisaoApresentada } from '../painel/Revisao';
import type { RelatorioDaRevisao } from '../painel/RevisaoMoldura';
import type { AcaoAnalisesUI, ResultadoAnalisesUI, SugestaoSecao } from '../painel/AnalisesSecao';
import { espacosAnaliticosDoSnapshot } from '../reports/blocos/analise';
import { karyneMontada202607 } from '../reports/fixtures/karyne-montada-2026-07';
import { textoDosItens, type ContextoSugerido } from '../painel/contextoSugerido';

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
const sugestaoLocal: ContextoSugerido = {
  versao: 1, clienteSlug: snapshot.identidade.clienteSlug, competencia: snapshot.identidade.competencia,
  desde: snapshot.identidade.periodo.inicio, ate: snapshot.identidade.periodo.fim,
  geradoEm: '2026-08-01T10:00:00Z', total: 2, omitidos: 0,
  avisos: ['Demonstração local: registros sintéticos, sem consulta à conta do cliente.'],
  itens: [
    { id: 'demo-decisao', tipo: 'decisao', data: '2026-07-10', fonte: 'Demonstração', texto: 'Decisão de testar uma nova página.', peso: 70 },
    { id: 'demo-mudanca', tipo: 'mudanca', data: '2026-07-15', fonte: 'Demonstração', texto: 'Troca da página registrada na plataforma.', peso: 50 },
  ],
};

async function analisarLocalmente(
  acao: AcaoAnalisesUI,
  dados?: { secao?: string; sugestao?: SugestaoSecao; texto?: string; contexto?: string; itensIds?: string[] },
): Promise<ResultadoAnalisesUI> {
  if (acao === 'carregar') return { contexto: { texto: 'Em julho houve mudança da página de destino e uma promoção entre os dias 15 e 21.' }, contextoSugerido: sugestaoLocal, sugestoes: [], espacos };
  if (acao === 'organizar_contexto') return { contextoOrganizado: textoDosItens(sugestaoLocal.itens.filter(i => dados?.itensIds?.includes(i.id)).reverse()) };
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
  return <div className="dc-painel"><RevisaoApresentada relatorio={relatorio} aoAnalisarSecoes={analisarLocalmente} /></div>;
}
