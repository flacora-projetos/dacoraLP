export const situacoesPropostas = {
  'sem-situacao': 'Sem situação',
  enviada: 'Enviada',
  negociacao: 'Em negociação',
  fechada: 'Fechada',
  'sem-acordo': 'Sem acordo',
} as const;

export type SituacaoProposta = keyof typeof situacoesPropostas;

export type Proposta = {
  slug: string;
  cliente: string;
  titulo: string;
  valor_centavos: number | null;
  situacao: SituacaoProposta;
  revisao: number;
};

export type RegistroProposta = {
  situacao: SituacaoProposta;
  autor: string;
  criado_em: string;
};
