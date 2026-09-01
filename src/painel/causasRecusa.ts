export const CATALOGO_CAUSAS_RECUSA = '2026-09-01.v1';

export type IdCausaRecusa =
  | 'metrica_obrigatoria_ausente'
  | 'periodo_medicao_incorreto'
  | 'resultado_fora_do_contrato'
  | 'inconsistencia_entre_blocos'
  | 'apresentacao_visual'
  | 'outra_causa';

export type CausaRecusa = { causeId: IdCausaRecusa; parameters: Record<string, unknown> };

export const OPCOES_CAUSA_RECUSA: ReadonlyArray<{
  id: IdCausaRecusa;
  titulo: string;
  apoio: string;
  manual: boolean;
}> = [
  {
    id: 'metrica_obrigatoria_ausente',
    titulo: 'Falta um número',
    apoio: 'Um dado que deveria estar na página não aparece, ou aparece vazio.',
    manual: false,
  },
  {
    id: 'periodo_medicao_incorreto',
    titulo: 'Os números são de outro período',
    apoio: 'Os dados não batem com o mês que o relatório diz estar mostrando.',
    manual: false,
  },
  {
    id: 'resultado_fora_do_contrato',
    titulo: 'O resultado contado está errado',
    apoio: 'O relatório conta uma coisa como resultado, e o combinado com o cliente é outra.',
    manual: false,
  },
  {
    id: 'inconsistencia_entre_blocos',
    titulo: 'O mesmo número aparece diferente',
    apoio: 'Um valor aparece de um jeito numa parte e de outro jeito em outra.',
    manual: false,
  },
  {
    id: 'apresentacao_visual',
    titulo: 'Problema de leitura ou de layout',
    apoio: 'Texto cortado, sobreposto, tabela estourando, algo difícil de ler.',
    manual: true,
  },
  {
    id: 'outra_causa',
    titulo: 'Outra coisa',
    apoio: 'Não é nenhum dos casos acima. Você escreve o que precisa mudar.',
    manual: true,
  },
];

export const PLATAFORMAS_CAUSA = ['meta', 'google', 'instagram', 'ga4', 'crm', 'ecommerce', 'pinterest'] as const;

/** Mesmo teto do catálogo da fábrica e da tabela filha. */
export const MAXIMO_CAUSAS_RECUSA = 5;

/**
 * O contrato de métrica é DERIVADO do snapshot, nunca digitado.
 *
 * `metric_contract_id` é `plataforma:idDaMétrica`, e a fábrica reconhece um
 * caso especial — `google:conversoes_totais` — que não corresponde ao id de
 * nenhum fato (o fato é `google_conversoes_totais`). Digitar isso à mão devolve
 * pela porta dos fundos justamente o que esta frente existe para tirar do
 * caminho: texto humano dirigindo automação. Uma vírgula errada aqui não vira
 * erro de digitação — vira ordem de correção que falha depois, longe de quem
 * escreveu, com uma frase que não diz que o problema foi o texto.
 */
export function contratosDeMetricaDoSnapshot(
  metricas: ReadonlyArray<{ id: string; rotulo: string; plataforma: string }>,
): Array<{ id: string; rotulo: string }> {
  const contratos = new Map<string, string>();
  for (const metrica of metricas) {
    const prefixo = `${metrica.plataforma}_`;
    const nu = metrica.id.startsWith(prefixo) ? metrica.id.slice(prefixo.length) : metrica.id;
    // O id canônico do fato sempre funciona; a forma sem o prefixo é a que a
    // fábrica trata como caso especial. Oferecer as duas seria oferecer uma
    // escolha que quem recusa não tem como fazer.
    const id = nu === 'conversoes_totais' ? `${metrica.plataforma}:${nu}` : `${metrica.plataforma}:${metrica.id}`;
    if (!contratos.has(id)) contratos.set(id, `${metrica.rotulo} · ${metrica.plataforma}`);
  }
  return [...contratos].map(([id, rotulo]) => ({ id, rotulo }));
}

export function causaEhManual(id: IdCausaRecusa) {
  return id === 'apresentacao_visual' || id === 'outra_causa';
}

export function resumoHumanoDasCausas(causas: CausaRecusa[]): string {
  return causas.map((causa) => {
    const titulo = OPCOES_CAUSA_RECUSA.find((item) => item.id === causa.causeId)?.titulo ?? causa.causeId;
    const descricao = typeof causa.parameters.description === 'string' ? causa.parameters.description.trim() : '';
    return descricao ? `${titulo}: ${descricao}` : titulo;
  }).join('; ').slice(0, 600);
}
