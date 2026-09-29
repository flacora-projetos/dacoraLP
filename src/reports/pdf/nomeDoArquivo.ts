import type { SnapshotMontado } from '../blocos/tipos';
import { marcaDoRelatorio } from '../marcas.js';

const semAcento = (valor: string) => valor
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-zA-Z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '');

/**
 * Nome estável do arquivo: marca, cliente, competência e versão — sem
 * acento e sem identificador interno. A marca abre o nome porque é o que o
 * cliente reconhece na pasta dele (Allgrotech ou Dácora).
 */
export function nomeDoArquivoPdf(snapshot: SnapshotMontado): string {
  const marca = marcaDoRelatorio(snapshot.identidade).prefixoArquivo;
  const cliente = semAcento(snapshot.identidade.clienteNome) || 'Cliente';
  const competencia = semAcento(snapshot.identidade.competencia) || 'periodo';
  return `${marca}-${cliente}-${competencia}-v${snapshot.publicacao.versao}.pdf`;
}
