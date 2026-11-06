import type { SnapshotMontado } from '../blocos/tipos';
import { marcaDoRelatorio } from '../marcas.js';
import { ehTrimestral, rotuloDoPeriodo } from '../produto.js';

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
  /* Trimestral e mensal do último mês têm a mesma competência: sem isto, os dois saem com o mesmo nome. */
  const competencia = semAcento(ehTrimestral(snapshot.identidade)
    ? rotuloDoPeriodo(snapshot.identidade, true)
    : snapshot.identidade.competencia) || 'periodo';
  /* O relatório da própria agência não repete o nome: "Allgrotech-2026-08", não "Allgrotech-AllgroTech-2026-08". */
  const prefixo = cliente.toLowerCase() === marca.toLowerCase() ? marca : `${marca}-${cliente}`;
  return `${prefixo}-${competencia}-v${snapshot.publicacao.versao}.pdf`;
}
