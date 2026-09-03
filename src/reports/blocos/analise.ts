import type { BlocoConfigurado, DadosDeBloco, SnapshotMontado } from './tipos';

export interface EspacoAnalitico {
  secao: `bloco:${string}`;
  blocoId: string;
  titulo: string;
  objetivo: string;
  fonte: unknown;
}

const OBJETIVOS_ANALITICOS = {
  B1: 'Selecione o movimento mais relevante dos indicadores e explique sua implicação prática sem enumerar todos os números.',
  B2: 'Identifique concentração, eficiência ou risco entre as entidades e destaque o que merece decisão, sem recontar a tabela.',
  B3: 'Interprete a trajetória entre períodos, procurando mudança de padrão e evidência útil para explicar o mês.',
  B4: 'Compare os criativos e destaque o padrão de desempenho que pode orientar a próxima decisão, sem atribuir causa não observada.',
  B5: 'Investigue a distribuição ao longo do mês, procurando interrupções, picos ou mudanças de ritmo sustentadas pela série.',
  B6: 'Interprete a distribuição por dimensão e destaque concentração, oportunidade ou perda de eficiência relevante.',
} as const;

const CHAVES_SENSIVEIS = /(?:caminho|path|arquivo|token|secret|senha|url|href|audio|base64)/i;

function projetarFonte(valor: unknown, profundidade = 0): unknown {
  if (profundidade > 8 || valor === null || typeof valor === 'boolean' || typeof valor === 'number') return valor;
  if (typeof valor === 'string') return valor.startsWith('data:') ? '[conteúdo removido]' : valor;
  if (Array.isArray(valor)) return valor.map((item) => projetarFonte(item, profundidade + 1));
  if (typeof valor !== 'object') return null;
  return Object.fromEntries(
    Object.entries(valor as Record<string, unknown>)
      .filter(([chave]) => !CHAVES_SENSIVEIS.test(chave))
      .map(([chave, item]) => [chave, projetarFonte(item, profundidade + 1)]),
  );
}

function fonteDoBloco(config: BlocoConfigurado, dados: DadosDeBloco): unknown {
  switch (config.bloco) {
    case 'B1': {
      const faixa = dados.faixas[config.faixa];
      if (!config.funil) return faixa;
      return { faixa, funil: dados.funis?.[config.funil] ?? null };
    }
    case 'B2': return dados.tabelas[config.tabela];
    case 'B3': return dados.evolucoesMensais[config.evolucao];
    case 'B4': return dados.rankingsCriativos[config.ranking];
    case 'B5': return dados.series?.[config.serie];
    case 'B6': return dados.quebras[config.quebra];
    case 'B7':
    case 'B8':
    case 'AUDIO':
      return null;
  }
}

export function espacoAnaliticoDoBloco(config: BlocoConfigurado, dados: DadosDeBloco): EspacoAnalitico | null {
  if (config.indisponivel || !(config.bloco in OBJETIVOS_ANALITICOS)) return null;
  const fonte = fonteDoBloco(config, dados);
  if (!fonte) return null;
  return {
    secao: `bloco:${config.id}`,
    blocoId: config.id,
    titulo: config.titulo,
    objetivo: OBJETIVOS_ANALITICOS[config.bloco as keyof typeof OBJETIVOS_ANALITICOS],
    fonte: projetarFonte({
      titulo: config.titulo,
      apoio: config.apoio ?? null,
      pergunta: config.bloco === 'B2' ? config.pergunta : null,
      dados: fonte,
    }),
  };
}

export function espacosAnaliticosDoSnapshot(snapshot: SnapshotMontado): EspacoAnalitico[] {
  return snapshot.montagem
    .map((config) => espacoAnaliticoDoBloco(config, snapshot.dados))
    .filter((espaco): espaco is EspacoAnalitico => espaco !== null);
}
