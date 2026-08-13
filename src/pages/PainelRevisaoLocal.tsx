/** Fixture local da RA1: revisão completa sem consultar ou persistir no Supabase. */
import { Navigate } from 'react-router-dom';
import { RevisaoApresentada } from '../painel/Revisao';
import type { RelatorioDaRevisao } from '../painel/RevisaoMoldura';
import { karyneMontada202607 } from '../reports/fixtures/karyne-montada-2026-07';

const snapshot = structuredClone(karyneMontada202607);
snapshot.analysisContext = {
  versao: 'analysis_context_v1',
  competencia: '2026-07',
  fatos: [
    { id: 'meta_investimento', plataforma: 'meta', tipo: 'investimento', rotulo: 'Investimento', unidade: 'brl', atual: 863.91, base: 967.73, competenciaBase: '2026-06', variacao: -0.1073 },
    { id: 'meta_resultado', plataforma: 'meta', tipo: 'resultado', rotulo: 'Leads', unidade: 'inteiro', atual: 22, base: 85, competenciaBase: '2026-06', variacao: -0.7412 },
    { id: 'google_investimento', plataforma: 'google', tipo: 'investimento', rotulo: 'Investimento', unidade: 'brl', atual: 1000.98, base: 1100.5, competenciaBase: '2026-06', variacao: -0.0904 },
    { id: 'google_conversoes', plataforma: 'google', tipo: 'resultado', rotulo: 'Leads', unidade: 'inteiro', atual: 16, base: 36, competenciaBase: '2026-06', variacao: -0.5556 },
  ],
  relacoes: [
    { tipo: 'investimento_resultado', plataforma: 'meta', sustentadaPor: ['meta_investimento', 'meta_resultado'], texto: 'Investimento caiu enquanto leads caíram na mesma comparação.' },
    { tipo: 'investimento_resultado', plataforma: 'google', sustentadaPor: ['google_investimento', 'google_conversoes'], texto: 'Investimento caiu enquanto leads caíram na mesma comparação.' },
  ],
  limitacoes: [],
};
snapshot.leitura.resumoExecutivo = [
  { texto: 'O principal movimento observado foi: investimento e leads caíram nas comparações disponíveis.', sustentadaPor: ['meta_investimento', 'meta_resultado', 'google_investimento', 'google_conversoes'] },
  { texto: 'Meta Ads registrou 22 leads e Google Ads registrou 16 leads.', sustentadaPor: ['meta_resultado', 'google_conversoes'] },
];

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
