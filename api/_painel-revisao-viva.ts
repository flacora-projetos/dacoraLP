/**
 * Escrita da revisão editorial durável — o modelo AV (Análise Viva).
 *
 * A decisão humana continua sendo gravada nas tabelas legadas exatamente como
 * antes; **isto aqui é um segundo registro, não uma substituição**. A razão de
 * manter os dois vivos ao mesmo tempo é factual: a fábrica ainda lê o legado
 * na hora de transportar o trabalho para o modelo AV, e um relatório que nunca
 * passou pela ponte só tem a fonte legada.
 *
 * ⚠️ **Falha aqui nunca derruba a resposta ao revisor**, e isso é deliberado.
 * Quando esta função é chamada, a gravação legada JÁ aconteceu e é durável — a
 * ponte da fábrica a transporta na próxima coleta, venha de onde vier. Devolver
 * erro ao navegador faria a pessoa repetir uma ação que já teve efeito, que é
 * exatamente o risco que o resto deste painel gasta linhas para evitar. O que
 * a função faz é relatar o que aconteceu, para quem chama registrar no log.
 */
import type { ConfiguracaoEditorial } from './_painel-estado-editorial.js';

export interface RegistroDeRevisaoViva {
  relatorioId: string;
  checksumDocumento: string;
  /**
   * `relatorios.checksum_factual_editorial`. Nulo em documento legado. Nulo
   * não é falha e não é "fatos iguais": é ausência de medição, e o modelo AV
   * recusa registrar decisão sem ela — com razão, porque é a impressão digital
   * que diz sobre QUAIS fatos a pessoa decidiu.
   */
  checksumFactual: string | null;
  secao: string;
  tipoDecisao: 'analise' | 'sem_analise';
  /** Obrigatório em `analise`, obrigatoriamente nulo em `sem_analise`. */
  texto: string | null;
  por: string;
  origemSugestaoId?: string | null;
}

export type ResultadoDaRevisaoViva =
  /** Gravada no modelo AV. */
  | 'registrada'
  /** O documento não tem impressão digital factual — esperado no legado. */
  | 'sem_impressao_digital'
  /** Tentou e não conseguiu. O registro legado continua de pé. */
  | 'falhou';

export interface RegistroDeContextoVivo {
  relatorioId: string;
  checksumDocumento: string;
  checksumFactual: string | null;
  contexto: string;
  por: string;
}

export async function salvarContextoVivo(
  registro: RegistroDeContextoVivo,
  config: ConfiguracaoEditorial,
): Promise<ResultadoDaRevisaoViva> {
  if (!registro.checksumFactual) return 'sem_impressao_digital';

  try {
    const resposta = await fetch(`${config.urlSupabase}/rest/v1/rpc/salvar_contexto_editorial_relatorio`, {
      method: 'POST',
      headers: {
        apikey: config.chaveDeServico,
        Authorization: `Bearer ${config.chaveDeServico}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        p_relatorio_id: registro.relatorioId,
        p_checksum_documento_visto: registro.checksumDocumento,
        p_checksum_factual_visto: registro.checksumFactual,
        p_contexto: registro.contexto,
        p_por: registro.por,
      }),
    });
    if (resposta.ok) return 'registrada';

    const bruto = await resposta.text();
    let mensagem = '';
    try { mensagem = String(JSON.parse(bruto)?.message ?? ''); } catch { mensagem = ''; }
    if (mensagem === 'checksum_factual_indisponivel') return 'sem_impressao_digital';
    console.error(
      `[painel-revisao-viva] contexto_rpc_http_${resposta.status} motivo=${mensagem || 'desconhecido'}`,
    );
    return 'falhou';
  } catch (erro) {
    console.error(
      '[painel-revisao-viva] falha de rede ao salvar contexto:',
      erro instanceof Error ? erro.message : erro,
    );
    return 'falhou';
  }
}

export async function registrarRevisaoViva(
  registro: RegistroDeRevisaoViva,
  config: ConfiguracaoEditorial,
): Promise<ResultadoDaRevisaoViva> {
  /* Sem impressão digital não existe o que registrar, e a chamada seria
     recusada com `checksum_factual_indisponivel`. Não perguntar é melhor que
     perguntar sabendo a resposta. */
  if (!registro.checksumFactual) return 'sem_impressao_digital';

  try {
    const resposta = await fetch(`${config.urlSupabase}/rest/v1/rpc/registrar_revisao_editorial_atual`, {
      method: 'POST',
      headers: {
        apikey: config.chaveDeServico,
        Authorization: `Bearer ${config.chaveDeServico}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        p_relatorio_id: registro.relatorioId,
        p_checksum_documento_visto: registro.checksumDocumento,
        p_checksum_factual_visto: registro.checksumFactual,
        p_secao: registro.secao,
        p_tipo_decisao: registro.tipoDecisao,
        p_texto: registro.texto,
        p_por: registro.por,
        p_origem_sugestao_id: registro.origemSugestaoId ?? null,
      }),
    });
    if (resposta.ok) return 'registrada';

    const bruto = await resposta.text();
    let mensagem = '';
    try { mensagem = String(JSON.parse(bruto)?.message ?? ''); } catch { mensagem = ''; }
    /* Documento anterior à coleta nova. Não é defeito e não é perda: a ponte
       da fábrica leva este mesmo trabalho quando a competência for atualizada
       pela primeira vez. */
    if (mensagem === 'checksum_factual_indisponivel') return 'sem_impressao_digital';
    console.error(
      `[painel-revisao-viva] rpc_http_${resposta.status} secao=${registro.secao} motivo=${mensagem || 'desconhecido'}`,
    );
    return 'falhou';
  } catch (erro) {
    console.error(
      '[painel-revisao-viva] falha de rede:',
      erro instanceof Error ? erro.message : erro,
    );
    return 'falhou';
  }
}
