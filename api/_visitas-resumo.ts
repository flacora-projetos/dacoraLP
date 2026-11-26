/**
 * Resumo das visitas — conta pura, sem rede, para a página de estatísticas.
 *
 * Definições (uma regra, um lugar):
 * - **Abertura** é cada registro gravado.
 * - **Visita** junta as aberturas da mesma pessoa na mesma área separadas por
 *   menos de 30 minutos (recarregar a página ou trocar de aba não vira visita nova).
 * - **Pessoa** é o e-mail quando se sabe; sem e-mail, o navegador (visitante).
 * - **Retenção semanal**: das pessoas que vieram na semana anterior, quantas
 *   voltaram nesta semana. Semana começa na segunda, no horário de São Paulo.
 * - No relatório do cliente, abertura da equipe é contada à parte e nunca entra
 *   em "o cliente abriu".
 */
export interface LinhaVisita {
  criado_em: string;
  area: string;
  caminho: string | null;
  email: string | null;
  equipe: boolean;
  visitante: string | null;
  relatorio: string | null;
}

export const INTERVALO_DA_VISITA_MS = 30 * 60 * 1000;
const DIA_MS = 86400000;

const diaSP = (d: Date) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);

/** Segunda-feira (AAAA-MM-DD) da semana do dia dado, em São Paulo. */
export function segundaDaSemana(d: Date): string {
  const dia = diaSP(d);
  const base = new Date(`${dia}T12:00:00Z`);
  const semana = (base.getUTCDay() + 6) % 7; // 0 = segunda
  return new Date(base.getTime() - semana * DIA_MS).toISOString().slice(0, 10);
}

export function pessoaDa(linha: LinhaVisita): string {
  if (linha.email) return linha.email;
  return linha.visitante ? `visitante:${linha.visitante.slice(0, 8)}` : 'visitante:desconhecido';
}

/** Junta aberturas em visitas (mesma pessoa, mesma área, menos de 30 min entre uma e outra). */
export function visitasDe(linhas: LinhaVisita[]): Array<LinhaVisita & { pessoa: string }> {
  const ordenadas = [...linhas].sort((a, b) => Date.parse(a.criado_em) - Date.parse(b.criado_em));
  const ultima = new Map<string, number>();
  const visitas: Array<LinhaVisita & { pessoa: string }> = [];
  for (const linha of ordenadas) {
    const pessoa = pessoaDa(linha);
    const chave = `${linha.area}|${linha.relatorio ?? ''}|${pessoa}`;
    const quando = Date.parse(linha.criado_em);
    const anterior = ultima.get(chave);
    if (anterior === undefined || quando - anterior >= INTERVALO_DA_VISITA_MS) visitas.push({ ...linha, pessoa });
    ultima.set(chave, quando);
  }
  return visitas;
}

export interface ResumoPessoa {
  pessoa: string;
  equipe: boolean;
  visitas30: number;
  diasAtivos30: number;
  semanasAtivas4: number;
  ultima: string;
}

export interface ResumoArea {
  area: string;
  visitas7: number;
  visitas30: number;
  pessoas7: number;
  pessoas30: number;
  retencao: { semanaAnterior: number; voltaram: number };
  semanas: Array<{ semana: string; pessoas: number; visitas: number }>;
  diario: Array<{ dia: string; visitas: number }>;
  pessoas: ResumoPessoa[];
}

export interface ResumoRelatorio {
  relatorio: string;
  aberturasCliente: number;
  visitantesCliente: number;
  primeiraCliente: string | null;
  ultimaCliente: string | null;
  aberturasEquipe: number;
}

export interface ResumoVisitas {
  geradoEm: string;
  areas: ResumoArea[];
  relatorios: ResumoRelatorio[];
}

export function resumirVisitas(linhas: LinhaVisita[], agora: Date): ResumoVisitas {
  const t = agora.getTime();
  const visitas = visitasDe(linhas);
  const semanaAtual = segundaDaSemana(agora);
  const semanaPassada = segundaDaSemana(new Date(t - 7 * DIA_MS));
  const ultimasSemanas = Array.from({ length: 8 }, (_, i) => segundaDaSemana(new Date(t - (7 - i) * 7 * DIA_MS)));
  const ultimos30Dias = Array.from({ length: 30 }, (_, i) => diaSP(new Date(t - (29 - i) * DIA_MS)));

  const areas: ResumoArea[] = [];
  const nomes = [...new Set(visitas.map((v) => v.area))].sort();
  for (const area of nomes) {
    // No relatório do cliente, as contas de uso olham só o cliente (sem a prévia da equipe).
    const daArea = visitas.filter((v) => v.area === area && !(area === 'relatorio-cliente' && v.equipe));
    const em = (dias: number) => daArea.filter((v) => t - Date.parse(v.criado_em) < dias * DIA_MS);
    const v7 = em(7);
    const v30 = em(30);
    const porSemana = new Map<string, Set<string>>();
    for (const v of daArea) {
      const s = segundaDaSemana(new Date(v.criado_em));
      if (!porSemana.has(s)) porSemana.set(s, new Set());
      porSemana.get(s)!.add(v.pessoa);
    }
    const antes = porSemana.get(semanaPassada) ?? new Set<string>();
    const agoraSet = porSemana.get(semanaAtual) ?? new Set<string>();

    const pessoas = new Map<string, ResumoPessoa & { dias: Set<string>; semanasSet: Set<string> }>();
    for (const v of daArea) {
      let p = pessoas.get(v.pessoa);
      if (!p) {
        p = { pessoa: v.pessoa, equipe: v.equipe, visitas30: 0, diasAtivos30: 0, semanasAtivas4: 0, ultima: v.criado_em, dias: new Set(), semanasSet: new Set() };
        pessoas.set(v.pessoa, p);
      }
      p.equipe ||= v.equipe;
      if (Date.parse(v.criado_em) > Date.parse(p.ultima)) p.ultima = v.criado_em;
      const quando = new Date(v.criado_em);
      if (t - quando.getTime() < 30 * DIA_MS) {
        p.visitas30 += 1;
        p.dias.add(diaSP(quando));
      }
      const s = segundaDaSemana(quando);
      if (ultimasSemanas.slice(-4).includes(s)) p.semanasSet.add(s);
    }

    areas.push({
      area,
      visitas7: v7.length,
      visitas30: v30.length,
      pessoas7: new Set(v7.map((v) => v.pessoa)).size,
      pessoas30: new Set(v30.map((v) => v.pessoa)).size,
      retencao: { semanaAnterior: antes.size, voltaram: [...antes].filter((p) => agoraSet.has(p)).length },
      semanas: ultimasSemanas.map((semana) => ({
        semana,
        pessoas: porSemana.get(semana)?.size ?? 0,
        visitas: daArea.filter((v) => segundaDaSemana(new Date(v.criado_em)) === semana).length,
      })),
      diario: ultimos30Dias.map((dia) => ({ dia, visitas: daArea.filter((v) => diaSP(new Date(v.criado_em)) === dia).length })),
      pessoas: [...pessoas.values()]
        .map(({ dias, semanasSet, ...p }) => ({ ...p, diasAtivos30: dias.size, semanasAtivas4: semanasSet.size }))
        .sort((a, b) => b.visitas30 - a.visitas30 || Date.parse(b.ultima) - Date.parse(a.ultima)),
    });
  }

  const relatorios = new Map<string, ResumoRelatorio & { visitantes: Set<string> }>();
  for (const linha of linhas) {
    if (linha.area !== 'relatorio-cliente' || !linha.relatorio) continue;
    let r = relatorios.get(linha.relatorio);
    if (!r) {
      r = { relatorio: linha.relatorio, aberturasCliente: 0, visitantesCliente: 0, primeiraCliente: null, ultimaCliente: null, aberturasEquipe: 0, visitantes: new Set() };
      relatorios.set(linha.relatorio, r);
    }
    if (linha.equipe) {
      r.aberturasEquipe += 1;
      continue;
    }
    r.aberturasCliente += 1;
    r.visitantes.add(pessoaDa(linha));
    if (!r.primeiraCliente || Date.parse(linha.criado_em) < Date.parse(r.primeiraCliente)) r.primeiraCliente = linha.criado_em;
    if (!r.ultimaCliente || Date.parse(linha.criado_em) > Date.parse(r.ultimaCliente)) r.ultimaCliente = linha.criado_em;
  }

  return {
    geradoEm: agora.toISOString(),
    areas,
    relatorios: [...relatorios.values()]
      .map(({ visitantes, ...r }) => ({ ...r, visitantesCliente: visitantes.size }))
      .sort((a, b) => b.relatorio.localeCompare(a.relatorio)),
  };
}
