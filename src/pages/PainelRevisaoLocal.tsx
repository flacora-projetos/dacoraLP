/** Fixture local da RA1: revisão completa sem consultar ou persistir no Supabase. */
import { Navigate } from 'react-router-dom';
import { RevisaoApresentada } from '../painel/Revisao';
import type { RelatorioDaRevisao } from '../painel/RevisaoMoldura';
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
};

export default function PainelRevisaoLocal() {
  if (!import.meta.env.DEV) return <Navigate to="/painel-de-relatorios" replace />;
  return <RevisaoApresentada relatorio={relatorio} />;
}
