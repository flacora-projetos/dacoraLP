// Visão geral da reunião: contrato do conteúdo e aplicação das correções da equipe.
// O mesmo contrato é validado na Dácora (OpenClaw-Dacora, src/lib/reunioes-visao.js)
// antes de gravar; a regra de "a última correção de cada item vale" existe nos dois
// lados porque a Dácora também aplica as correções antes de sugerir contexto ao mensal.

export type SecaoVisao =
  | 'ponto'
  | 'decisao'
  | 'conclusao'
  | 'passo'
  | 'pendencia'
  | 'analise'
  | 'oportunidade'
  | 'risco';
export type TipoItem = 'fato' | 'decisao' | 'ia';
export interface ItemVisao {
  id: string;
  secao: SecaoVisao;
  tipo: TipoItem;
  texto: string;
  trecho: string;
  fonte: 'transcricao' | 'slack';
  quem?: string | null;
  prazo?: string | null;
}
export interface ConteudoVisao {
  versao: 1;
  executivo: string;
  itens: ItemVisao[];
}
export interface Visao {
  conteudo: ConteudoVisao;
  fontes: { transcricao?: boolean; slack?: string | null };
  conta: string;
  gerada_em: string;
  transcricao_lida_em: string;
}
export interface CorrecaoVisao {
  id: string;
  item_id: string;
  acao: 'corrigir' | 'nao_procede' | 'restaurar';
  texto: string | null;
  autor_nome: string;
  criado_em: string;
}
export type EstadoItem = 'original' | 'corrigido' | 'descartado';
export interface ItemEfetivo extends ItemVisao {
  original: string;
  estado: EstadoItem;
  corrigido_por?: string;
  corrigido_em?: string;
}

export const SECOES: Array<{ id: SecaoVisao; titulo: string; nota: string }> = [
  { id: 'ponto', titulo: 'Principais pontos', nota: 'o que foi dito' },
  { id: 'decisao', titulo: 'Decisões', nota: 'só o que foi decidido em voz alta' },
  { id: 'conclusao', titulo: 'Conclusões', nota: 'leitura da IA' },
  { id: 'passo', titulo: 'Próximos passos', nota: 'quem e quando, se foi combinado' },
  { id: 'pendencia', titulo: 'Pendências e perguntas em aberto', nota: 'o que ficou sem resposta' },
  { id: 'analise', titulo: 'O que isso significa para o cliente', nota: 'leitura da IA' },
  { id: 'oportunidade', titulo: 'Oportunidades', nota: 'leitura da IA, com o trecho que a sustenta' },
  { id: 'risco', titulo: 'Riscos', nota: 'leitura da IA, com o trecho que a sustenta' },
];

function ordenar(correcoes: CorrecaoVisao[]) {
  return [...correcoes].sort(
    (a, b) => a.criado_em.localeCompare(b.criado_em) || a.id.localeCompare(b.id),
  );
}

/** Aplica as correções: a última de cada item vale. O texto original nunca se perde. */
export function aplicarCorrecoes(conteudo: ConteudoVisao, correcoes: CorrecaoVisao[]) {
  const ultima = new Map<string, CorrecaoVisao>();
  for (const c of ordenar(correcoes)) ultima.set(c.item_id, c);
  const efetivo = (id: string, texto: string) => {
    const c = ultima.get(id);
    if (!c || c.acao === 'restaurar') return { texto, estado: 'original' as EstadoItem };
    if (c.acao === 'nao_procede')
      return { texto, estado: 'descartado' as EstadoItem, por: c.autor_nome, em: c.criado_em };
    return { texto: c.texto ?? texto, estado: 'corrigido' as EstadoItem, por: c.autor_nome, em: c.criado_em };
  };
  const exec = efetivo('executivo', conteudo.executivo);
  return {
    executivo: { ...exec, original: conteudo.executivo },
    itens: conteudo.itens.map((i): ItemEfetivo => {
      const e = efetivo(i.id, i.texto);
      return {
        ...i,
        texto: e.texto,
        original: i.texto,
        estado: e.estado,
        ...(e.por ? { corrigido_por: e.por, corrigido_em: e.em } : {}),
      };
    }),
    versao: 1 + correcoes.length,
  };
}

/** O que pode virar sugestão de contexto no mensal: fato ou decisão, não descartado. */
export function vaiParaOMensal(item: ItemEfetivo) {
  return item.tipo !== 'ia' && item.estado !== 'descartado';
}

/** Placar da visão geral (no topo da reunião): conta só o que não foi marcado como "não procede". */
export function placarDaVisao(itens: ItemEfetivo[]) {
  const ativos = (...secoes: SecaoVisao[]) =>
    itens.filter((i) => secoes.includes(i.secao) && i.estado !== 'descartado').length;
  return [
    { id: 'decisao', rotulo: 'decisões explícitas', n: ativos('decisao') },
    { id: 'passo', rotulo: 'próximos passos', n: ativos('passo') },
    { id: 'pendencia', rotulo: 'em aberto', n: ativos('pendencia') },
    { id: 'risco', rotulo: 'riscos e oportunidades', n: ativos('risco', 'oportunidade') },
  ];
}

/** Título da agenda no formato "Parceiro | Assunto": o assunto vira título e o resto, subtítulo. Só para exibir. */
export function partirTitulo(titulo: string) {
  const partes = titulo.split(/\s+\|\s+/).map((p) => p.trim());
  return partes.length === 2 && partes[0] && partes[1]
    ? { titulo: partes[1], sub: partes[0] }
    : { titulo, sub: '' };
}
