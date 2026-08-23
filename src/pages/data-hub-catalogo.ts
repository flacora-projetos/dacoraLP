/*
 * Catálogo controlado da PWI1.
 *
 * Nada aqui vem do Data Hub. São dados de demonstração, escritos à mão, para
 * provar o fluxo da tela antes de existir catálogo real. Este repositório é
 * público: nenhum nome, ID ou número real de cliente entra neste arquivo.
 *
 * Na PWI2 este módulo é substituído por catálogo vindo do backend. Quem fizer
 * essa troca deve manter os mesmos tipos, para a tela não precisar mudar junto.
 */

export const CATALOGO_E_DEMONSTRATIVO = true;

export type NivelEntidade = 'conta' | 'campanha' | 'conjunto' | 'anuncio';

export type Conta = {
  readonly id: string;
  readonly nome: string;
};

export type Campo = {
  readonly id: string;
  readonly nome: string;
  /*
   * Classificação que o HANDOFF do Data Hub exige carregar até o fim: somar
   * alcance de dois dias não dá o alcance do período, e CTR não se soma nunca.
   * A tela precisa dizer isso antes de o número existir, não depois.
   */
  readonly natureza: 'aditiva' | 'calculada' | 'nao-aditiva';
};

export type Breakdown = {
  readonly id: string;
  readonly nome: string;
  readonly niveisCompativeis: readonly NivelEntidade[];
};

export type Granularidade = 'diaria' | 'semanal' | 'mensal';

export type Periodo = {
  readonly id: string;
  readonly nome: string;
  readonly dias: number;
};

export const CONTAS: readonly Conta[] = [
  { id: 'demo-001', nome: 'Conta de demonstração — Serviços' },
  { id: 'demo-002', nome: 'Conta de demonstração — Varejo' },
  { id: 'demo-003', nome: 'Conta de demonstração — Saúde' },
];

export const NIVEIS: readonly { id: NivelEntidade; nome: string }[] = [
  { id: 'conta', nome: 'Conta' },
  { id: 'campanha', nome: 'Campanha' },
  { id: 'conjunto', nome: 'Conjunto' },
  { id: 'anuncio', nome: 'Anúncio' },
];

export const CAMPOS: readonly Campo[] = [
  { id: 'spend', nome: 'Investimento', natureza: 'aditiva' },
  { id: 'impressions', nome: 'Impressões', natureza: 'aditiva' },
  { id: 'clicks', nome: 'Cliques', natureza: 'aditiva' },
  { id: 'reach', nome: 'Alcance', natureza: 'nao-aditiva' },
  { id: 'frequency', nome: 'Frequência', natureza: 'nao-aditiva' },
  { id: 'ctr', nome: 'CTR', natureza: 'calculada' },
  { id: 'cpc', nome: 'CPC', natureza: 'calculada' },
  { id: 'cpm', nome: 'CPM', natureza: 'calculada' },
];

export const BREAKDOWNS: readonly Breakdown[] = [
  { id: 'nenhum', nome: 'Sem breakdown', niveisCompativeis: ['conta', 'campanha', 'conjunto', 'anuncio'] },
  { id: 'demografico', nome: 'Idade e gênero', niveisCompativeis: ['campanha', 'conjunto', 'anuncio'] },
  { id: 'geografico', nome: 'Região', niveisCompativeis: ['campanha', 'conjunto', 'anuncio'] },
  { id: 'posicionamento', nome: 'Posicionamento e dispositivo', niveisCompativeis: ['conjunto', 'anuncio'] },
];

export const PERIODOS: readonly Periodo[] = [
  { id: 'ultimos-7', nome: 'Últimos 7 dias', dias: 7 },
  { id: 'ultimos-14', nome: 'Últimos 14 dias', dias: 14 },
  { id: 'ultimos-30', nome: 'Últimos 30 dias', dias: 30 },
  { id: 'ultimos-90', nome: 'Últimos 90 dias', dias: 90 },
];

export const GRANULARIDADES: readonly { id: Granularidade; nome: string; dias: number }[] = [
  { id: 'diaria', nome: 'Diária', dias: 1 },
  { id: 'semanal', nome: 'Semanal', dias: 7 },
  { id: 'mensal', nome: 'Mensal', dias: 30 },
];

export type Rascunho = {
  contaId: string;
  nivel: NivelEntidade;
  campos: readonly string[];
  breakdownId: string;
  periodoId: string;
  granularidade: Granularidade;
};

export const RASCUNHO_INICIAL: Rascunho = {
  contaId: '',
  nivel: 'campanha',
  campos: ['spend', 'impressions', 'clicks'],
  breakdownId: 'nenhum',
  periodoId: 'ultimos-7',
  granularidade: 'diaria',
};

export type Impedimento = { readonly campo: string; readonly mensagem: string };

/*
 * Combinação incompatível falha com mensagem clara e acionável. Nunca há
 * fallback silencioso para uma opção "parecida": trocar a escolha do usuário
 * sem avisar produz número que ninguém consegue explicar depois.
 */
export function impedimentos(rascunho: Rascunho): readonly Impedimento[] {
  const lista: Impedimento[] = [];

  if (!rascunho.contaId) {
    lista.push({ campo: 'conta', mensagem: 'Escolha a conta de origem.' });
  }

  if (rascunho.campos.length === 0) {
    lista.push({ campo: 'campos', mensagem: 'Escolha ao menos um campo para trazer.' });
  }

  const breakdown = BREAKDOWNS.find((item) => item.id === rascunho.breakdownId);
  if (breakdown && !breakdown.niveisCompativeis.includes(rascunho.nivel)) {
    const nomeNivel = NIVEIS.find((item) => item.id === rascunho.nivel)?.nome ?? rascunho.nivel;
    const compativeis = breakdown.niveisCompativeis
      .map((nivel) => NIVEIS.find((item) => item.id === nivel)?.nome ?? nivel)
      .join(', ');
    lista.push({
      campo: 'breakdown',
      mensagem: `${breakdown.nome} não existe no nível ${nomeNivel}. Use ${compativeis}, ou volte para "Sem breakdown".`,
    });
  }

  const periodo = PERIODOS.find((item) => item.id === rascunho.periodoId);
  const granularidade = GRANULARIDADES.find((item) => item.id === rascunho.granularidade);
  if (periodo && granularidade && granularidade.dias > periodo.dias) {
    lista.push({
      campo: 'granularidade',
      mensagem: `Granularidade ${granularidade.nome.toLowerCase()} não cabe em ${periodo.nome.toLowerCase()}. Amplie o período ou use uma granularidade menor.`,
    });
  }

  return lista;
}

/*
 * Aviso é diferente de impedimento: a consulta é possível, mas grande. O
 * usuário decide, com a recomendação à vista. Bloquear aqui seria decidir por ele.
 */
export function avisoDeVolume(rascunho: Rascunho): string | null {
  const periodo = PERIODOS.find((item) => item.id === rascunho.periodoId);
  if (!periodo) return null;
  const detalhaPorDia = rascunho.granularidade === 'diaria';
  const temBreakdown = rascunho.breakdownId !== 'nenhum';
  const nivelFino = rascunho.nivel === 'anuncio' || rascunho.nivel === 'conjunto';
  if (periodo.dias >= 90 && detalhaPorDia && temBreakdown && nivelFino) {
    return 'Esta combinação gera muitas linhas: 90 dias, detalhe diário, breakdown e nível fino ao mesmo tempo. Considere dividir em períodos menores ou agendar uma atualização incremental.';
  }
  return null;
}

export function naturezaDosCamposEscolhidos(rascunho: Rascunho): readonly Campo[] {
  return CAMPOS.filter((campo) => rascunho.campos.includes(campo.id));
}
