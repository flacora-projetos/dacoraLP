export interface ItemContextoSugerido {
  id: string;
  tipo: 'decisao' | 'mudanca' | 'relato';
  data: string;
  fonte: string;
  texto: string;
  peso: number;
}
export interface ContextoSugerido {
  versao: 1;
  clienteSlug: string;
  competencia: string;
  desde: string;
  ate: string;
  geradoEm: string;
  itens: ItemContextoSugerido[];
  avisos: string[];
  total: number;
  omitidos: number;
}
export const rotulosContexto = { decisao: 'Decisão registrada', mudanca: 'Mudança na plataforma', relato: 'Relato da equipe' };

export function textoDosItens(itens: ItemContextoSugerido[]): string {
  return itens.map(i => `${i.data.split('-').reverse().join('/')} · ${rotulosContexto[i.tipo]} · ${i.texto} (fonte: ${i.fonte})`).join('\n');
}

export function acrescentarContexto(atual: string, sugestao: string): string {
  return [atual.trim(), sugestao.trim()].filter(Boolean).join('\n\n');
}
