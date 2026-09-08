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
} from '../analisePublicada';
import {
  formatarCarimbo,
  formatarCompetencia,
  formatarDiaMes,
  formatarNumero,
  formatarPeriodo,
  formatarVariacao,
  textoValor,
} from '../format';
import { termosDoGlossario, termoDoGlossario } from '../glossario';
import type { Metrica, PlataformaId, Unidade, Valor } from '../snapshot';
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

const CORES = {
  papel: '#F2EFEB',
  branco: '#FFFFFF',
  verde: '#014029',
  verdeMedio: '#02593A',
  tinta: '#0D1F18',
  cinza: '#40544B',
  sage: '#667970',
  filete: '#D8DDD9',
  fileteForte: '#AAB7B0',
  atencao: '#98500F',
  falha: '#8E3D32',
  meta: '#176B87',
  google: '#8A5700',
  pinterest: '#9B3D4D',
  ga4: '#6955A3',
  instagram: '#9B416F',
  ecommerce: '#0D1F18',
  crm: '#006B5B',
} as const;

const FONTE_PDF = 'Red Hat PDF';

export function registrarFontesDoRelatorioPdf(fontes: {
  regular: string;
  medium: string;
  bold: string;
}) {
  Font.register({
    family: FONTE_PDF,
    fonts: [
      { src: fontes.regular, fontWeight: 400 },
      { src: fontes.medium, fontWeight: 500 },
      { src: fontes.bold, fontWeight: 700 },
    ],
  });
  Font.registerHyphenationCallback((palavra) => [palavra]);
}

const styles = StyleSheet.create({
  page: {
    backgroundColor: CORES.branco,
    color: CORES.tinta,
    fontFamily: FONTE_PDF,
    fontSize: 9,
    lineHeight: 1.35,
    paddingTop: 46,
    paddingRight: 34,
    paddingBottom: 36,
    paddingLeft: 34,
  },
  capa: {
    backgroundColor: CORES.papel,
    color: CORES.tinta,
    fontFamily: FONTE_PDF,
    fontSize: 10,
    flexDirection: 'row',
  },
  capaMarca: {
    width: '42%',
    backgroundColor: CORES.verde,
    color: CORES.papel,
    paddingTop: 48,
    paddingHorizontal: 42,
    paddingBottom: 36,
    justifyContent: 'space-between',
  },
  capaConteudo: {
    width: '58%',
    paddingTop: 46,
    paddingHorizontal: 42,
    paddingBottom: 34,
    justifyContent: 'space-between',
  },
  marca: {
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: 2.4,
    textTransform: 'uppercase',
  },
  eyebrowClaro: {
    color: '#C8D8D0',
    fontSize: 8,
    fontWeight: 700,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    marginBottom: 13,
  },
  tituloCapa: {
    fontSize: 35,
    fontWeight: 500,
    lineHeight: 1.02,
    letterSpacing: -1.2,
    marginBottom: 9,
  },
  competenciaCapa: {
    color: '#D6E1DC',
    fontSize: 17,
    fontWeight: 400,
    marginBottom: 24,
  },
  metaCapa: {
    borderTopWidth: 1,
    borderTopColor: '#44715F',
    paddingTop: 14,
    color: '#D6E1DC',
    fontSize: 8.5,
    gap: 4,
  },
  capaRotulo: {
    color: CORES.verde,
    fontSize: 8,
    fontWeight: 700,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 13,
  },
  resumoCapa: {
    fontSize: 13,
    lineHeight: 1.5,
    marginBottom: 12,
  },
  capaFontes: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  chip: {
    borderWidth: 1,
    borderColor: CORES.fileteForte,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 7.5,
    color: CORES.cinza,
  },
  capaRodape: {
    color: '#BFD0C7',
    fontSize: 7.5,
    lineHeight: 1.45,
  },
  capaDocumento: {
    borderTopWidth: 1,
    borderTopColor: CORES.filete,
    paddingTop: 12,
    fontSize: 7.5,
    color: CORES.cinza,
    gap: 3,
  },
  cabecalho: {
    position: 'absolute',
    top: 20,
    left: 34,
    right: 34,
    height: 18,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: CORES.filete,
    paddingBottom: 7,
  },
  cabecalhoMarca: {
    color: CORES.verde,
    fontSize: 7.5,
    fontWeight: 700,
    letterSpacing: 1.3,
    textTransform: 'uppercase',
  },
  cabecalhoMeta: {
    marginLeft: 'auto',
    color: CORES.cinza,
    fontSize: 7.5,
  },
  rodape: {
    position: 'absolute',
    bottom: 16,
    left: 34,
    right: 34,
    flexDirection: 'row',
    color: CORES.sage,
    fontSize: 7,
  },
  rodapePagina: {
    marginLeft: 'auto',
  },
  secao: {
    marginBottom: 18,
  },
  secaoCabecalho: {
    borderTopWidth: 2,
    borderTopColor: CORES.verde,
    paddingTop: 8,
    marginBottom: 10,
  },
  secaoLinha: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  secaoIndice: {
    width: 28,
    color: CORES.verde,
    fontSize: 7.5,
    fontWeight: 700,
    letterSpacing: 1,
  },
  secaoTitulo: {
    fontSize: 17,
    fontWeight: 500,
    letterSpacing: -0.35,
  },
  secaoApoio: {
    marginLeft: 28,
    marginTop: 3,
    color: CORES.cinza,
    fontSize: 8.3,
    maxWidth: 570,
  },
  nota: {
    color: CORES.cinza,
    fontSize: 7.3,
    lineHeight: 1.45,
    marginTop: 8,
  },
  analise: {
    borderLeftWidth: 3,
    borderLeftColor: CORES.verdeMedio,
    backgroundColor: '#F4F7F5',
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginTop: 9,
    gap: 5,
  },
  analiseRotulo: {
    color: CORES.verde,
    fontSize: 7,
    fontWeight: 700,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  analiseTexto: {
    fontSize: 8.5,
    lineHeight: 1.45,
  },
  metricas: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  metrica: {
    width: '25%',
    paddingHorizontal: 4,
    marginBottom: 8,
  },
  metricaInterna: {
    borderWidth: 1,
    borderColor: CORES.filete,
    borderTopWidth: 3,
    backgroundColor: '#FBFCFB',
    paddingHorizontal: 10,
    paddingVertical: 9,
    minHeight: 72,
  },
  metricaRotulo: {
    color: CORES.cinza,
    fontSize: 6.8,
    fontWeight: 700,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    marginBottom: 5,
  },
  metricaValor: {
    fontSize: 16,
    fontWeight: 500,
    marginBottom: 4,
  },
  metricaComparativo: {
    color: CORES.cinza,
    fontSize: 6.8,
  },
  metricaDescricao: {
    color: CORES.sage,
    fontSize: 6.7,
    lineHeight: 1.35,
    marginTop: 5,
  },
  escopo: {
    color: CORES.cinza,
    fontSize: 7.2,
    marginBottom: 7,
  },
  tabela: {
    borderWidth: 1,
    borderColor: CORES.filete,
    marginTop: 4,
  },
  linhaTabela: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: CORES.filete,
    minHeight: 23,
    alignItems: 'stretch',
  },
  linhaCabecalho: {
    backgroundColor: CORES.verde,
    color: CORES.branco,
    minHeight: 25,
  },
  linhaTotal: {
    backgroundColor: CORES.papel,
    borderBottomWidth: 0,
  },
  celula: {
    flexGrow: 1,
    flexBasis: 0,
    paddingHorizontal: 6,
    paddingVertical: 5,
    fontSize: 7.2,
    justifyContent: 'center',
  },
  celulaPrimeira: {
    flexGrow: 3.4,
  },
  celulaCabecalho: {
    fontSize: 6.5,
    fontWeight: 700,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  celulaNumero: {
    textAlign: 'right',
  },
  celulaNome: {
    fontWeight: 500,
  },
  etiqueta: {
    color: CORES.sage,
    fontSize: 6,
    marginTop: 2,
    textTransform: 'uppercase',
  },
  cobertura: {
    backgroundColor: '#F4F7F5',
    borderLeftWidth: 3,
    borderLeftColor: CORES.verdeMedio,
    padding: 9,
    marginBottom: 7,
    fontSize: 7.5,
    color: CORES.cinza,
    gap: 3,
  },
  definicoes: {
    marginTop: 6,
    gap: 2,
  },
  definicaoTexto: {
    color: CORES.cinza,
    fontSize: 6.8,
    lineHeight: 1.35,
  },
  gradeCriativos: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  criativo: {
    width: '33.333%',
    paddingHorizontal: 4,
    marginBottom: 8,
  },
  criativoInterno: {
    borderWidth: 1,
    borderColor: CORES.filete,
    backgroundColor: '#FBFCFB',
    padding: 8,
    flexDirection: 'row',
    minHeight: 88,
  },
  criativoImagem: {
    width: 63,
    height: 63,
    objectFit: 'cover',
    marginRight: 9,
  },
  criativoVazio: {
    width: 63,
    height: 63,
    backgroundColor: '#E5E9E6',
    marginRight: 9,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 5,
  },
  criativoVazioTexto: {
    color: CORES.sage,
    fontSize: 6,
    textAlign: 'center',
  },
  criativoConteudo: {
    flex: 1,
  },
  criativoNome: {
    fontWeight: 500,
    fontSize: 7.5,
    marginBottom: 5,
  },
  criativoNumero: {
    color: CORES.verde,
    fontWeight: 700,
    fontSize: 8,
    marginBottom: 2,
  },
  criativoSituacao: {
    color: CORES.sage,
    fontSize: 6.2,
    marginTop: 3,
  },
  funil: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -3,
    marginTop: 5,
  },
  funilEtapa: {
    width: '20%',
    paddingHorizontal: 3,
    marginBottom: 6,
  },
  funilEtapaInterna: {
    borderWidth: 1,
    borderColor: CORES.filete,
    padding: 7,
    minHeight: 49,
  },
  funilValor: {
    fontSize: 13,
    color: CORES.verde,
    fontWeight: 500,
  },
  funilRotulo: {
    color: CORES.cinza,
    fontSize: 6.5,
    marginTop: 3,
  },
  indisponivel: {
    borderWidth: 1,
    borderColor: '#D8C5B4',
    backgroundColor: '#FCF8F3',
    padding: 11,
    color: CORES.cinza,
    fontSize: 8,
    gap: 4,
  },
  comentario: {
    borderLeftWidth: 4,
    borderLeftColor: CORES.verde,
    paddingLeft: 13,
    gap: 6,
  },
  comentarioTexto: {
    fontSize: 10,
    lineHeight: 1.5,
  },
  comentarioAssinatura: {
    color: CORES.cinza,
    fontSize: 7.2,
  },
  glossario: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -5,
  },
  glossarioItem: {
    width: '50%',
    paddingHorizontal: 5,
    marginBottom: 8,
  },
  glossarioTermo: {
    color: CORES.verde,
    fontSize: 7.6,
    fontWeight: 700,
    marginBottom: 2,
  },
  glossarioTexto: {
    color: CORES.cinza,
    fontSize: 7.2,
    lineHeight: 1.4,
  },
});

const corDaPlataforma = (plataforma: PlataformaId | undefined) =>
  plataforma ? CORES[plataforma] : CORES.verde;

const textoPdf = (valor: string | null | undefined) =>
  String(valor ?? '').replace(/[\u2010-\u2015\u2212]/g, '-');

function textoDoValor(valor: Valor, unidade: Unidade, sufixo?: string) {
  return textoPdf(textoValor(valor, unidade, sufixo));
}

function plataformaDaMetrica(metrica: Metrica): PlataformaId | undefined {
  return metrica.origem.fontes[0];
}

function descricaoDaMetrica(metrica: Metrica) {
  return metrica.descricao ?? (metrica.glossarioId ? termoDoGlossario(metrica.glossarioId)?.texto : undefined);
}

function EscopoPdf({ escopo }: { escopo: Escopo }) {
  return <Text style={styles.escopo}>Escopo: {textoPdf(escopo.rotulo)}</Text>;
}

function Notas({ itens }: { itens: string[] | undefined }) {
  if (!itens?.length) return null;
  return (
    <View style={styles.definicoes}>
      {itens.map((item, indice) => <Text key={indice} style={styles.definicaoTexto}>- {textoPdf(item)}</Text>)}
    </View>
  );
}

function ComparativoMetrica({ metrica }: { metrica: Metrica }) {
  const comparativo = metrica.comparativo;
  if (!comparativo?.permitido) {
    return comparativo?.motivo
      ? <Text style={styles.metricaComparativo}>{textoPdf(comparativo.motivo)}</Text>
      : null;
  }
  if (comparativo.variacao == null) return null;
  const base = comparativo.valorBase
    ? textoDoValor(comparativo.valorBase, metrica.unidade, metrica.sufixo)
    : null;
  return (
    <Text style={styles.metricaComparativo}>
      {textoPdf(formatarVariacao(comparativo.variacao))}
      {base ? ` vs. ${textoPdf(comparativo.competenciaBase)} (${base})` : ''}
    </Text>
  );
}

function FaixaPdf({ faixa }: { faixa: FaixaIndicadores }) {
  return (
    <View>
      <EscopoPdf escopo={faixa.escopo} />
      <View style={styles.metricas}>
        {faixa.metricas.map((metrica) => (
          <View key={metrica.id} style={styles.metrica} wrap={false}>
            <View style={[styles.metricaInterna, { borderTopColor: corDaPlataforma(plataformaDaMetrica(metrica)) }]}>
              <Text style={styles.metricaRotulo}>{textoPdf(metrica.rotulo)}</Text>
              <Text style={styles.metricaValor}>{textoDoValor(metrica.valor, metrica.unidade, metrica.sufixo)}</Text>
              <ComparativoMetrica metrica={metrica} />
              {descricaoDaMetrica(metrica) && <Text style={styles.metricaDescricao}>{textoPdf(descricaoDaMetrica(metrica))}</Text>}
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

function TabelaPdf({ tabela }: { tabela: TabelaEntidades }) {
  const cabecalhos = [tabela.rotuloDimensao, ...tabela.colunas.map((coluna) => coluna.rotulo)];
  return (
    <View>
      <EscopoPdf escopo={tabela.escopo} />
      {tabela.cobertura && (
        <View style={styles.cobertura} wrap={false}>
          <Text>
            Lista parcial: {textoDoValor(tabela.total.valores[tabela.cobertura.colunaId] ?? tabela.cobertura.totalDoUniverso, tabela.colunas.find((c) => c.id === tabela.cobertura?.colunaId)?.unidade ?? 'brl')} de {textoDoValor(tabela.cobertura.totalDoUniverso, tabela.colunas.find((c) => c.id === tabela.cobertura?.colunaId)?.unidade ?? 'brl')} em {textoPdf(tabela.cobertura.universo)}.
          </Text>
          {tabela.cobertura.motivos.map((motivo, indice) => <Text key={indice}>- {textoPdf(motivo)}</Text>)}
        </View>
      )}
      <View style={styles.tabela}>
        <View style={[styles.linhaTabela, styles.linhaCabecalho]} fixed>
          {cabecalhos.map((rotulo, indice) => (
            <View key={`${rotulo}-${indice}`} style={[styles.celula, indice === 0 && styles.celulaPrimeira]}>
              <Text style={[styles.celulaCabecalho, indice > 0 && styles.celulaNumero]}>{textoPdf(rotulo)}</Text>
            </View>
          ))}
        </View>
        {tabela.linhas.map((linha) => (
          <View key={linha.id} style={styles.linhaTabela} wrap={false}>
            <View style={[styles.celula, styles.celulaPrimeira]}>
              <Text style={styles.celulaNome}>{textoPdf(linha.nome)}</Text>
              {linha.etiqueta && <Text style={styles.etiqueta}>{textoPdf(linha.etiqueta)}</Text>}
            </View>
            {tabela.colunas.map((coluna) => (
              <View key={coluna.id} style={styles.celula}>
                <Text style={styles.celulaNumero}>{textoDoValor(linha.valores[coluna.id], coluna.unidade, coluna.sufixo)}</Text>
              </View>
            ))}
          </View>
        ))}
        <View style={[styles.linhaTabela, styles.linhaTotal]} wrap={false}>
          <View style={[styles.celula, styles.celulaPrimeira]}><Text style={styles.celulaNome}>{textoPdf(tabela.total.rotulo)}</Text></View>
          {tabela.colunas.map((coluna) => (
            <View key={coluna.id} style={styles.celula}>
              <Text style={[styles.celulaNumero, styles.celulaNome]}>
                {tabela.total.valores[coluna.id] ? textoDoValor(tabela.total.valores[coluna.id], coluna.unidade, coluna.sufixo) : '-'}
              </Text>
            </View>
          ))}
        </View>
      </View>
      <Notas itens={tabela.definicoes} />
    </View>
  );
}

function EvolucaoPdf({ evolucao }: { evolucao: EvolucaoMensal }) {
  return (
    <View>
      <View style={styles.tabela}>
        <View style={[styles.linhaTabela, styles.linhaCabecalho]}>
          <View style={[styles.celula, styles.celulaPrimeira]}><Text style={styles.celulaCabecalho}>Mês</Text></View>
          {evolucao.colunas.map((coluna) => <View key={coluna.id} style={styles.celula}><Text style={[styles.celulaCabecalho, styles.celulaNumero]}>{textoPdf(coluna.rotulo)}</Text></View>)}
        </View>
        {evolucao.meses.map((mes) => (
          <View key={mes.competencia} style={styles.linhaTabela} wrap={false}>
            <View style={[styles.celula, styles.celulaPrimeira]}>
              <Text style={styles.celulaNome}>{textoPdf(formatarCompetencia(mes.competencia))}</Text>
              {mes.observacao && <Text style={styles.etiqueta}>{textoPdf(mes.observacao)}</Text>}
            </View>
            {evolucao.colunas.map((coluna) => <View key={coluna.id} style={styles.celula}><Text style={styles.celulaNumero}>{textoDoValor(mes.valores[coluna.id], coluna.unidade, coluna.sufixo)}</Text></View>)}
          </View>
        ))}
        <View style={[styles.linhaTabela, styles.linhaTotal]} wrap={false}>
          <View style={[styles.celula, styles.celulaPrimeira]}><Text style={styles.celulaNome}>{textoPdf(evolucao.total.rotulo)}</Text></View>
          {evolucao.colunas.map((coluna) => <View key={coluna.id} style={styles.celula}><Text style={[styles.celulaNumero, styles.celulaNome]}>{evolucao.total.valores[coluna.id] ? textoDoValor(evolucao.total.valores[coluna.id], coluna.unidade, coluna.sufixo) : '-'}</Text></View>)}
        </View>
      </View>
      <Notas itens={evolucao.definicoes} />
    </View>
  );
}

function RankingPdf({ ranking }: { ranking: RankingCriativos }) {
  return (
    <View>
      <EscopoPdf escopo={ranking.escopo} />
      <Text style={styles.nota}>Ordenado por {textoPdf(ranking.ordenadoPor)}.</Text>
      <View style={styles.gradeCriativos}>
        {ranking.criativos.map((criativo) => (
          <View key={criativo.id} style={styles.criativo} wrap={false}>
            <View style={styles.criativoInterno}>
              {criativo.miniatura?.src && /^(?:https?:|data:)/.test(criativo.miniatura.src)
                ? <Image src={criativo.miniatura.src} style={styles.criativoImagem} />
                : <View style={styles.criativoVazio}><Text style={styles.criativoVazioTexto}>{textoPdf(criativo.motivoSemMiniatura ?? 'Imagem indisponível')}</Text></View>}
              <View style={styles.criativoConteudo}>
                <Text style={styles.criativoNome}>{textoPdf(criativo.nome)}</Text>
                {criativo.numeros.map((numero) => <Text key={numero.rotulo} style={styles.criativoNumero}>{textoPdf(numero.rotulo)}: {textoDoValor(numero.valor, numero.unidade)}</Text>)}
                {criativo.situacao && <Text style={styles.criativoSituacao}>{textoPdf(criativo.situacao.situacao)} - situação em {textoPdf(formatarCarimbo(criativo.situacao.lidaEm))}</Text>}
              </View>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

function QuebraPdf({ quebra }: { quebra: QuebraPorDimensao }) {
  return (
    <View>
      <EscopoPdf escopo={quebra.escopo} />
      <Text style={styles.nota}>{textoPdf(quebra.pergunta)}</Text>
      <View style={styles.tabela}>
        <View style={[styles.linhaTabela, styles.linhaCabecalho]}>
          <View style={[styles.celula, styles.celulaPrimeira]}><Text style={styles.celulaCabecalho}>{textoPdf(quebra.rotuloDimensao ?? 'Categoria')}</Text></View>
          <View style={styles.celula}><Text style={[styles.celulaCabecalho, styles.celulaNumero]}>{textoPdf(quebra.unidadeTexto)}</Text></View>
        </View>
        {quebra.itens.map((item) => <View key={item.id} style={styles.linhaTabela} wrap={false}><View style={[styles.celula, styles.celulaPrimeira]}><Text style={styles.celulaNome}>{textoPdf(item.rotulo)}</Text>{item.nota && <Text style={styles.etiqueta}>{textoPdf(item.nota)}</Text>}</View><View style={styles.celula}><Text style={styles.celulaNumero}>{textoDoValor(item.valor, quebra.unidade)}</Text></View></View>)}
        {quebra.total && <View style={[styles.linhaTabela, styles.linhaTotal]} wrap={false}><View style={[styles.celula, styles.celulaPrimeira]}><Text style={styles.celulaNome}>{textoPdf(quebra.total.rotulo)}</Text></View><View style={styles.celula}><Text style={[styles.celulaNumero, styles.celulaNome]}>{textoDoValor(quebra.total.valor, quebra.unidade)}</Text></View></View>}
      </View>
      <Notas itens={quebra.definicoes} />
    </View>
  );
}

function FunilPdf({ funil }: { funil: FunilRelatorio }) {
  return (
    <View>
      {funil.rotulo && <Text style={styles.nota}>{textoPdf(funil.rotulo)}</Text>}
      <View style={styles.funil}>
        {funil.etapas.map((etapa) => <View key={etapa.id} style={styles.funilEtapa} wrap={false}><View style={styles.funilEtapaInterna}><Text style={styles.funilValor}>{etapa.valor == null ? 'indisponível' : formatarNumero(etapa.valor, 'inteiro')}</Text><Text style={styles.funilRotulo}>{textoPdf(etapa.rotulo)}</Text>{etapa.motivo && <Text style={styles.etiqueta}>{textoPdf(etapa.motivo)}</Text>}</View></View>)}
      </View>
      {funil.transicoes.length > 0 && <Notas itens={funil.transicoes.map((transicao) => transicao.taxa == null ? `${transicao.de} para ${transicao.para}: ${transicao.motivo ?? 'sem taxa'}` : `${transicao.de} para ${transicao.para}: ${formatarNumero(transicao.taxa, 'percentual')}`)} />}
      <Notas itens={funil.avisos?.map((aviso) => aviso.texto)} />
      {funil.observacao && <Text style={styles.nota}>{textoPdf(funil.observacao)}</Text>}
    </View>
  );
}

function SeriePdf({ serie }: { serie: NonNullable<SnapshotMontado['dados']['series']>[string] }) {
  const repeteCabecalho = serie.pontos.length > 22;
  return (
    <View>
      <Text style={styles.nota}>{textoPdf(serie.pergunta)}{serie.unidadeTexto ? ` - ${textoPdf(serie.unidadeTexto)}` : ''}</Text>
      <View style={styles.tabela}>
        <View style={[styles.linhaTabela, styles.linhaCabecalho]} fixed={repeteCabecalho}>
          <View style={[styles.celula, styles.celulaPrimeira]}><Text style={styles.celulaCabecalho}>Data</Text></View>
          {serie.chaves.map((chave) => <View key={chave.id} style={styles.celula}><Text style={[styles.celulaCabecalho, styles.celulaNumero]}>{textoPdf(chave.rotulo)}</Text></View>)}
        </View>
        {serie.pontos.map((ponto) => <View key={ponto.data} style={styles.linhaTabela} wrap={false}><View style={[styles.celula, styles.celulaPrimeira]}><Text>{textoPdf(formatarDiaMes(ponto.data))}</Text></View>{serie.chaves.map((chave) => <View key={chave.id} style={styles.celula}><Text style={styles.celulaNumero}>{ponto.valores[chave.id] == null ? 'indisponível' : textoPdf(formatarNumero(ponto.valores[chave.id]!, serie.unidade))}</Text></View>)}</View>)}
      </View>
      <Notas itens={serie.observacoes} />
    </View>
  );
}

function IndisponivelPdf({ config }: { config: BlocoConfigurado }) {
  if (!config.indisponivel) return null;
  return <View style={styles.indisponivel}><Text>{textoPdf(config.indisponivel.motivo)}</Text>{config.indisponivel.oQueTemos?.map((item, indice) => <Text key={indice}>- {textoPdf(item)}</Text>)}{config.indisponivel.dependeDe && <Text>Depende de: {textoPdf(config.indisponivel.dependeDe)}</Text>}</View>;
}

function DadoFaltandoPdf({ bloco, chave }: { bloco: string; chave: string }) {
  return <View style={styles.indisponivel}><Text>O bloco {bloco} aponta para "{textoPdf(chave)}", que não existe neste relatório.</Text></View>;
}

function renderizarBlocoPdf(config: BlocoConfigurado, snapshot: SnapshotMontado): ReactNode {
  if (config.indisponivel) return <IndisponivelPdf config={config} />;
  switch (config.bloco) {
    case 'B1': {
      const faixa = snapshot.dados.faixas[config.faixa];
      if (!faixa) return <DadoFaltandoPdf bloco="B1" chave={config.faixa} />;
      const funil = config.funil ? snapshot.dados.funis?.[config.funil] : null;
      return <><FaixaPdf faixa={faixa} />{config.funil && !funil && <DadoFaltandoPdf bloco="FUNIL" chave={config.funil} />}{funil && <FunilPdf funil={funil} />}</>;
    }
    case 'B2': {
      const tabela = snapshot.dados.tabelas[config.tabela];
      return tabela ? <TabelaPdf tabela={tabela} /> : <DadoFaltandoPdf bloco="B2" chave={config.tabela} />;
    }
    case 'B3': {
      const evolucao = snapshot.dados.evolucoesMensais[config.evolucao];
      return evolucao ? <EvolucaoPdf evolucao={evolucao} /> : <DadoFaltandoPdf bloco="B3" chave={config.evolucao} />;
    }
    case 'B4': {
      const ranking = snapshot.dados.rankingsCriativos[config.ranking];
      return ranking ? <RankingPdf ranking={ranking} /> : <DadoFaltandoPdf bloco="B4" chave={config.ranking} />;
    }
    case 'B5': {
      const serie = snapshot.dados.series?.[config.serie];
      return serie ? <SeriePdf serie={serie} /> : <DadoFaltandoPdf bloco="B5" chave={config.serie} />;
    }
    case 'B6': {
      const quebra = snapshot.dados.quebras[config.quebra];
      return quebra ? <QuebraPdf quebra={quebra} /> : <DadoFaltandoPdf bloco="B6" chave={config.quebra} />;
    }
    case 'B7':
      return <View style={styles.glossario}>{termosDoGlossario(config.metricas).map((termo) => <View key={termo.id} style={styles.glossarioItem} wrap={false}><Text style={styles.glossarioTermo}>{textoPdf(termo.termo)}</Text><Text style={styles.glossarioTexto}>{textoPdf(termo.texto)}</Text></View>)}</View>;
    case 'B8': {
      const comentario = snapshot.dados.comentarios?.[config.comentario];
      if (!comentario) return null;
      return <View style={styles.comentario}>{comentario.paragrafos.map((paragrafo, indice) => <Text key={indice} style={styles.comentarioTexto}>{textoPdf(paragrafo)}</Text>)}<Text style={styles.comentarioAssinatura}>{textoPdf(comentario.autor)} - {textoPdf(formatarCarimbo(comentario.escritoEm))}</Text></View>;
    }
    case 'FUNIL': {
      const funil = snapshot.dados.funis?.[config.funil];
      return funil ? <FunilPdf funil={funil} /> : <DadoFaltandoPdf bloco="FUNIL" chave={config.funil} />;
    }
    case 'AUDIO': {
      const audio = snapshot.dados.audios?.[config.audio];
      if (!audio) return <DadoFaltandoPdf bloco="AUDIO" chave={config.audio} />;
      return <View style={styles.cobertura}><Text>{audio.estado === 'disponivel' ? 'A leitura em áudio está disponível na versão online deste relatório.' : textoPdf(audio.motivo)}</Text></View>;
    }
  }
}

function AnalisesDaSecao({ secao, analises, observacoes }: {
  secao: string;
  analises: AnalisePublicada[];
  observacoes: Array<{ secao: string; texto: string }>;
}) {
  const textos = [
    ...analises.filter((item) => item.secao === secao).map((item) => ({ rotulo: 'Análise aprovada', texto: item.texto })),
    ...observacoes.filter((item) => item.secao === secao).map((item) => ({ rotulo: 'Observação', texto: item.texto })),
  ];
  if (!textos.length) return null;
  return <>{textos.map((item, indice) => <View key={`${item.rotulo}-${indice}`} style={styles.analise} wrap={false}><Text style={styles.analiseRotulo}>{item.rotulo}</Text>{paragrafosDaAnalise(item.texto).map((paragrafo, posicao) => <Text key={posicao} style={styles.analiseTexto}>{textoPdf(paragrafo)}</Text>)}</View>)}</>;
}

function CabecalhoERodape({ snapshot }: { snapshot: SnapshotMontado }) {
  return <><View style={styles.cabecalho} fixed><Text style={styles.cabecalhoMarca}>Dácora Performance Digital</Text><Text style={styles.cabecalhoMeta}>{textoPdf(snapshot.identidade.clienteNome)} | {textoPdf(formatarCompetencia(snapshot.identidade.competencia))}</Text></View><View style={styles.rodape} fixed><Text>Versão {snapshot.publicacao.versao} | Documento {textoPdf(snapshot.publicacao.checksum.slice(0, 12))}</Text><Text style={styles.rodapePagina} render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} /></View></>;
}

export interface RelatorioPdfProps {
  snapshot: SnapshotMontado;
  analisesPublicadas?: AnalisePublicada[];
  observacoesPublicas?: Array<{ secao: string; texto: string }>;
}

function blocoPrecisaDePaginasProprias(config: BlocoConfigurado, snapshot: SnapshotMontado): boolean {
  switch (config.bloco) {
    case 'B2':
      return true;
    case 'B3':
      return (snapshot.dados.evolucoesMensais[config.evolucao]?.meses.length ?? 0) > 12;
    case 'B4':
      return (snapshot.dados.rankingsCriativos[config.ranking]?.criativos.length ?? 0) > 8;
    case 'B5':
      return (snapshot.dados.series?.[config.serie]?.pontos.length ?? 0) > 22;
    case 'B6':
      return (snapshot.dados.quebras[config.quebra]?.itens.length ?? 0) > 15;
    case 'B7':
      return config.metricas.length > 20;
    default:
      return false;
  }
}

function agruparSecoes(secoes: BlocoConfigurado[], snapshot: SnapshotMontado, tamanho = 4): BlocoConfigurado[][] {
  const grupos: BlocoConfigurado[][] = [];
  let grupoAtual: BlocoConfigurado[] = [];
  for (const secao of secoes) {
    if (blocoPrecisaDePaginasProprias(secao, snapshot)) {
      if (grupoAtual.length) grupos.push(grupoAtual);
      grupos.push([secao]);
      grupoAtual = [];
      continue;
    }
    grupoAtual.push(secao);
    if (grupoAtual.length === tamanho) {
      grupos.push(grupoAtual);
      grupoAtual = [];
    }
  }
  if (grupoAtual.length) grupos.push(grupoAtual);
  return grupos;
}

export default function RelatorioPdf({ snapshot, analisesPublicadas = [], observacoesPublicas = [] }: RelatorioPdfProps): ReactElement<DocumentProps> {
  const snapshotPublicado = aplicarIntroducaoAprovada(snapshot, introducaoDasAnalises(analisesPublicadas));
  const marca = snapshotPublicado.identidade.marca?.nome ?? 'Dácora';
  const fontes = snapshotPublicado.fontes.filter((fonte) => fonte.situacao !== 'nao_configurada');
  const secoes = snapshotPublicado.montagem.filter((config) => config.bloco !== 'B8' || Boolean(snapshotPublicado.dados.comentarios?.[config.comentario]));
  const gruposDeSecoes = agruparSecoes(secoes, snapshotPublicado);
  const observacoesDaIntroducao = observacoesPublicas.filter((item) => item.secao === 'introducao' || item.secao === 'relatorio_inteiro');

  return (
    <Document
      title={`Relatório ${formatarCompetencia(snapshotPublicado.identidade.competencia)} - ${snapshotPublicado.identidade.clienteNome}`}
      author="Dácora Performance Digital"
      subject="Relatório mensal de performance"
      keywords={`Dácora, relatório mensal, ${snapshotPublicado.identidade.clienteNome}`}
    >
      <Page size="A4" orientation="landscape" style={styles.capa}>
        <View style={styles.capaMarca}>
          <Text style={styles.marca}>{textoPdf(marca)}</Text>
          <View>
            <Text style={styles.eyebrowClaro}>Relatório mensal de performance</Text>
            <Text style={styles.tituloCapa}>{textoPdf(snapshotPublicado.identidade.clienteNome)}</Text>
            <Text style={styles.competenciaCapa}>{textoPdf(formatarCompetencia(snapshotPublicado.identidade.competencia))}</Text>
            <View style={styles.metaCapa}>
              <Text>Período: {textoPdf(formatarPeriodo(snapshotPublicado.identidade.periodo.inicio, snapshotPublicado.identidade.periodo.fim))}</Text>
              <Text>Versão {snapshotPublicado.publicacao.versao}</Text>
              <Text>Gerado em {textoPdf(formatarCarimbo(snapshotPublicado.publicacao.geradoEm))}</Text>
            </View>
          </View>
          <Text style={styles.capaRodape}>Dácora Performance Digital{`\n`}Documento executivo preparado a partir do fechamento aprovado.</Text>
        </View>
        <View style={styles.capaConteudo}>
          <View>
            <Text style={styles.capaRotulo}>Leitura do mês</Text>
            {snapshotPublicado.leitura.resumoExecutivo.map((afirmacao, indice) => <Text key={indice} style={styles.resumoCapa}>{textoPdf(afirmacao.texto)}</Text>)}
            <AnalisesDaSecao secao="introducao" analises={[]} observacoes={observacoesDaIntroducao.map((item) => ({ ...item, secao: 'introducao' }))} />
          </View>
          <View>
            <Text style={styles.capaRotulo}>Fontes presentes neste documento</Text>
            <View style={styles.capaFontes}>{fontes.map((fonte) => <Text key={fonte.plataforma} style={[styles.chip, { borderColor: corDaPlataforma(fonte.plataforma) }]}>{textoPdf(fonte.rotulo)}</Text>)}</View>
          </View>
          <View style={styles.capaDocumento}>
            <Text>Documento fechado: versão {snapshotPublicado.publicacao.versao}</Text>
            <Text>Identificador: {textoPdf(snapshotPublicado.publicacao.checksum)}</Text>
          </View>
        </View>
      </Page>

      {gruposDeSecoes.map((grupo, indiceDoGrupo) => (
        <Page key={indiceDoGrupo} size="A4" orientation="landscape" style={styles.page} wrap>
          <CabecalhoERodape snapshot={snapshotPublicado} />
          {grupo.map((config) => {
            const indice = secoes.indexOf(config);
            return (
              <View
                key={config.id}
                style={styles.secao}
                minPresenceAhead={120}
                wrap={blocoPrecisaDePaginasProprias(config, snapshotPublicado)}
              >
                <View style={styles.secaoCabecalho} wrap={false}>
                  <View style={styles.secaoLinha}>
                    <Text style={styles.secaoIndice}>{String(indice + 1).padStart(2, '0')}</Text>
                    <Text style={styles.secaoTitulo}>{textoPdf(config.titulo)}</Text>
                  </View>
                  {config.apoio && <Text style={styles.secaoApoio}>{textoPdf(config.apoio)}</Text>}
                </View>
                {renderizarBlocoPdf(config, snapshotPublicado)}
                <AnalisesDaSecao secao={`bloco:${config.id}`} analises={analisesPublicadas} observacoes={observacoesPublicas} />
                {config.nota && <Text style={styles.nota}>{textoPdf(config.nota)}</Text>}
              </View>
            );
          })}
        </Page>
      ))}
    </Document>
  );
}
