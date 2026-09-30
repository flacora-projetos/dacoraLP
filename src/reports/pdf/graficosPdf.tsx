/**
 * Gráficos do PDF, desenhados em vetor pelo próprio motor do documento.
 *
 * ⚠️ POR QUE AQUI E NÃO O GRÁFICO DA PÁGINA: o gráfico da web é medido em
 * pixels de tela e não se remede na paginação — foi isso que fez a impressão
 * antiga sair com gráfico de 22px de largura (01/09/2026). Aqui a largura é
 * conhecida em pontos antes de desenhar, então o desenho é determinístico.
 *
 * Todo gráfico daqui mostra o NÚMERO junto do desenho (rótulo de valor na
 * barra, ou a tabela logo abaixo): o papel não tem passar o mouse.
 */
import { G, Line, Path, Rect, Svg, View, Text } from '@react-pdf/renderer';

import type { CoresDaMarca } from '../marcas';

export interface PontoBarra {
  rotulo: string;
  /** `null` = lacuna. Nunca vira zero. */
  valor: number | null;
  texto: string;
  destaque?: boolean;
}

/**
 * ⚠️ BARRAS FEITAS DE BLOCOS, NÃO DE VETOR (29/09/2026). Texto desenhado
 * dentro de `<Svg>` corrompe a medição do que vem depois dele na mesma
 * folha: a tabela logo abaixo do gráfico saiu com linhas de dez milhões de
 * pontos de altura e virou um retângulo verde cobrindo a folha. Aqui as barras
 * são `View` e os rótulos são `Text` comuns — o motor mede como mede o resto.
 */
export function GraficoBarras({ titulo, pontos, largura, altura = 120, cores, fonte }: {
  titulo: string;
  pontos: PontoBarra[];
  largura: number;
  altura?: number;
  cores: CoresDaMarca;
  fonte: string;
}) {
  const rotuloValor = 11;
  const rotuloEixo = 13;
  const util = altura - rotuloValor - rotuloEixo;
  const maximo = Math.max(0, ...pontos.map((p) => p.valor ?? 0));
  const passo = largura / Math.max(pontos.length, 1);
  const larguraBarra = Math.min(34, passo * 0.56);
  return (
    <View style={{ width: largura }}>
      <Text style={{ fontFamily: fonte, fontSize: 7.2, fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase', color: cores.cinza, marginBottom: 6 }}>
        {titulo}
      </Text>
      <View style={{ flexDirection: 'row', height: altura - rotuloEixo, alignItems: 'flex-end', borderBottomWidth: 0.8, borderBottomColor: cores.filete }}>
        {pontos.map((ponto, indice) => {
          const h = maximo > 0 && ponto.valor != null ? Math.max(1.5, (ponto.valor / maximo) * util) : 0;
          return (
            <View key={`${ponto.rotulo}-${indice}`} style={{ width: passo, alignItems: 'center', justifyContent: 'flex-end' }}>
              <Text style={{ fontFamily: fonte, fontSize: 6.2, fontWeight: ponto.destaque ? 700 : 500, color: ponto.destaque ? cores.tinta : cores.cinza, marginBottom: 2.5 }}>
                {ponto.texto}
              </Text>
              {ponto.valor == null
                ? <View style={{ width: larguraBarra, height: 5, backgroundColor: cores.filete }} />
                : <View style={{ width: larguraBarra, height: h, backgroundColor: ponto.destaque ? cores.destaque : cores.acento }} />}
            </View>
          );
        })}
      </View>
      <View style={{ flexDirection: 'row', height: rotuloEixo, alignItems: 'flex-end' }}>
        {pontos.map((ponto, indice) => (
          <Text key={`${ponto.rotulo}-${indice}`} style={{ width: passo, textAlign: 'center', fontFamily: fonte, fontSize: 6.5, fontWeight: ponto.destaque ? 700 : 400, color: ponto.destaque ? cores.tinta : cores.suave }}>
            {ponto.rotulo}
          </Text>
        ))}
      </View>
    </View>
  );
}

export function GraficoLinha({ titulo, pontos, largura, altura = 110, cores, fonte, cor }: {
  titulo: string;
  pontos: PontoBarra[];
  largura: number;
  altura?: number;
  cores: CoresDaMarca;
  fonte: string;
  cor: string;
}) {
  /* Só traço no vetor; todo texto fica fora do <Svg> (ver GraficoBarras). */
  const topo = 6;
  const esquerda = 4;
  const util = altura - topo;
  const maximo = Math.max(0, ...pontos.map((p) => p.valor ?? 0));
  const passo = (largura - esquerda * 2) / Math.max(pontos.length - 1, 1);
  const y = (valor: number) => topo + util - (maximo > 0 ? (valor / maximo) * util : 0);
  const x = (indice: number) => esquerda + passo * indice;

  /* Lacuna é lacuna: a linha é interrompida, nunca ligada por cima do buraco. */
  const trechos: Array<Array<{ x: number; y: number }>> = [];
  let atual: Array<{ x: number; y: number }> = [];
  pontos.forEach((ponto, indice) => {
    if (ponto.valor == null) {
      if (atual.length) trechos.push(atual);
      atual = [];
      return;
    }
    atual.push({ x: x(indice), y: y(ponto.valor) });
  });
  if (atual.length) trechos.push(atual);

  let indicePico = -1;
  pontos.forEach((ponto, indice) => {
    if (ponto.valor != null && (indicePico < 0 || ponto.valor > (pontos[indicePico].valor ?? 0))) indicePico = indice;
  });

  return (
    <View style={{ width: largura }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
        <Text style={{ fontFamily: fonte, fontSize: 7.2, fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase', color: cores.cinza }}>{titulo}</Text>
        {indicePico >= 0 && (
          <Text style={{ fontFamily: fonte, fontSize: 7, color: cores.tinta }}>
            Pico: <Text style={{ fontWeight: 700 }}>{pontos[indicePico].texto}</Text> em {pontos[indicePico].rotulo}
          </Text>
        )}
      </View>
      <Svg width={largura} height={altura}>
        <Line x1={0} y1={topo + util} x2={largura} y2={topo + util} stroke={cores.filete} strokeWidth={0.8} />
        <Line x1={0} y1={topo} x2={largura} y2={topo} stroke={cores.filete} strokeWidth={0.4} strokeDasharray="2 3" />
        {trechos.map((trecho, indice) => {
          const tracado = trecho.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ');
          const area = `${tracado} L${trecho[trecho.length - 1].x.toFixed(2)},${topo + util} L${trecho[0].x.toFixed(2)},${topo + util} Z`;
          return (
            <G key={indice}>
              <Path d={area} fill={cor} fillOpacity={0.12} />
              <Path d={tracado} stroke={cor} strokeWidth={1.6} fill="none" />
            </G>
          );
        })}
        {indicePico >= 0 && (
          <Rect x={x(indicePico) - 2.4} y={y(pontos[indicePico].valor!) - 2.4} width={4.8} height={4.8} fill={cor} />
        )}
      </Svg>
    </View>
  );
}

export function SetaVariacao({ subiu, cor }: { subiu: boolean; cor: string }) {
  return (
    <Svg width={6} height={6} style={{ marginRight: 3 }}>
      <Path d={subiu ? 'M3,0.5 L5.8,5.5 L0.2,5.5 Z' : 'M3,5.5 L5.8,0.5 L0.2,0.5 Z'} fill={cor} />
    </Svg>
  );
}

export function SetaFunil({ cor }: { cor: string }) {
  return (
    <Svg width={10} height={14}>
      <Path d="M1,1 L8,7 L1,13" stroke={cor} strokeWidth={1.4} fill="none" />
    </Svg>
  );
}

/** Anéis decorativos da capa Allgrotech, desenhados na geometria do símbolo da marca. */
export function AneisDecorativos({ tamanho, cor }: { tamanho: number; cor: string }) {
  const c = tamanho / 2;
  const arco = (r: number, de: number, ate: number) => {
    const p = (a: number) => [c + r * Math.cos((a * Math.PI) / 180), c + r * Math.sin((a * Math.PI) / 180)];
    const [x1, y1] = p(de);
    const [x2, y2] = p(ate);
    const grande = ate - de > 180 ? 1 : 0;
    return `M${x1.toFixed(1)},${y1.toFixed(1)} A${r},${r} 0 ${grande} 1 ${x2.toFixed(1)},${y2.toFixed(1)}`;
  };
  return (
    <Svg width={tamanho} height={tamanho}>
      <Path d={arco(c * 0.92, 200, 470)} stroke={cor} strokeWidth={10} fill="none" strokeOpacity={0.16} />
      <Path d={arco(c * 0.66, 20, 300)} stroke={cor} strokeWidth={8} fill="none" strokeOpacity={0.12} />
    </Svg>
  );
}
