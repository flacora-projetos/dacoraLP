export type ModoAnaliseUI = 'automatico' | 'deepseek_flash' | 'deepseek_pro' | 'sonnet';

export const OPCOES_MODO_ANALISE: Array<{ valor: ModoAnaliseUI; rotulo: string }> = [
  { valor: 'automatico', rotulo: 'Automatico (Flash > Pro > Sonnet)' },
  { valor: 'deepseek_flash', rotulo: 'DeepSeek V4 Flash (sem fallback)' },
  { valor: 'deepseek_pro', rotulo: 'DeepSeek V4 Pro (sem fallback)' },
  { valor: 'sonnet', rotulo: 'Claude Sonnet (sem fallback)' },
];

export function rotuloDaAuditoria(modelo?: string | null): string | null {
  if (!modelo) return null;
  const partes = modelo.split('/').filter(Boolean);
  const primeiro = partes[0] as ModoAnaliseUI | undefined;
  const modoConhecido = primeiro && OPCOES_MODO_ANALISE.some((opcao) => opcao.valor === primeiro);
  if (modoConhecido && primeiro && partes.length >= 3) {
    const modeloReal = partes.slice(2).join('/');
    const modoRotulo = OPCOES_MODO_ANALISE.find((opcao) => opcao.valor === primeiro)?.rotulo ?? primeiro;
    return `${modoRotulo} · resposta ${modeloReal}`;
  }
  if (partes.length >= 2) return `Resposta ${partes.slice(1).join('/')}`;
  return `Resposta ${modelo}`;
}
