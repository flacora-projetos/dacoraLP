/**
 * O PDF do relatório mensal — O ÚNICO gerador de PDF do projeto.
 *
 * ---------------------------------------------------------------------------
 * UM GERADOR SÓ (29/09/2026)
 *
 * Até esta data existiam dois PDFs diferentes do mesmo relatório: o botão
 * "Exportar PDF" montava este documento no navegador, e a rotina do Drive
 * imprimia a PÁGINA com o Chrome — papel Carta, endereço do site impresso no
 * topo, título de seção sozinho no pé da folha. O cliente recebia um no link e
 * outro na pasta. Decisão do PO: *"não era pra ter dois geradores de PDF"*.
 *
 * Hoje o documento é montado no servidor (`api/_relatorio-pdf.ts` (endereço `/api/relatorio-pdf`)), e o botão da
 * página e a rotina do Drive baixam o MESMO arquivo. A impressão da página pelo
 * navegador não é caminho de PDF de ninguém. Quem precisar mexer no PDF mexe
 * AQUI — não reative a impressão do Chrome, nem gere PDF no navegador.
 * ---------------------------------------------------------------------------
 *
 * Regras do desenho:
 * - A4 paisagem, margens fixas, cabeçalho e rodapé fixos com "Página X de Y".
 * - As seções FLUEM: nenhuma seção pede folha própria. Quem não se parte é a
 *   peça pequena (cartão de número, linha de tabela, cartão de criativo); o
 *   título da seção nunca fica sozinho no pé da folha (`minPresenceAhead`).
 * - Gráfico sempre com o número escrito junto — papel não tem passar o mouse.
 * - Toda matemática vem pronta do snapshot. Aqui só se organiza e se desenha;
 *   a única conta local é a escala do desenho.
 * - A marca (Dácora ou Allgrotech) vem de `marcaDoRelatorio`, pela carteira.
 */
import {
  Document,
  Font,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
  type DocumentProps,
} from '@react-pdf/renderer';
import type { ReactElement, ReactNode } from 'react';

import {
  aplicarIntroducaoAprovada,
  introducaoDasAnalises,
  paragrafosDaAnalise,
  type AnalisePublicada,
} from '../analisePublicada.js';
import {
  formatarCarimbo,
  formatarCompetencia,
  formatarDiaMes,
  formatarNumero,
  formatarPeriodo,
  formatarVariacao,
  textoValor,
} from '../format.js';
import { termosDoGlossario, termoDoGlossario } from '../glossario.js';
import { marcaDoRelatorio, type CoresDaMarca, type MarcaResolvida } from '../marcas.js';
import type { DirecaoFavoravel, Metrica, PlataformaId, Unidade, Valor } from '../snapshot';
import type {
  BlocoConfigurado,
  Escopo,
  EvolucaoMensal,
  FaixaIndicadores,
  FunilRelatorio,
  QuebraPorDimensao,
  RankingCriativos,
  SnapshotMontado,
  TabelaEntidades,
} from '../blocos/tipos';
import { GraficoBarras, GraficoLinha, SetaFunil, SetaVariacao, AneisDecorativos, type PontoBarra } from './graficosPdf.js';

/* ------------------------------------------------------------------ */
/* Página                                                              */
/* ------------------------------------------------------------------ */

const FOLHA = { largura: 841.89, altura: 595.28 };
const MARGEM = { lado: 40, topo: 60, base: 46 };
const LARGURA_UTIL = FOLHA.largura - MARGEM.lado * 2;
/**
 * Tabela longa vira blocos de no máximo tantas linhas, cada bloco com o
 * próprio cabeçalho e inteiro numa folha. Os blocos saem equilibrados
 * (13 linhas = 7 + 6, nunca 12 + 1).
 */
const LINHAS_POR_BLOCO_DE_TABELA = 9;

const FONTE = 'Red Hat PDF';

const COR_PLATAFORMA: Record<PlataformaId, string> = {
  meta: '#176B87',
  google: '#B26F00',
  pinterest: '#9B3D4D',
  ga4: '#6955A3',
  instagram: '#9B416F',
  ecommerce: '#0D1F18',
  crm: '#006B5B',
} as Record<PlataformaId, string>;

const TOM = {
  favoravel: '#1C7C3A',
  desfavoravel: '#B0452F',
  neutra: '#6B7A72',
} as const;

export function registrarFontesDoRelatorioPdf(fontes: { regular: string; medium: string; bold: string; black?: string }) {
  if (Font.getRegisteredFontFamilies().includes(FONTE)) return;
  Font.register({
    family: FONTE,
    fonts: [
      { src: fontes.regular, fontWeight: 400 },
      { src: fontes.medium, fontWeight: 500 },
      { src: fontes.bold, fontWeight: 700 },
      { src: fontes.black ?? fontes.bold, fontWeight: 900 },
    ],
  });
  /* Sem hifenização: número e nome de campanha não podem ser partidos. */
  Font.registerHyphenationCallback((palavra) => [palavra]);
}

/* ------------------------------------------------------------------ */
/* Estilos — dependem das cores da marca                               */
/* ------------------------------------------------------------------ */

function criarEstilos(c: CoresDaMarca) {
  return StyleSheet.create({
    pagina: {
      backgroundColor: '#FFFFFF',
      color: c.tinta,
      fontFamily: FONTE,
      fontSize: 9,
      /* ⚠️ SEM lineHeight AQUI. Entrelinha sem unidade na folha é herdada e
         remultiplicada pelo motor a cada folha nova: na 10ª ela passava de
         dez milhões, o rodapé saía da folha e o arquivo não era gerado
         (medido em 29/09/2026 no relatório da Aviarte). Cada texto declara
         a própria entrelinha — EXCETO o que é `fixed` (cabeçalho, rodapé,
         cabeçalho de tabela repetido): o motor clona essas peças em cada
         folha e remultiplica a entrelinha delas do mesmo jeito. */
      paddingTop: MARGEM.topo,
      paddingBottom: MARGEM.base,
      paddingHorizontal: MARGEM.lado,
    },

    /* Cabeçalho e rodapé fixos */
    cabecalho: {
      position: 'absolute',
      top: 22,
      left: MARGEM.lado,
      right: MARGEM.lado,
      height: 20,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    cabecalhoFio: {
      position: 'absolute',
      top: 46,
      left: MARGEM.lado,
      right: MARGEM.lado,
      height: 0.8,
      backgroundColor: c.filete,
    },
    cabecalhoMeta: { fontSize: 7.6, color: c.cinza },
    cabecalhoCliente: { fontWeight: 700, color: c.tinta },
    rodape: {
      position: 'absolute',
      bottom: 20,
      left: MARGEM.lado,
      right: MARGEM.lado,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      fontSize: 7,
      color: c.suave,
    },
    rodapeMarca: { flexDirection: 'row', alignItems: 'center' },
    rodapeQuadro: { width: 5, height: 5, backgroundColor: c.acento, marginRight: 6 },
    rodapePagina: { color: c.cinza, fontWeight: 500 },

    /* Seção */
    secao: { marginBottom: 22 },
    secaoCabecalho: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      borderTopWidth: 1.6,
      borderTopColor: c.primaria,
      paddingTop: 9,
      marginBottom: 11,
    },
    secaoIndice: {
      width: 26,
      height: 18,
      marginRight: 11,
      backgroundColor: c.primaria,
      color: c.sobrePrimaria,
      fontSize: 8,
      fontWeight: 700,
      textAlign: 'center',
      paddingTop: 4,
    },
    secaoTextos: { flex: 1 },
    secaoTitulo: { fontSize: 15.5, fontWeight: 700, letterSpacing: -0.2, lineHeight: 1.15, color: c.tinta },
    secaoApoio: { marginTop: 3, color: c.cinza, fontSize: 8.4, lineHeight: 1.35 },
    escopo: {
      alignSelf: 'flex-start',
      fontSize: 6.8,
      color: c.cinza,
      backgroundColor: c.papel,
      paddingHorizontal: 6,
      paddingVertical: 2.5,
      marginBottom: 8,
      letterSpacing: 0.2,
    },
    nota: { color: c.cinza, fontSize: 7.4, lineHeight: 1.45, marginTop: 7 },
    notas: { marginTop: 7 },
    notaItem: { flexDirection: 'row', marginBottom: 1.5 },
    notaMarcador: { width: 3, height: 3, backgroundColor: c.suave, marginTop: 3.6, marginRight: 5 },
    notaTexto: { flex: 1, color: c.cinza, fontSize: 6.9, lineHeight: 1.4 },

    /* Análise e observação aprovadas */
    analise: {
      flexDirection: 'row',
      backgroundColor: c.cartao,
      marginTop: 10,
      borderWidth: 0.8,
      borderColor: c.filete,
    },
    analiseBarra: { width: 3.5, backgroundColor: c.destaque },
    analiseCorpo: { flex: 1, paddingHorizontal: 12, paddingVertical: 9 },
    analiseRotulo: { color: c.destaque, fontSize: 6.8, fontWeight: 700, letterSpacing: 1.1, textTransform: 'uppercase', marginBottom: 4 },
    analiseTexto: { fontSize: 8.8, lineHeight: 1.5, color: c.tinta, marginBottom: 3 },

    /* Cartões de número */
    grade: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4 },
    cartao: { paddingHorizontal: 4, marginBottom: 8 },
    cartaoInterno: {
      borderWidth: 0.8,
      borderColor: c.filete,
      backgroundColor: '#FFFFFF',
      paddingHorizontal: 11,
      paddingTop: 9,
      paddingBottom: 9,
    },
    cartaoFaixa: { height: 2.4, marginBottom: 8, width: 22 },
    cartaoRotulo: { color: c.cinza, fontSize: 6.6, fontWeight: 700, letterSpacing: 0.7, textTransform: 'uppercase', marginBottom: 4 },
    cartaoValor: { fontSize: 18, fontWeight: 700, letterSpacing: -0.3, color: c.tinta, marginBottom: 5 },
    cartaoValorCompacto: { fontSize: 15 },
    variacao: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
    variacaoPilula: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4, paddingVertical: 1.5, marginRight: 4 },
    variacaoTexto: { fontSize: 6.9, fontWeight: 700 },
    variacaoBase: { fontSize: 6.5, color: c.suave },
    cartaoMotivo: { fontSize: 6.5, color: c.suave, lineHeight: 1.3 },
    cartaoDescricao: { fontSize: 6.4, color: c.suave, lineHeight: 1.35, marginTop: 5 },

    /* Tabela */
    tabela: { borderWidth: 0.8, borderColor: c.filete },
    linha: { flexDirection: 'row', borderBottomWidth: 0.6, borderBottomColor: c.filete, alignItems: 'center' },
    linhaPar: { backgroundColor: c.cartao },
    linhaCabecalho: { backgroundColor: c.primaria, borderBottomWidth: 0, paddingVertical: 2.5 },
    linhaTotal: { backgroundColor: c.papel, borderBottomWidth: 0, borderTopWidth: 1, borderTopColor: c.primaria },
    celula: { flexGrow: 1, flexBasis: 0, paddingHorizontal: 6, paddingVertical: 5.5 },
    celulaPrimeira: { flexGrow: 2.6 },
    celulaCabecalho: { color: c.sobrePrimaria, fontSize: 6.3, fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase' },
    celulaTexto: { fontSize: 7.6 },
    celulaTextoDenso: { fontSize: 6.9 },
    direita: { textAlign: 'right' },
    negrito: { fontWeight: 700 },
    etiqueta: { fontSize: 5.9, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', marginTop: 1.5 },
    cobertura: {
      flexDirection: 'row',
      backgroundColor: c.cartao,
      borderWidth: 0.8,
      borderColor: c.filete,
      marginBottom: 8,
    },

    /* Criativos */
    criativo: { width: '33.333%', paddingHorizontal: 4, marginBottom: 8 },
    criativoInterno: { flexDirection: 'row', borderWidth: 0.8, borderColor: c.filete, backgroundColor: '#FFFFFF' },
    criativoImagem: { width: 94, height: 94, objectFit: 'cover' },
    criativoSemImagem: { width: 94, height: 94, backgroundColor: c.papel, alignItems: 'center', justifyContent: 'center', padding: 6 },
    criativoSemImagemTexto: { color: c.suave, fontSize: 6, textAlign: 'center' },
    criativoCorpo: { flex: 1, paddingHorizontal: 9, paddingVertical: 8 },
    criativoPosicao: { alignSelf: 'flex-start', backgroundColor: c.primaria, color: c.sobrePrimaria, fontSize: 6.5, fontWeight: 700, paddingHorizontal: 4, paddingVertical: 1.5, marginBottom: 4 },
    criativoNome: { fontSize: 7.6, fontWeight: 700, lineHeight: 1.3, marginBottom: 5 },
    criativoNumeroRotulo: { fontSize: 6, color: c.cinza, textTransform: 'uppercase', letterSpacing: 0.5 },
    criativoNumeroValor: { fontSize: 10.5, fontWeight: 700, color: c.destaque, marginBottom: 3 },
    criativoSituacao: { fontSize: 6, color: c.suave, marginTop: 'auto' },

    /* Quebra */
    quebraLinha: { flexDirection: 'row', alignItems: 'center', paddingVertical: 3.2, borderBottomWidth: 0.5, borderBottomColor: c.filete },
    quebraRotulo: { width: 170, fontSize: 7.8, paddingRight: 8 },
    quebraTrilho: { flex: 1, height: 9, backgroundColor: c.cartao },
    quebraValor: { width: 108, textAlign: 'right', fontSize: 7.8, fontWeight: 700 },
    quebraNota: { fontSize: 6, color: c.suave, marginTop: 1 },
    quebraTotal: { flexDirection: 'row', paddingTop: 6, marginTop: 2 },

    /* Funil */
    funil: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
    funilEtapa: { flexGrow: 1, flexBasis: 0, borderWidth: 0.8, borderColor: c.filete, backgroundColor: c.cartao, paddingHorizontal: 9, paddingVertical: 8 },
    funilValor: { fontSize: 15, fontWeight: 700, color: c.primaria },
    funilRotulo: { fontSize: 6.9, color: c.cinza, marginTop: 2, lineHeight: 1.3 },
    funilMotivo: { fontSize: 6, color: c.suave, marginTop: 2 },
    funilPasso: { width: 44, alignItems: 'center' },
    funilTaxa: { fontSize: 6.7, fontWeight: 700, color: c.destaque, marginTop: 1, textAlign: 'center' },

    /* Série: grade de valores diários */
    gradeDias: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8, borderTopWidth: 0.6, borderTopColor: c.filete },
    dia: { width: `${100 / 11}%`, paddingVertical: 3, borderBottomWidth: 0.6, borderBottomColor: c.filete },
    diaData: { fontSize: 5.9, color: c.suave },
    diaValor: { fontSize: 7.6, fontWeight: 700 },

    /* Glossário */
    glossario: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -8 },
    glossarioItem: { width: '50%', paddingHorizontal: 8, marginBottom: 8 },
    glossarioTermo: { color: c.primaria, fontSize: 8, fontWeight: 700, marginBottom: 1.5 },
    glossarioTexto: { color: c.cinza, fontSize: 7.3, lineHeight: 1.4 },

    /* Comentário humano */
    comentario: { borderLeftWidth: 3, borderLeftColor: c.destaque, paddingLeft: 13 },
    comentarioTexto: { fontSize: 10, lineHeight: 1.55, marginBottom: 5 },
    comentarioAssinatura: { color: c.cinza, fontSize: 7.2 },

    indisponivel: { borderWidth: 0.8, borderColor: '#D9C4AE', backgroundColor: '#FBF6F0', padding: 10, fontSize: 8, color: c.cinza },

    /* Resumo do mês, na primeira folha de conteúdo */
    resumo: { flexDirection: 'row', backgroundColor: c.primaria, marginBottom: 22 },
    resumoRotuloCol: { width: 150, padding: 16, borderRightWidth: 0.8, borderRightColor: c.destaque },
    resumoRotulo: { color: c.acento, fontSize: 7, fontWeight: 700, letterSpacing: 1.4, textTransform: 'uppercase' },
    resumoTitulo: { color: c.sobrePrimaria, fontSize: 15, fontWeight: 700, marginTop: 5, lineHeight: 1.15 },
    resumoTextoCol: { flex: 1, paddingHorizontal: 18, paddingVertical: 14 },
    resumoTexto: { color: c.sobrePrimaria, fontSize: 10.5, lineHeight: 1.55, marginBottom: 4 },

    /* Fecho */
    fecho: { marginTop: 8, borderTopWidth: 0.8, borderTopColor: c.filete, paddingTop: 10, flexDirection: 'row' },
    fechoCol: { flex: 1, paddingRight: 16 },
    fechoRotulo: { fontSize: 6.4, fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase', color: c.suave, marginBottom: 3 },
    fechoTexto: { fontSize: 7, color: c.cinza, lineHeight: 1.45 },
  });
}

type Estilos = ReturnType<typeof criarEstilos>;

/*
 * ⚠️ NENHUMA PEÇA DESTE DOCUMENTO USA `minHeight` (29/09/2026).
 * Quando o motor move uma peça para a folha seguinte e refaz a medição, a
 * altura mínima dela passa a ser lida como proporção de uma altura enorme:
 * linhas de tabela com `minHeight: 20` saíram com 10.687.894 pontos, e a
 * tabela virou um retângulo da cor do cabeçalho cobrindo a folha. A altura
 * vem do espaçamento interno, que o motor mede certo.
 */

/**
 * ⚠️ CADA USO DE UM ESTILO RECEBE UMA CÓPIA (29/09/2026).
 *
 * O motor altera o objeto de estilo ao medir a peça — e quando a mesma peça
 * é medida de novo (folha nova, bloco empurrado), ele reaplica a conta sobre
 * o valor já alterado. Com um objeto COMPARTILHADO entre várias peças, o
 * erro se acumula: a entrelinha do rodapé passou de dez milhões na 10ª
 * folha, e as linhas de uma tabela logo depois de um bloco empurrado saíram
 * com dez milhões de pontos de altura, virando um retângulo verde sobre a
 * folha. Cópia por acesso fecha a porta para os dois de uma vez.
 */
function estilosSemCompartilhar(estilos: Estilos): Estilos {
  return new Proxy(estilos, {
    get: (alvo, chave) => {
      const valor = (alvo as Record<string | symbol, unknown>)[chave];
      return valor && typeof valor === 'object' ? { ...(valor as object) } : valor;
    },
  });
}

/* ------------------------------------------------------------------ */
/* Utilidades de texto                                                  */
/* ------------------------------------------------------------------ */

/** Traços tipográficos viram hífen: é o único traço garantido em toda fonte embutida. */
const t = (valor: string | null | undefined) => String(valor ?? '').replace(/[\u2010-\u2015\u2212]/g, '-');

const tv = (valor: Valor | undefined, unidade: Unidade, sufixo?: string) =>
  valor ? t(textoValor(valor, unidade, sufixo)) : '-';

const maiuscula = (texto: string) => texto.charAt(0).toUpperCase() + texto.slice(1);

const MESES_CURTOS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const mesCurto = (competencia: string) => {
  const [ano, mes] = competencia.split('-').map(Number);
  return mes >= 1 && mes <= 12 ? `${MESES_CURTOS[mes - 1]}/${String(ano).slice(2)}` : competencia;
};

function leituraDaVariacao(variacao: number, direcao: DirecaoFavoravel): keyof typeof TOM {
  if (direcao === 'neutra' || variacao === 0) return 'neutra';
  const subiu = variacao > 0;
  if (direcao === 'alta') return subiu ? 'favoravel' : 'desfavoravel';
  return subiu ? 'desfavoravel' : 'favoravel';
}

const corDaPlataforma = (plataforma: PlataformaId | undefined, c: CoresDaMarca) =>
  (plataforma && COR_PLATAFORMA[plataforma]) || c.destaque;

/* ------------------------------------------------------------------ */
/* Peças                                                               */
/* ------------------------------------------------------------------ */

interface Contexto {
  s: Estilos;
  c: CoresDaMarca;
  marca: MarcaResolvida;
  imagens?: ImagensDoPdf;
}

/**
 * Miniaturas já baixadas pelo servidor, por endereço. `null` = o endereço
 * existe mas a imagem não é desenhável (formato que o PDF não aceita, ou não
 * respondeu) — aí o cartão mostra o aviso, nunca uma caixa quebrada.
 */
export type ImagensDoPdf = Map<string, { data: Buffer; format: 'jpg' | 'png' } | null>;

function RotuloDeEscopo({ escopo, ctx }: { escopo: Escopo; ctx: Contexto }) {
  return <Text style={ctx.s.escopo}>{t(escopo.rotulo)}</Text>;
}

function Notas({ itens, ctx }: { itens: string[] | undefined; ctx: Contexto }) {
  if (!itens?.length) return null;
  return (
    <View style={ctx.s.notas}>
      {itens.map((item, indice) => (
        <View key={indice} style={ctx.s.notaItem} wrap={false}>
          <View style={ctx.s.notaMarcador} />
          <Text style={ctx.s.notaTexto}>{t(item)}</Text>
        </View>
      ))}
    </View>
  );
}

function colunasDaGrade(total: number) {
  if (total <= 4) return Math.max(total, 1);
  if (total === 5) return 5;
  if (total === 6 || total === 9) return 3;
  if (total >= 10) return 6;
  return 4;
}

function Variacao({ metrica, ctx }: { metrica: Metrica; ctx: Contexto }) {
  const comparativo = metrica.comparativo;
  if (!comparativo) return null;
  if (!comparativo.permitido) {
    return comparativo.motivo ? <Text style={ctx.s.cartaoMotivo}>{t(comparativo.motivo)}</Text> : null;
  }
  if (comparativo.variacao == null) return null;
  const leitura = leituraDaVariacao(comparativo.variacao, metrica.direcaoFavoravel);
  const cor = TOM[leitura];
  const base = comparativo.valorBase ? tv(comparativo.valorBase, metrica.unidade, metrica.sufixo) : null;
  return (
    <View style={ctx.s.variacao}>
      <View style={[ctx.s.variacaoPilula, { backgroundColor: `${cor}14` }]}>
        {comparativo.variacao !== 0 && <SetaVariacao subiu={comparativo.variacao > 0} cor={cor} />}
        <Text style={[ctx.s.variacaoTexto, { color: cor }]}>{t(formatarVariacao(comparativo.variacao).replace(/^[+-]/, ''))}</Text>
      </View>
      {comparativo.competenciaBase && (
        <Text style={ctx.s.variacaoBase}>
          vs. {t(mesCurto(comparativo.competenciaBase))}{base ? ` (${base})` : ''}
        </Text>
      )}
    </View>
  );
}

/**
 * Cada bloco devolve PEDAÇOS, na ordem de leitura.
 *
 * ⚠️ O PRIMEIRO PEDAÇO VIAJA GRAMPEADO AO TÍTULO DA SEÇÃO (29/09/2026).
 * `minPresenceAhead` do motor falhou de dois jeitos medidos: ignorado quando
 * o título é o primeiro filho do pai, e, quando funciona, empurra o título
 * para a folha seguinte e deixa o conteúdo para a outra — uma folha inteira
 * só com o título, no relatório da Karyne. Grampear (título + primeiro pedaço
 * num bloco que não se parte) não depende de heurística nenhuma do motor.
 * Por isso o primeiro pedaço é sempre PEQUENO: escopo + primeira fileira,
 * nunca a tabela longa inteira.
 */
type Pedacos = ReactNode[];

function fatiar<T>(itens: T[], tamanho: number): T[][] {
  const fatias: T[][] = [];
  for (let i = 0; i < itens.length; i += tamanho) fatias.push(itens.slice(i, i + tamanho));
  return fatias;
}

function CartaoDeNumero({ metrica, largura, compacto, ctx }: { metrica: Metrica; largura: string; compacto: boolean; ctx: Contexto }) {
  const descricao = !compacto
    ? metrica.descricao ?? (metrica.glossarioId ? termoDoGlossario(metrica.glossarioId)?.texto : undefined)
    : undefined;
  return (
    <View style={[ctx.s.cartao, { width: largura }]}>
      <View style={ctx.s.cartaoInterno}>
        <View style={[ctx.s.cartaoFaixa, { backgroundColor: corDaPlataforma(metrica.origem.fontes[0], ctx.c) }]} />
        <Text style={ctx.s.cartaoRotulo}>{t(metrica.rotulo)}</Text>
        <Text style={[ctx.s.cartaoValor, compacto ? ctx.s.cartaoValorCompacto : {}]}>{tv(metrica.valor, metrica.unidade, metrica.sufixo)}</Text>
        <Variacao metrica={metrica} ctx={ctx} />
        {descricao && <Text style={ctx.s.cartaoDescricao}>{t(descricao)}</Text>}
      </View>
    </View>
  );
}

function pedacosDosCartoes(faixa: FaixaIndicadores, ctx: Contexto): Pedacos {
  const colunas = colunasDaGrade(faixa.metricas.length);
  const compacto = colunas >= 5;
  const largura = `${100 / colunas}%`;
  const fileiras = fatiar(faixa.metricas, colunas).map((fileira, indice) => (
    <View key={`fileira-${indice}`} style={ctx.s.grade} wrap={false}>
      {fileira.map((metrica) => <CartaoDeNumero key={metrica.id} metrica={metrica} largura={largura} compacto={compacto} ctx={ctx} />)}
    </View>
  ));
  return [
    <View key="abertura"><RotuloDeEscopo escopo={faixa.escopo} ctx={ctx} />{fileiras[0]}</View>,
    ...fileiras.slice(1),
  ];
}

function Cobertura({ tabela, ctx }: { tabela: TabelaEntidades; ctx: Contexto }) {
  const cobertura = tabela.cobertura;
  if (!cobertura) return null;
  const unidade = tabela.colunas.find((coluna) => coluna.id === cobertura.colunaId)?.unidade ?? 'brl';
  return (
    <View style={ctx.s.cobertura} wrap={false}>
      <View style={ctx.s.analiseBarra} />
      <View style={ctx.s.analiseCorpo}>
        <Text style={{ fontSize: 7.6, color: ctx.c.tinta, marginBottom: 2 }}>
          Lista parcial: {tv(tabela.total.valores[cobertura.colunaId] ?? cobertura.totalDoUniverso, unidade)} de {tv(cobertura.totalDoUniverso, unidade)} em {t(cobertura.universo)}.
        </Text>
        {cobertura.motivos.map((motivo, indice) => <Text key={indice} style={{ fontSize: 6.9, color: ctx.c.cinza, lineHeight: 1.4 }}>{t(motivo)}</Text>)}
      </View>
    </View>
  );
}

interface ColunaTabela { id: string; rotulo: string; unidade: Unidade; sufixo?: string }

interface LinhaTabela { id: string; nome: string; etiqueta?: string; corEtiqueta?: string; valores: Record<string, Valor | undefined> }

/**
 * ⚠️ SEM `fixed` NO CABEÇALHO DE TABELA (29/09/2026). O cabeçalho repetido do
 * motor falhou de dois jeitos no mesmo dia: ficou sozinho no pé da folha, e
 * numa tabela de 13 linhas esticou até preencher a folha inteira de verde.
 * Tabela longa agora é cortada aqui mesmo em blocos (`blocosDeLinhas`), cada
 * um com o próprio cabeçalho e inteiro numa folha — o mesmo resultado, sem
 * depender do motor.
 */
function Tabela({ rotuloPrimeira, colunas, linhas, total, ctx, continuacao = false }: {
  rotuloPrimeira: string;
  colunas: ColunaTabela[];
  linhas: LinhaTabela[];
  total?: { rotulo: string; valores: Record<string, Valor | undefined> };
  ctx: Contexto;
  continuacao?: boolean;
}) {
  const denso = colunas.length > 6;
  const texto = denso ? ctx.s.celulaTextoDenso : ctx.s.celulaTexto;
  return (
    <View style={[ctx.s.tabela, continuacao ? { marginTop: 8 } : {}]} wrap={false}>
      <View style={[ctx.s.linha, ctx.s.linhaCabecalho]} wrap={false}>
        <View style={[ctx.s.celula, ctx.s.celulaPrimeira]}>
          <Text style={ctx.s.celulaCabecalho}>{t(rotuloPrimeira)}{continuacao ? ' (continuação)' : ''}</Text>
        </View>
        {colunas.map((coluna) => (
          <View key={coluna.id} style={ctx.s.celula}><Text style={[ctx.s.celulaCabecalho, ctx.s.direita]}>{t(coluna.rotulo)}</Text></View>
        ))}
      </View>
      {linhas.map((linha, indice) => (
        <View key={`${linha.id}-${indice}`} style={[ctx.s.linha, indice % 2 === 1 ? ctx.s.linhaPar : {}]} wrap={false}>
          <View style={[ctx.s.celula, ctx.s.celulaPrimeira]}>
            <Text style={[texto, { fontWeight: 500 }]}>{t(linha.nome)}</Text>
            {linha.etiqueta && <Text style={[ctx.s.etiqueta, { color: linha.corEtiqueta ?? ctx.c.suave }]}>{t(linha.etiqueta)}</Text>}
          </View>
          {colunas.map((coluna) => (
            <View key={coluna.id} style={ctx.s.celula}>
              <Text style={[texto, ctx.s.direita]}>{tv(linha.valores[coluna.id], coluna.unidade, coluna.sufixo)}</Text>
            </View>
          ))}
        </View>
      ))}
      {total && (
        <View style={[ctx.s.linha, ctx.s.linhaTotal]} wrap={false}>
          <View style={[ctx.s.celula, ctx.s.celulaPrimeira]}><Text style={[texto, ctx.s.negrito]}>{t(total.rotulo)}</Text></View>
          {colunas.map((coluna) => (
            <View key={coluna.id} style={ctx.s.celula}>
              <Text style={[texto, ctx.s.direita, ctx.s.negrito]}>{total.valores[coluna.id] ? tv(total.valores[coluna.id], coluna.unidade, coluna.sufixo) : '-'}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

/**
 * Corta as linhas em blocos que cabem numa folha. Linha com etiqueta embaixo
 * do nome ocupa quase uma linha e meia, e conta assim. O primeiro bloco é
 * menor quando divide a folha com o título, o escopo e o aviso de cobertura.
 */
function blocosDeLinhas(linhas: LinhaTabela[], limiteDoPrimeiro = LINHAS_POR_BLOCO_DE_TABELA): LinhaTabela[][] {
  const peso = (linha: LinhaTabela) => (linha.etiqueta ? 1.45 : 1);
  const pesoTotal = linhas.reduce((soma, linha) => soma + peso(linha), 0);
  if (pesoTotal <= limiteDoPrimeiro) return [linhas];
  /* Equilibra os blocos seguintes: 13 linhas viram 7 + 6, nunca 12 + 1. */
  const quantos = Math.ceil(pesoTotal / LINHAS_POR_BLOCO_DE_TABELA);
  const alvo = Math.min(LINHAS_POR_BLOCO_DE_TABELA, Math.ceil(pesoTotal / quantos));
  const blocos: LinhaTabela[][] = [];
  let atual: LinhaTabela[] = [];
  let acumulado = 0;
  for (const linha of linhas) {
    const limite = blocos.length === 0 ? Math.min(alvo, limiteDoPrimeiro) : alvo;
    if (atual.length > 0 && acumulado + peso(linha) > limite) {
      blocos.push(atual);
      atual = [];
      acumulado = 0;
    }
    atual.push(linha);
    acumulado += peso(linha);
  }
  if (atual.length) blocos.push(atual);
  return blocos;
}

/** A tabela inteira, já cortada em blocos que não se partem. */
function blocosDeTabela(props: { chave: string; rotuloPrimeira: string; colunas: ColunaTabela[]; linhas: LinhaTabela[]; total?: { rotulo: string; valores: Record<string, Valor | undefined> }; ctx: Contexto; limiteDoPrimeiro?: number }): ReactNode[] {
  const blocos = blocosDeLinhas(props.linhas, props.limiteDoPrimeiro);
  return blocos.map((linhas, indice) => (
    <Tabela
      key={`${props.chave}-${indice}`}
      rotuloPrimeira={props.rotuloPrimeira}
      colunas={props.colunas}
      linhas={linhas}
      total={indice === blocos.length - 1 ? props.total : undefined}
      ctx={props.ctx}
      continuacao={indice > 0}
    />
  ));
}

function pedacosDaTabela(tabela: TabelaEntidades, ctx: Contexto): Pedacos {
  const [primeiro, ...demais] = blocosDeTabela({
    chave: 'tabela',
    rotuloPrimeira: tabela.rotuloDimensao,
    colunas: tabela.colunas,
    linhas: tabela.linhas.map((linha) => ({ ...linha, corEtiqueta: ctx.c.destaque })),
    total: tabela.total,
    ctx,
    /* O primeiro bloco divide a folha com o título, o escopo e, quando há, o aviso de cobertura. */
    limiteDoPrimeiro: tabela.cobertura ? 6 : 9,
  });
  return [
    <View key="abertura">
      <RotuloDeEscopo escopo={tabela.escopo} ctx={ctx} />
      <Cobertura tabela={tabela} ctx={ctx} />
      {primeiro}
    </View>,
    ...demais,
    <Notas key="notas" itens={tabela.definicoes} ctx={ctx} />,
  ];
}

function pedacosDaEvolucao(evolucao: EvolucaoMensal, competencia: string, ctx: Contexto): Pedacos {
  /**
   * ⚠️ O PDF LÊ AS MESMAS COLUNAS DA PÁGINA, INCLUSIVE A REGRA DE OCULTAR:
   * a coluna oculta é denominador de conta, não é desenhada em lugar nenhum.
   */
  const colunas = evolucao.colunas.filter((coluna) => !coluna.oculta);
  const colunaDinheiro = colunas.find((coluna) => coluna.unidade === 'brl');
  const colunaResultado = colunas.find((coluna) => coluna.unidade === 'inteiro');
  const pontosDe = (coluna: ColunaTabela): PontoBarra[] => evolucao.meses.map((mes) => {
    const valor = mes.valores[coluna.id];
    return {
      rotulo: mesCurto(mes.competencia),
      valor: valor?.estado === 'ok' ? valor.numero : null,
      texto: valor?.estado === 'ok' ? t(formatarNumero(valor.numero, coluna.unidade)) : '-',
      destaque: mes.competencia === competencia,
    };
  });
  const graficos = [colunaDinheiro, colunaResultado].filter((coluna): coluna is ColunaTabela => Boolean(coluna));
  const larguraGrafico = graficos.length > 1 ? (LARGURA_UTIL - 24) / 2 : LARGURA_UTIL;
  const tabela = blocosDeTabela({
    chave: 'tabela',
    rotuloPrimeira: 'Mês',
    colunas,
    linhas: evolucao.meses.map((mes) => ({ id: mes.competencia, nome: formatarCompetencia(mes.competencia), etiqueta: mes.observacao, valores: mes.valores })),
    total: evolucao.total,
    ctx,
  });
  const desenho = graficos.length > 0 ? (
    <View key="graficos" style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
      {graficos.map((coluna) => (
        <GraficoBarras key={coluna.id} titulo={`${coluna.rotulo} por mês`} pontos={pontosDe(coluna)} largura={larguraGrafico} cores={ctx.c} fonte={FONTE} />
      ))}
    </View>
  ) : null;
  return [...(desenho ? [desenho] : []), ...tabela, <Notas key="notas" itens={evolucao.definicoes} ctx={ctx} />];
}

function pedacosDosCriativos(ranking: RankingCriativos, ctx: Contexto): Pedacos {
  const imagemDe = (src: string | undefined) => {
    if (!src) return null;
    if (ctx.imagens) return ctx.imagens.get(src) ?? null;
    return /^(?:https?:|data:)/.test(src) ? src : null;
  };
  const cartao = (criativo: RankingCriativos['criativos'][number], posicao: number) => {
    const imagem = imagemDe(criativo.miniatura?.src);
    return (
      <View key={criativo.id} style={ctx.s.criativo}>
        <View style={ctx.s.criativoInterno}>
          {imagem
            ? <Image src={imagem} style={ctx.s.criativoImagem} />
            : <View style={ctx.s.criativoSemImagem}><Text style={ctx.s.criativoSemImagemTexto}>{t(criativo.motivoSemMiniatura ?? 'Imagem indisponível')}</Text></View>}
          <View style={ctx.s.criativoCorpo}>
            <Text style={ctx.s.criativoPosicao}>{`${posicao + 1}º`}</Text>
            <Text style={ctx.s.criativoNome}>{t(criativo.nome)}</Text>
            {criativo.numeros.map((numero) => (
              <View key={numero.rotulo}>
                <Text style={ctx.s.criativoNumeroRotulo}>{t(numero.rotulo)}</Text>
                <Text style={ctx.s.criativoNumeroValor}>{tv(numero.valor, numero.unidade)}</Text>
              </View>
            ))}
            {criativo.situacao && (
              <Text style={ctx.s.criativoSituacao}>{t(criativo.situacao.situacao)} · em {t(formatarCarimbo(criativo.situacao.lidaEm))}</Text>
            )}
          </View>
        </View>
      </View>
    );
  };
  const fileiras = fatiar(ranking.criativos.map((criativo, posicao) => ({ criativo, posicao })), 3).map((fileira, indice) => (
    <View key={`fileira-${indice}`} style={ctx.s.grade} wrap={false}>
      {fileira.map(({ criativo, posicao }) => cartao(criativo, posicao))}
    </View>
  ));
  return [
    <View key="abertura"><RotuloDeEscopo escopo={ranking.escopo} ctx={ctx} />{fileiras[0]}</View>,
    ...fileiras.slice(1),
  ];
}

function pedacosDaQuebra(quebra: QuebraPorDimensao, ctx: Contexto): Pedacos {
  const maximo = Math.max(0, ...quebra.itens.map((item) => (item.valor.estado === 'ok' ? item.valor.numero : 0)));
  const cor = corDaPlataforma(quebra.plataforma, ctx.c);
  const linhas = quebra.itens.map((item, indice) => {
    const proporcao = item.valor.estado === 'ok' && maximo > 0 ? item.valor.numero / maximo : 0;
    return (
      <View key={`${item.id}-${indice}`} style={ctx.s.quebraLinha} wrap={false}>
        <View style={ctx.s.quebraRotulo}>
          <Text>{t(item.rotulo)}</Text>
          {item.nota && <Text style={ctx.s.quebraNota}>{t(item.nota)}</Text>}
        </View>
        <View style={ctx.s.quebraTrilho}>
          {proporcao > 0 && <View style={{ width: `${Math.max(proporcao * 100, 0.8)}%`, height: 9, backgroundColor: cor }} />}
        </View>
        <Text style={ctx.s.quebraValor}>{tv(item.valor, quebra.unidade)}</Text>
      </View>
    );
  });
  const abertura = (
    <View key="abertura">
      <RotuloDeEscopo escopo={quebra.escopo} ctx={ctx} />
      <Text style={[ctx.s.nota, { marginTop: 0, marginBottom: 6, color: ctx.c.tinta, fontWeight: 500 }]}>
        {t(quebra.pergunta)} <Text style={{ color: ctx.c.suave, fontWeight: 400 }}>({t(quebra.unidadeTexto)})</Text>
      </Text>
      {linhas.slice(0, 3)}
    </View>
  );
  return [
    abertura,
    ...linhas.slice(3),
    quebra.total ? (
      <View key="total" style={ctx.s.quebraTotal} wrap={false}>
        <Text style={[ctx.s.quebraRotulo, ctx.s.negrito]}>{t(quebra.total.rotulo)}</Text>
        <View style={{ flex: 1 }} />
        <Text style={ctx.s.quebraValor}>{tv(quebra.total.valor, quebra.unidade)}</Text>
      </View>
    ) : null,
    <Notas key="notas" itens={quebra.definicoes} ctx={ctx} />,
  ];
}

function pedacosDoFunil(funil: FunilRelatorio, ctx: Contexto): Pedacos {
  const taxaEntre = (de: string, para: string) => funil.transicoes.find((transicao) => transicao.de === de && transicao.para === para);
  return [
    <View key="funil">
      {funil.rotulo && <Text style={[ctx.s.nota, { marginTop: 0, marginBottom: 7 }]}>{t(funil.rotulo)}</Text>}
      <View style={ctx.s.funil}>
        {funil.etapas.map((etapa, indice) => {
          const anterior = funil.etapas[indice - 1];
          const transicao = anterior ? taxaEntre(anterior.rotulo, etapa.rotulo) ?? funil.transicoes[indice - 1] : undefined;
          return (
            <View key={etapa.id} style={{ flexDirection: 'row', alignItems: 'center', flexGrow: 1, flexBasis: 0 }}>
              {indice > 0 && (
                <View style={ctx.s.funilPasso}>
                  <SetaFunil cor={ctx.c.suave} />
                  {transicao && <Text style={ctx.s.funilTaxa}>{transicao.taxa == null ? '-' : t(formatarNumero(transicao.taxa, 'percentual'))}</Text>}
                </View>
              )}
              <View style={ctx.s.funilEtapa}>
                <Text style={ctx.s.funilValor}>{etapa.valor == null ? 'indisponível' : t(formatarNumero(etapa.valor, 'inteiro'))}</Text>
                <Text style={ctx.s.funilRotulo}>{t(etapa.rotulo)}</Text>
                {etapa.motivo && <Text style={ctx.s.funilMotivo}>{t(etapa.motivo)}</Text>}
              </View>
            </View>
          );
        })}
      </View>
    </View>,
    <Notas
      key="notas"
      itens={[
        ...funil.transicoes.filter((transicao) => transicao.taxa == null && transicao.motivo).map((transicao) => `${transicao.de} para ${transicao.para}: ${transicao.motivo}`),
        ...(funil.avisos?.map((aviso) => aviso.texto) ?? []),
      ]}
      ctx={ctx}
    />,
    funil.observacao ? <Text key="observacao" style={ctx.s.nota}>{t(funil.observacao)}</Text> : null,
  ];
}

function pedacosDaSerie(serie: NonNullable<SnapshotMontado['dados']['series']>[string], ctx: Contexto): Pedacos {
  const pedacos: Pedacos = [];
  serie.chaves.forEach((chave) => {
    const pontos: PontoBarra[] = serie.pontos.map((ponto) => {
      const valor = ponto.valores[chave.id];
      return { rotulo: t(formatarDiaMes(ponto.data)), valor: valor ?? null, texto: valor == null ? '-' : t(formatarNumero(valor, serie.unidade)) };
    });
    pedacos.push(
      <GraficoLinha
        key={`grafico-${chave.id}`}
        titulo={`${t(serie.pergunta)}${serie.chaves.length > 1 ? ` · ${t(chave.rotulo)}` : ''}${serie.unidadeTexto ? ` (${t(serie.unidadeTexto)})` : ''}`}
        pontos={pontos}
        largura={LARGURA_UTIL}
        cores={ctx.c}
        fonte={FONTE}
        cor={corDaPlataforma(chave.plataforma, ctx.c)}
      />,
      <View key={`dias-${chave.id}`} style={ctx.s.gradeDias} wrap={false}>
        {pontos.map((ponto, indice) => (
          <View key={indice} style={ctx.s.dia}>
            <Text style={ctx.s.diaData}>{ponto.rotulo}</Text>
            <Text style={ctx.s.diaValor}>{ponto.valor == null ? 'indisp.' : ponto.texto}</Text>
          </View>
        ))}
      </View>,
    );
  });
  pedacos.push(<Notas key="notas" itens={serie.observacoes} ctx={ctx} />);
  return pedacos;
}

function pedacosDoGlossario(ids: string[], ctx: Contexto): Pedacos {
  return fatiar(termosDoGlossario(ids), 2).map((par, indice) => (
    <View key={`par-${indice}`} style={ctx.s.glossario} wrap={false}>
      {par.map((termo) => (
        <View key={termo.id} style={ctx.s.glossarioItem}>
          <Text style={ctx.s.glossarioTermo}>{t(termo.termo)}</Text>
          <Text style={ctx.s.glossarioTexto}>{t(termo.texto)}</Text>
        </View>
      ))}
    </View>
  ));
}

function Indisponivel({ config, ctx }: { config: BlocoConfigurado; ctx: Contexto }) {
  if (!config.indisponivel) return null;
  return (
    <View style={ctx.s.indisponivel} wrap={false}>
      <Text>{t(config.indisponivel.motivo)}</Text>
      {config.indisponivel.oQueTemos?.map((item, indice) => <Text key={indice}>{t(item)}</Text>)}
      {config.indisponivel.dependeDe && <Text>Depende de: {t(config.indisponivel.dependeDe)}</Text>}
    </View>
  );
}

function DadoFaltando({ bloco, chave, ctx }: { bloco: string; chave: string; ctx: Contexto }) {
  return <View style={ctx.s.indisponivel}><Text>O bloco {bloco} aponta para "{t(chave)}", que não existe neste relatório.</Text></View>;
}

function pedacosDoBloco(config: BlocoConfigurado, snapshot: SnapshotMontado, ctx: Contexto): Pedacos {
  if (config.indisponivel) return [<Indisponivel key="indisponivel" config={config} ctx={ctx} />];
  const dados = snapshot.dados;
  const faltando = (bloco: string, chave: string) => [<DadoFaltando key="faltando" bloco={bloco} chave={chave} ctx={ctx} />];
  switch (config.bloco) {
    case 'B1': {
      const faixa = dados.faixas[config.faixa];
      if (!faixa) return faltando('B1', config.faixa);
      const funil = config.funil ? dados.funis?.[config.funil] : null;
      return [
        ...pedacosDosCartoes(faixa, ctx),
        ...(config.funil && !funil ? faltando('FUNIL', config.funil) : []),
        ...(funil ? pedacosDoFunil(funil, ctx) : []),
      ];
    }
    case 'B2': {
      const tabela = dados.tabelas[config.tabela];
      return tabela ? pedacosDaTabela(tabela, ctx) : faltando('B2', config.tabela);
    }
    case 'B3': {
      const evolucao = dados.evolucoesMensais[config.evolucao];
      return evolucao ? pedacosDaEvolucao(evolucao, snapshot.identidade.competencia, ctx) : faltando('B3', config.evolucao);
    }
    case 'B4': {
      const ranking = dados.rankingsCriativos[config.ranking];
      return ranking ? pedacosDosCriativos(ranking, ctx) : faltando('B4', config.ranking);
    }
    case 'B5': {
      const serie = dados.series?.[config.serie];
      return serie ? pedacosDaSerie(serie, ctx) : faltando('B5', config.serie);
    }
    case 'B6': {
      const quebra = dados.quebras[config.quebra];
      return quebra ? pedacosDaQuebra(quebra, ctx) : faltando('B6', config.quebra);
    }
    case 'B7':
      return pedacosDoGlossario(config.metricas, ctx);
    case 'B8': {
      const comentario = dados.comentarios?.[config.comentario];
      if (!comentario) return [];
      return [
        <View key="comentario" style={ctx.s.comentario}>
          {comentario.paragrafos.map((paragrafo, indice) => <Text key={indice} style={ctx.s.comentarioTexto}>{t(paragrafo)}</Text>)}
          <Text style={ctx.s.comentarioAssinatura}>{t(comentario.autor)} · {t(formatarCarimbo(comentario.escritoEm))}</Text>
        </View>,
      ];
    }
    case 'FUNIL': {
      const funil = dados.funis?.[config.funil];
      return funil ? pedacosDoFunil(funil, ctx) : faltando('FUNIL', config.funil);
    }
    case 'AUDIO': {
      const audio = dados.audios?.[config.audio];
      if (!audio) return faltando('AUDIO', config.audio);
      return [
        <View key="audio" style={ctx.s.cobertura} wrap={false}>
          <View style={ctx.s.analiseBarra} />
          <View style={ctx.s.analiseCorpo}>
            <Text style={{ fontSize: 8 }}>{audio.estado === 'disponivel' ? 'A leitura em áudio está disponível na versão online deste relatório.' : t(audio.motivo)}</Text>
          </View>
        </View>,
      ];
    }
  }
  return [];
}

function Analises({ secao, analises, observacoes, ctx }: {
  secao: string;
  analises: AnalisePublicada[];
  observacoes: Array<{ secao: string; texto: string }>;
  ctx: Contexto;
}) {
  const textos = [
    ...analises.filter((item) => item.secao === secao).map((item) => ({ rotulo: 'Análise', texto: item.texto })),
    ...observacoes.filter((item) => item.secao === secao).map((item) => ({ rotulo: 'Observação', texto: item.texto })),
  ];
  if (!textos.length) return null;
  return (
    <>
      {textos.map((item, indice) => (
        <View key={`${item.rotulo}-${indice}`} style={ctx.s.analise} wrap={false}>
          <View style={ctx.s.analiseBarra} />
          <View style={ctx.s.analiseCorpo}>
            <Text style={ctx.s.analiseRotulo}>{item.rotulo}</Text>
            {paragrafosDaAnalise(item.texto).map((paragrafo, posicao) => <Text key={posicao} style={ctx.s.analiseTexto}>{t(paragrafo)}</Text>)}
          </View>
        </View>
      ))}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Marca: logo e assinatura                                            */
/* ------------------------------------------------------------------ */

export interface LogosDaMarca {
  /** Logo horizontal para fundo claro. */
  claro?: string;
  /** Logo horizontal para fundo escuro (capa). */
  escuro?: string;
  /** Só o símbolo. */
  simbolo?: string;
}

function LogoNoCabecalho({ ctx, logos }: { ctx: Contexto; logos?: LogosDaMarca }) {
  if (logos?.claro) return <Image src={logos.claro} style={{ height: 15, width: 70.3 }} />;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <View style={{ width: 13, height: 13, backgroundColor: ctx.c.primaria, marginRight: 6, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: ctx.c.sobrePrimaria, fontSize: 8, fontWeight: 700, marginTop: 0.5 }}>D</Text>
      </View>
      <Text style={{ fontSize: 8.4, fontWeight: 900, letterSpacing: 2.2, color: ctx.c.primaria }}>DÁCORA</Text>
    </View>
  );
}

function CabecalhoERodape({ snapshot, ctx, logos }: { snapshot: SnapshotMontado; ctx: Contexto; logos?: LogosDaMarca }) {
  return (
    <>
      <View style={ctx.s.cabecalho} fixed>
        <LogoNoCabecalho ctx={ctx} logos={logos} />
        <Text style={ctx.s.cabecalhoMeta}>
          <Text style={ctx.s.cabecalhoCliente}>{t(snapshot.identidade.clienteNome)}</Text>
          {'   ·   '}Relatório de {t(formatarCompetencia(snapshot.identidade.competencia))}
        </Text>
      </View>
      <View style={ctx.s.cabecalhoFio} fixed />
      <View style={ctx.s.rodape} fixed>
        <View style={ctx.s.rodapeMarca}>
          <View style={ctx.s.rodapeQuadro} />
          <Text>{t(ctx.marca.assinatura)}  ·  Relatório mensal de performance  ·  Versão {snapshot.publicacao.versao}</Text>
        </View>
        <Text style={ctx.s.rodapePagina} render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} />
      </View>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Capa                                                                 */
/* ------------------------------------------------------------------ */

function Capa({ snapshot, secoes, paginas, destaques, ctx, logos }: {
  snapshot: SnapshotMontado;
  secoes: BlocoConfigurado[];
  paginas?: Record<string, number>;
  destaques: Metrica[];
  ctx: Contexto;
  logos?: LogosDaMarca;
}) {
  const { c } = ctx;
  const id = snapshot.identidade;
  const fontes = snapshot.fontes.filter((fonte) => fonte.situacao !== 'nao_configurada');
  return (
    <Page size="A4" orientation="landscape" style={{ fontFamily: FONTE, flexDirection: 'row', backgroundColor: '#FFFFFF', color: c.tinta }}>
      <View style={{ width: 318, backgroundColor: c.primaria, paddingHorizontal: 36, paddingTop: 40, paddingBottom: 34, justifyContent: 'space-between', position: 'relative' }}>
        {logos?.simbolo && (
          <View style={{ position: 'absolute', right: -70, bottom: -60, opacity: 0.9 }}>
            <AneisDecorativos tamanho={300} cor={c.acento} />
          </View>
        )}
        {logos?.escuro
          ? <Image src={logos.escuro} style={{ width: 150, height: 32 }} />
          : (
            <View>
              <Text style={{ color: c.sobrePrimaria, fontSize: 13, fontWeight: 900, letterSpacing: 4 }}>DÁCORA</Text>
              <Text style={{ color: c.sobrePrimariaSuave, fontSize: 7.2, letterSpacing: 2.2, marginTop: 3, textTransform: 'uppercase' }}>Performance Digital</Text>
            </View>
          )}
        <View>
          <View style={{ width: 30, height: 3, backgroundColor: c.acento, marginBottom: 14 }} />
          <Text style={{ color: c.sobrePrimariaSuave, fontSize: 7.6, fontWeight: 700, letterSpacing: 1.8, textTransform: 'uppercase', marginBottom: 10 }}>
            Relatório mensal de performance
          </Text>
          <Text style={{ color: c.sobrePrimaria, fontSize: id.clienteNome.length > 22 ? 26 : 32, fontWeight: 700, lineHeight: 1.05, letterSpacing: -0.6, marginBottom: 8 }}>
            {t(id.clienteNome)}
          </Text>
          <Text style={{ color: c.acento, fontSize: 17, fontWeight: 500 }}>
            {t(maiuscula(formatarCompetencia(id.competencia)))}
          </Text>
        </View>
        <View style={{ borderTopWidth: 0.8, borderTopColor: c.destaque, paddingTop: 12 }}>
          <Text style={{ color: c.sobrePrimariaSuave, fontSize: 7.6, lineHeight: 1.6 }}>
            Período: {t(formatarPeriodo(id.periodo.inicio, id.periodo.fim))}
          </Text>
          <Text style={{ color: c.sobrePrimariaSuave, fontSize: 7.6, lineHeight: 1.6 }}>
            Versão {snapshot.publicacao.versao}
            {snapshot.publicacao.aprovadoEm ? ` · liberada em ${t(formatarCarimbo(snapshot.publicacao.aprovadoEm))}` : ''}
          </Text>
          <Text style={{ color: c.sobrePrimaria, fontSize: 8, fontWeight: 700, marginTop: 10 }}>{t(ctx.marca.assinatura)}</Text>
        </View>
      </View>

      <View style={{ flex: 1, paddingHorizontal: 40, paddingTop: 44, paddingBottom: 34, justifyContent: 'space-between' }}>
        {destaques.length > 0 && (
          <View>
            <Text style={{ color: c.destaque, fontSize: 7.2, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 10 }}>
              O mês em números
            </Text>
            <View style={{ flexDirection: 'row', marginHorizontal: -5 }}>
              {destaques.map((metrica) => (
                <View key={metrica.id} style={{ flex: 1, paddingHorizontal: 5 }}>
                  <View style={{ borderTopWidth: 2.4, borderTopColor: c.primaria, paddingTop: 8 }}>
                    <Text style={{ fontSize: 6.5, fontWeight: 700, letterSpacing: 0.6, textTransform: 'uppercase', color: c.cinza, marginBottom: 4 }}>{t(metrica.rotulo)}</Text>
                    <Text style={{ fontSize: 17, fontWeight: 700, letterSpacing: -0.3, marginBottom: 4 }}>{tv(metrica.valor, metrica.unidade, metrica.sufixo)}</Text>
                    <Variacao metrica={metrica} ctx={ctx} />
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        <View>
          <Text style={{ color: c.destaque, fontSize: 7.2, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 8 }}>
            Neste relatório
          </Text>
          {secoes.map((config, indice) => (
            <View key={config.id} style={{ flexDirection: 'row', alignItems: 'flex-end', paddingVertical: secoes.length > 12 ? 1.8 : 3, borderBottomWidth: 0.5, borderBottomColor: c.filete }}>
              <Text style={{ width: 22, fontSize: 7.4, fontWeight: 700, color: c.destaque }}>{String(indice + 1).padStart(2, '0')}</Text>
              <Text style={{ flex: 1, fontSize: secoes.length > 12 ? 7.8 : 8.6 }}>{t(config.titulo)}</Text>
              <Text style={{ width: 24, textAlign: 'right', fontSize: 7.8, color: c.cinza }}>{paginas?.[config.id] ?? ''}</Text>
            </View>
          ))}
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
          <Text style={{ fontSize: 6.8, color: c.suave, marginRight: 8 }}>Fontes deste documento:</Text>
          {fontes.map((fonte) => (
            <View key={fonte.plataforma} style={{ flexDirection: 'row', alignItems: 'center', marginRight: 10 }}>
              <View style={{ width: 5, height: 5, backgroundColor: corDaPlataforma(fonte.plataforma, c), marginRight: 4 }} />
              <Text style={{ fontSize: 7, color: c.cinza }}>{t(fonte.rotulo)}</Text>
            </View>
          ))}
        </View>
      </View>
    </Page>
  );
}

/* ------------------------------------------------------------------ */
/* Documento                                                            */
/* ------------------------------------------------------------------ */

export interface RelatorioPdfProps {
  snapshot: SnapshotMontado;
  analisesPublicadas?: AnalisePublicada[];
  observacoesPublicas?: Array<{ secao: string; texto: string }>;
  /** Miniaturas já baixadas (servidor). Sem o mapa, usa o endereço direto. */
  imagens?: ImagensDoPdf;
  /** Logos em imagem da marca, quando ela tem (a Dácora é tipográfica). */
  logos?: LogosDaMarca;
  /** Página de cada seção, apurada na primeira passada — preenche o sumário da capa. */
  paginasDasSecoes?: Record<string, number>;
  /** Chamada durante a paginação com a página em que cada seção começou. */
  aoPaginarSecao?: (id: string, pagina: number) => void;
}

function destaquesDaCapa(snapshot: SnapshotMontado): Metrica[] {
  const primeira = snapshot.montagem.find((config) => config.bloco === 'B1' && !config.indisponivel);
  if (!primeira || primeira.bloco !== 'B1') return [];
  return (snapshot.dados.faixas[primeira.faixa]?.metricas ?? []).slice(0, 4);
}

export default function RelatorioPdf({
  snapshot,
  analisesPublicadas = [],
  observacoesPublicas = [],
  imagens,
  logos,
  paginasDasSecoes,
  aoPaginarSecao,
}: RelatorioPdfProps): ReactElement<DocumentProps> {
  const publicado = aplicarIntroducaoAprovada(snapshot, introducaoDasAnalises(analisesPublicadas));
  const marca = marcaDoRelatorio(publicado.identidade);
  const ctx: Contexto = { s: estilosSemCompartilhar(criarEstilos(marca.cores)), c: marca.cores, marca, imagens };
  const secoes = publicado.montagem.filter((config) => config.bloco !== 'B8' || Boolean(publicado.dados.comentarios?.[config.comentario]));
  const resumo = publicado.leitura.resumoExecutivo;
  const observacoesGerais = observacoesPublicas.filter((item) => item.secao === 'introducao' || item.secao === 'relatorio_inteiro');
  const id = publicado.identidade;

  return (
    <Document
      title={`Relatório ${formatarCompetencia(id.competencia)} - ${id.clienteNome}`}
      author={marca.assinatura}
      creator={marca.assinatura}
      producer={marca.assinatura}
      subject="Relatório mensal de performance"
      keywords={`${marca.nome}, relatório mensal, ${id.clienteNome}, versão ${publicado.publicacao.versao}, ${publicado.publicacao.checksum}`}
      language="pt-BR"
    >
      <Capa
        snapshot={publicado}
        secoes={secoes}
        paginas={paginasDasSecoes}
        destaques={destaquesDaCapa(publicado)}
        ctx={ctx}
        logos={logos}
      />

      <Page size="A4" orientation="landscape" style={ctx.s.pagina} wrap>
        <CabecalhoERodape snapshot={publicado} ctx={ctx} logos={logos} />

        {resumo.length > 0 && (
          <View style={ctx.s.resumo} wrap={false}>
            <View style={ctx.s.resumoRotuloCol}>
              <Text style={ctx.s.resumoRotulo}>Resumo do mês</Text>
              <Text style={ctx.s.resumoTitulo}>{t(maiuscula(formatarCompetencia(id.competencia)))}</Text>
            </View>
            <View style={ctx.s.resumoTextoCol}>
              {resumo.map((afirmacao, indice) => <Text key={indice} style={ctx.s.resumoTexto}>{t(afirmacao.texto)}</Text>)}
            </View>
          </View>
        )}
        <Analises secao="introducao" analises={[]} observacoes={observacoesGerais.map((item) => ({ ...item, secao: 'introducao' }))} ctx={ctx} />

        {secoes.map((config, indice) => {
          const [abertura, ...resto] = pedacosDoBloco(config, publicado, ctx);
          return (
            <View key={config.id} style={ctx.s.secao}>
              {/* Título + primeiro pedaço: um bloco só, que não se parte. */}
              <View wrap={false}>
                <View style={ctx.s.secaoCabecalho}>
                  <Text style={ctx.s.secaoIndice}>{String(indice + 1).padStart(2, '0')}</Text>
                  <View style={ctx.s.secaoTextos}>
                    <Text style={ctx.s.secaoTitulo}>{t(config.titulo)}</Text>
                    {config.apoio && <Text style={ctx.s.secaoApoio}>{t(config.apoio)}</Text>}
                  </View>
                  {aoPaginarSecao && (
                    <Text
                      style={{ position: 'absolute', width: 1, height: 1, fontSize: 1, color: '#FFFFFF' }}
                      render={({ pageNumber }) => {
                        aoPaginarSecao(config.id, pageNumber);
                        return ' ';
                      }}
                    />
                  )}
                </View>
                {abertura}
              </View>
              {resto}
              <Analises secao={`bloco:${config.id}`} analises={analisesPublicadas} observacoes={observacoesPublicas} ctx={ctx} />
              {config.nota && <Text style={ctx.s.nota}>{t(config.nota)}</Text>}
            </View>
          );
        })}

        <View style={ctx.s.fecho} wrap={false}>
          <View style={ctx.s.fechoCol}>
            <Text style={ctx.s.fechoRotulo}>Sobre este documento</Text>
            <Text style={ctx.s.fechoTexto}>
              Documento fechado: os números foram registrados uma vez, no fechamento do período, e não mudam depois de liberados. As plataformas reatribuem resultados ao longo do tempo, por isso consultas feitas mais tarde podem trazer valores diferentes.
            </Text>
          </View>
          <View style={ctx.s.fechoCol}>
            <Text style={ctx.s.fechoRotulo}>Identificação</Text>
            <Text style={ctx.s.fechoTexto}>Versão {publicado.publicacao.versao} · gerada em {t(formatarCarimbo(publicado.publicacao.geradoEm))}</Text>
            {publicado.publicacao.aprovadoEm && <Text style={ctx.s.fechoTexto}>Liberada em {t(formatarCarimbo(publicado.publicacao.aprovadoEm))}</Text>}
            <Text style={ctx.s.fechoTexto}>Código do documento: {t(publicado.publicacao.checksum)}</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}
