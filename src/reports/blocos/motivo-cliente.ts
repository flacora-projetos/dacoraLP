/**
 * Dois leitores, um documento — C1 da direção de 2026-08-12
 * (`docs/DIRECAO_LINGUAGEM_DE_CLIENTE_NOS_RELATORIOS_2026-08-12.md`, no
 * `OpenClaw-Dacora`).
 *
 * A fábrica grava, em `motivo` e em `dependeDe`, o diagnóstico de quem
 * audita o sistema — é assim que "a lista de anúncios veio cortada nesta
 * consulta" ou "nenhum evento governado definiu o resultado desta
 * competência" chegavam, ao pé da letra, à tela do cliente. A regra de
 * honestidade do projeto não muda: ausência nunca vira zero, seção sem dado
 * não some em silêncio, número nunca é inventado. O que muda é **com quem o
 * texto conversa**.
 *
 * Esta é a correção de APRESENTAÇÃO combinada com o PO: o motivo técnico já
 * está gravado no snapshot de todo relatório publicado, e regerá-los para
 * mudar o texto mudaria checksum sem necessidade. Em vez disso, este módulo
 * decide, na hora de renderizar, qual das duas frases mostrar — sem apagar
 * nem reescrever nada no banco. O diagnóstico técnico completo continua
 * disponível para quem precisa dele, na fila do painel (`api/_painel-fila-dados.ts`,
 * sinal `secoes_indisponiveis`), que é superfície interna por construção.
 *
 * A régua que decide, nas palavras do PO: se o cliente não consegue fazer
 * nada com aquilo, e isso não muda como ele lê os números, é interno.
 *
 * Não é análise de linguagem natural — é detecção de vocabulário. O projeto
 * tem uma lista fechada de palavras que só fazem sentido para quem constrói
 * o sistema: "competência", "evento governado", "coleta", "conector",
 * "cobertura", "snapshot", "fonte" (e as variações usuais delas). Um motivo
 * que não usa nenhuma dessas passa como está — é o caso de "Nenhum anúncio
 * deste grupo veiculou no mês.", que é fato do negócio do cliente, não
 * detalhe da nossa engenharia. Um motivo que usa vocabulário técnico e que
 * este módulo não tem tradução pronta cai numa frase neutra e verdadeira,
 * nunca numa causa inventada — a régua do próprio PO: "se não houver como
 * distinguir com segurança, prefira uma frase neutra e verdadeira a uma
 * frase técnica".
 */

const VOCABULARIO_TECNICO: RegExp[] = [
  /compet[êe]ncia/i,
  /evento(s)?\s+governado/i,
  /\bcolet\w*/i, // coleta, coletado, coletando, coletar…
  /\bconector(es)?\b/i,
  /\bcobertura\b/i,
  /\bsnapshot\b/i,
  /\bfontes?\b/i,
  /\bconsultas?\b/i,
  /\bintegra[cç][aã]o\b/i,
  /\bcadastro\b/i,
  /\blote\b/i,
];

/** Detecta vocabulário de quem audita o sistema, não de quem lê o relatório. */
export function contemVocabularioTecnico(texto: string): boolean {
  return VOCABULARIO_TECNICO.some((padrao) => padrao.test(texto));
}

/**
 * Traduções conhecidas dos motivos reais gravados pela fábrica — ver a
 * evidência em `docs/DIRECAO_LINGUAGEM_DE_CLIENTE_NOS_RELATORIOS_2026-08-12.md`,
 * seção 2, e `src/lib/monthly-report/` no `OpenClaw-Dacora`. Casar pelo texto
 * exato dá uma frase melhor do que a genérica; quando o motivo real muda uma
 * vírgula ou carrega uma variável (erro de rede, nome de lista), o casamento
 * falha de propósito e a frase neutra genérica assume — nunca inventa a
 * tradução de um texto que não foi conferido.
 */
const TRADUCOES_CONHECIDAS: Record<string, string> = {
  'Nenhuma das medidas do perfil do Instagram voltou nesta coleta.':
    'Os números do perfil do Instagram não estão disponíveis neste relatório.',
  'A lista de anúncios veio cortada nesta consulta, então o ranking mostraria uma parte como se fosse o todo.':
    'O ranking de anúncios não está disponível neste relatório.',
  'Nenhum evento governado definiu o resultado desta competência.':
    'O resultado deste período ainda não está disponível.',
  'O ranking factual de criativos não ficou disponível nesta coleta.':
    'O ranking de anúncios não está disponível neste relatório.',
  'O mês anterior foi zero, e variação percentual sobre zero não existe.':
    'Não há comparação disponível para este número no mês anterior.',
};

/**
 * Traduz um `motivo` gravado pela fábrica para o que o cliente lê.
 *
 * `fraseNeutra` é o que aparece quando o texto carrega vocabulário técnico e
 * não há tradução conhecida — escreva-a para o contexto de quem chama
 * (uma seção inteira, um único número, uma comparação), nunca genérica
 * demais para soar vaga nem específica demais para virar causa inventada.
 */
export function motivoParaCliente(texto: string, fraseNeutra: string): string {
  const traduzido = TRADUCOES_CONHECIDAS[texto];
  if (traduzido) return traduzido;
  return contemVocabularioTecnico(texto) ? fraseNeutra : texto;
}

/**
 * Filtra uma lista de frases (ex.: `oQueTemos`), descartando as que carregam
 * vocabulário técnico. Diferente de `motivoParaCliente`, aqui não há frase
 * neutra para substituir cada item — um item técnico simplesmente não ajuda
 * o cliente a achar o dado, então ele sai da lista em vez de virar frase vaga
 * no meio de uma lista de "o que já temos".
 */
export function itensParaCliente(itens: string[] | undefined): string[] {
  if (!itens || itens.length === 0) return [];
  return itens.filter((item) => !contemVocabularioTecnico(item));
}

/**
 * Vocabulário de cliente para texto editorial que continua útil mesmo quando
 * contém uma palavra interna. Diferente de `motivoParaCliente`, esta função
 * não substitui a frase inteira: troca só os termos de C3 e preserva a
 * afirmação factual ao redor deles.
 */
const TROCAS_EDITORIAIS: Array<[RegExp, string]> = [
  [/\bcompetências\b/gi, 'períodos'],
  [/\bcompetência\b/gi, 'período'],
  [/\beventos governados\b/gi, 'resultados definidos'],
  [/\bevento governado\b/gi, 'resultado definido'],
  [/\bcoletadas\b/gi, 'consultadas'],
  [/\bcoletados\b/gi, 'consultados'],
  [/\bcoletada\b/gi, 'consultada'],
  [/\bcoletado\b/gi, 'consultado'],
  [/\bcoletas\b/gi, 'consultas'],
  [/\bcoleta\b/gi, 'consulta'],
  [/\bconectores\b/gi, 'ligações com as plataformas'],
  [/\bconector\b/gi, 'ligação com a plataforma'],
  [/\bintegrações\b/gi, 'ligações com as plataformas'],
  [/\bintegração\b/gi, 'ligação com a plataforma'],
  [/\bcobertura\b/gi, 'abrangência'],
  [/\bsnapshots\b/gi, 'versões salvas'],
  [/\bsnapshot\b/gi, 'versão salva'],
  [/\bfontes\b/gi, 'origens'],
  [/\bfonte\b/gi, 'origem'],
];

export function textoParaCliente(texto: string): string {
  return TROCAS_EDITORIAIS.reduce(
    (atual, [padrao, substituicao]) => atual.replace(padrao, substituicao),
    texto,
  );
}
