import { createHash } from 'node:crypto';

export function checksumDoConteudo(alvo: Record<string, any>): string {
  const { audios: _audios, ...dadosSemAudio } = alvo.dados ?? {};
  const semCarimbo = {
    ...alvo,
    fontes: (alvo.fontes ?? []).map(({ coletadoEm, ...resto }: any) => resto),
    montagem: (alvo.montagem ?? []).filter((bloco: any) => bloco?.bloco !== 'AUDIO'),
    dados: dadosSemAudio,
  };

  return createHash('sha256').update(JSON.stringify(semCarimbo)).digest('hex').slice(0, 32);
}
