/**
 * `GET /api/painel-fila?competencia=AAAA-MM` — a fila do mês.
 *
 * Só leitura. Não aprova, não recusa, não envia: isso é a P3 e a P5, e o
 * caminho para lá passa por ter o relatório na tela (§5.2 do handoff).
 *
 * ---------------------------------------------------------------------------
 * POR QUE ISTO É UMA FUNÇÃO DE SERVIDOR, E NÃO UMA CONSULTA DO NAVEGADOR
 *
 * A tabela `public.relatorios` tem a RLS **ligada e sem nenhuma política, de
 * propósito**: o relatório do cliente não tem login, então a chave pública do
 * Supabase está no navegador de qualquer visitante. Sem política, essa chave lê
 * ZERO, e a única porta é esta função, com a chave de serviço, depois de
 * conferir quem está do outro lado.
 *
 * **Criar política de leitura pública nessa tabela para "o painel funcionar"
 * entrega o relatório de um cliente para outro.** Não é pendência do linter do
 * Supabase, é o desenho.
 * ---------------------------------------------------------------------------
 *
 * Duas disciplinas que valem para todo endpoint que vier depois:
 *
 *  • **confere sessão e e-mail por conta própria**, sem confiar em ter sido
 *    chamado pela tela certa — a tela esconder um botão é conforto;
 *  • **nunca seleciona a coluna `token`.** Ela é a credencial de acesso do
 *    relatório do cliente. A fila não precisa dela para nada, e o que não sai
 *    daqui não vaza em log, em cache nem em aba aberta por engano.
 */
import type { Request, Response } from 'express';
// A extensão `.js` é OBRIGATÓRIA nos imports relativos de `api/` — a Vercel
// compila cada arquivo para um módulo ESM separado e o Node não completa
// extensão sozinho. Sem ela, todo pedido responde 500 só depois de publicado.
import { conferirAcesso } from './_painel-autorizacao.js';
import { montarFila, type LinhaDoBanco } from './_painel-fila-dados.js';
import {
  montarVisaoGeral,
  MESES_NO_COMPARATIVO_DO_PRAZO,
  type EnvioDoMes,
  type LinhaDoPrazo,
  type OrdemDoMes,
} from './_painel-visao-geral-dados.js';
import { montarEstadoSeguroDoEnvio, type LinhaDoPortalP5 } from './_painel-envio-regras.js';

/** As colunas que a fila lê. `token` e `conteudo` completo à parte — ver abaixo. */
const COLUNAS = [
  'id',
  'cliente_slug',
  'competencia',
  'versao',
  'estado',
  'gerado_em',
  'checksum',
  'aprovado_por',
  'aprovado_em',
  // As três colunas do "não", criadas pela migração da P3. Sem elas a fila
  // mostraria um relatório recusado como "estado desconhecido", que é pior que
  // não ter o estado: parece defeito.
  'recusado_por',
  'recusado_em',
  'recusa_motivo',
  'correcao_ordem_id',
  'correcao_estado',
  'correcao_solicitado_em',
  'correcao_iniciado_em',
  'correcao_erro_codigo',
  'correcao_nova_versao_relatorio_id',
  'correcao_nova_versao',
  'correcao_eh_nova_versao',
  'notificacao_interna_id',
  'notificacao_interna_estado',
  'notificacao_destino_referencia',
  'enviado_em',
  'enviado_para',
  'substituido_por',
  // Arquivado = revogado com autor e motivo (migration 20261008120000, no
  // OpenClaw-Dacora). ⚠️ As duas últimas só existem DEPOIS dessa migration: o
  // portal com esta linha não pode ir ao ar antes dela.
  'revogado_em',
  'revogado_por',
  'revogado_motivo',
  /**
   * O `conteudo` inteiro vem junto, e o servidor extrai dele os poucos números
   * da linha. Dá para pedir só os pedaços (`conteudo->dados->faixas`), e um dia
   * vai valer a pena: são ~50 KB por relatório, ~2 MB para a carteira inteira.
   *
   * Hoje não vale, e o motivo é honesto: **não deu para exercitar nenhuma
   * chamada real contra a API** — a chave de serviço não existe ainda. Entre um
   * caminho simples que quase certamente funciona e um caminho mais fino que
   * ninguém pôde testar, num endpoint que é a primeira coisa que o Flávio vai
   * abrir, o simples ganha. O tráfego é entre a Vercel e o Supabase, uma vez por
   * mês; o navegador recebe só o resumo pequeno.
   */
  'conteudo',
].join(',');

const COMPETENCIA_VALIDA = /^\d{4}-(0[1-9]|1[0-2])$/;

/** O mês de hoje no fuso da operação, `AAAA-MM`. */
export function mesCorrenteEmSaoPaulo(agora: Date = new Date()): string {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(agora);
  const ano = partes.find((p) => p.type === 'year')?.value;
  const mes = partes.find((p) => p.type === 'month')?.value;
  return `${ano}-${mes}`;
}

/**
 * Qual mês o painel abre quando ninguém pediu um.
 *
 * O ÚLTIMO MÊS FECHADO, não o mais recente. A cadência das 07h gera o mês em
 * andamento todo dia, então "o mais recente" é sempre um mês que ninguém
 * revisa ainda — e o painel abria em outubro dizendo "32 esperando revisão" e
 * "0 liberados", duas pendências que não existem. Quem abre o painel quer o
 * mês que está sendo revisado e enviado. (Pedido do PO, 08/10/2026.)
 *
 * Sem nenhum mês fechado no banco, cai no mais recente — é melhor mostrar o
 * mês em andamento do que uma tela vazia.
 */
export function competenciaPadrao(competencias: string[], mesCorrente: string): string | null {
  const ordenadas = [...competencias].sort((a, b) => b.localeCompare(a));
  return ordenadas.find((mes) => mes < mesCorrente) ?? ordenadas[0] ?? null;
}

/**
 * Se a fila deve oferecer o botão de voltar para edição.
 *
 * ⚠️ REABRIR A EDIÇÃO FICOU MAIS CARO DO QUE ERA, e é por isso que ele some
 * quando a competência já foi entregue.
 *
 * Antes da frente LV o link entregue estava preso à versão enviada, então mexer
 * numa versão liberada não alcançava ninguém. Desde 08/09 o link abre a versão
 * CORRENTE — reabrir a edição de um documento já entregue muda, na hora, o que
 * o cliente vê no link que já tem, sem aviso para ele nem para quem clicou.
 *
 * Função pura e exportada só para poder ser provada: o caminho que a produz
 * dentro do handler depende de duas leituras ao banco, e a regressão que a
 * cobria antes montava o item da fila à mão — a mutação mostrou que esta linha
 * podia ser desfeita sem nada reprovar.
 */
export function podeVoltarEdicao(
  estado: string,
  enviadoEm: string | null | undefined,
  acao: { envioId: string | null; entreguePeloLinkAnterior: boolean } | undefined,
): boolean {
  const liberadoSemEnvio = estado === 'liberado' && !enviadoEm && Boolean(acao) && !acao?.envioId;
  return liberadoSemEnvio && acao?.entreguePeloLinkAnterior !== true;
}

export default async function handler(req: Request, res: Response) {
  // Dado de cliente nunca fica em cache intermediário.
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');

  if (req.method !== 'GET') {
    return res.status(405).json({ erro: 'metodo_nao_permitido' });
  }

  const acesso = await conferirAcesso(req.headers['authorization']);
  if (acesso.ok === false) {
    // A resposta de recusa sai ANTES de qualquer leitura do banco: quem não
    // passou daqui não chega perto de dado de cliente nenhum.
    return res.status(acesso.status).json(acesso.corpo);
  }

  const urlSupabase = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const chaveDeServico = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!urlSupabase || !chaveDeServico) {
    // Nunca cair para a chave pública aqui. Ela lê zero por desenho, e a fila
    // apareceria VAZIA em vez de quebrada — o pior dos dois mundos, porque
    // "não tem relatório nenhum" é uma resposta plausível e ninguém iria
    // procurar defeito.
    console.error('[painel-fila] Falta SUPABASE_SERVICE_ROLE_KEY (ou a URL) no ambiente.');
    return res.status(500).json({
      erro: 'sem_chave_de_servico',
      mensagem:
        'O painel ainda não tem a chave de serviço do banco cadastrada no servidor, ' +
        'e sem ela não há como ler os relatórios.',
    });
  }

  const cabecalhos = {
    apikey: chaveDeServico,
    Authorization: `Bearer ${chaveDeServico}`,
  };

  try {
    /* Que meses existem. ---------------------------------------------------- */
    const respostaMeses = await fetch(
      `${urlSupabase}/rest/v1/relatorios?select=competencia&order=competencia.desc`,
      { headers: cabecalhos },
    );
    if (!respostaMeses.ok) {
      throw new Error(`meses: HTTP ${respostaMeses.status} — ${await respostaMeses.text()}`);
    }
    const competencias = [
      ...new Set(((await respostaMeses.json()) as { competencia: string }[]).map((l) => l.competencia)),
    ].sort((a, b) => b.localeCompare(a));

    /* Qual mês mostrar. ----------------------------------------------------- */
    const pedida = typeof req.query?.competencia === 'string' ? req.query.competencia : '';
    if (pedida && !COMPETENCIA_VALIDA.test(pedida)) {
      // Além de ser resposta honesta, isto impede que texto arbitrário entre na
      // consulta ao banco pela query string.
      return res.status(400).json({
        erro: 'competencia_invalida',
        mensagem: 'A competência precisa estar no formato AAAA-MM.',
      });
    }
    const competencia = pedida || competenciaPadrao(competencias, mesCorrenteEmSaoPaulo());

    if (!competencia) {
      return res.status(200).json({ competencia: null, competencias: [], itens: [] });
    }

    /* A fila. --------------------------------------------------------------- */
    const respostaLinhas = await fetch(
      `${urlSupabase}/rest/v1/painel_relatorios_com_correcao?competencia=eq.${competencia}&select=${COLUNAS}&order=cliente_slug.asc,versao.desc`,
      { headers: cabecalhos },
    );
    if (!respostaLinhas.ok) {
      throw new Error(`fila: HTTP ${respostaLinhas.status} — ${await respostaLinhas.text()}`);
    }

    const linhas = (await respostaLinhas.json()) as LinhaDoBanco[];
    let acoesPorRelatorio = new Map<string, {
      destinatarioNome: string | null;
      podeSolicitarEnvio: boolean;
      entreguePeloLinkAnterior: boolean;
      indisponibilidade: string | null;
      envioId: string | null;
      envioEstado: string | null;
    }>();
    try {
      /**
       * ⚠️ `indisponibilidade` NÃO É COLUNA DA VIEW — ela é CALCULADA por
       * `montarEstadoSeguroDoEnvio`, a partir de destino, aprovação e intenção.
       *
       * Pedi-la no `select` fazia o PostgREST responder HTTP 400
       * (`column relatorio_p5_portal.indisponibilidade does not exist`), a
       * resposta caía no `catch` abaixo, o mapa de ações ficava VAZIO e a fila
       * perdia os dois botões do estado aprovado — "Enviar" e "Voltar para
       * edição" — sem nada aparecer para quem estava usando: o erro virava um
       * `console.warn` no servidor. A tela do relatório continuava funcionando
       * porque ela sempre passou por esta mesma regra, e não pela view crua.
       * Introduzido em `f96a085` e medido em 2026-09-03.
       *
       * Por isso a fila agora consome a MESMA função da tela de detalhe: as
       * duas concordam por construção, em vez de por coincidência.
       */
      const respostaAcoes = await fetch(
        `${urlSupabase}/rest/v1/relatorio_p5_portal?competencia=eq.${competencia}&select=*`,
        { headers: cabecalhos },
      );
      if (respostaAcoes.ok) {
        const linhasAcoes = await respostaAcoes.json() as LinhaDoPortalP5[];
        acoesPorRelatorio = new Map(linhasAcoes.flatMap((linha) => {
          const montagem = montarEstadoSeguroDoEnvio(linha);
          // Linha que a regra recusa fica DE FORA do mapa: a fila prefere não
          // oferecer ação a oferecer uma ação que a regra considera insegura.
          if (!montagem.ok) return [];
          return [[montagem.estado.relatorioId, {
            destinatarioNome: montagem.estado.destinatarioNome,
            podeSolicitarEnvio: montagem.estado.podeSolicitarEnvio,
            entreguePeloLinkAnterior: montagem.estado.entreguePeloLinkAnterior,
            indisponibilidade: montagem.estado.indisponibilidade,
            envioId: montagem.estado.envio ? String(linha.envio_id ?? '') || null : null,
            envioEstado: montagem.estado.envio?.estado ?? null,
          }] as const];
        }));
      } else {
        console.warn(`[painel-fila] Estado P5 indisponível para ações: HTTP ${respostaAcoes.status}.`);
      }
    } catch (erroAcoes) {
      console.warn('[painel-fila] Estado P5 indisponível para ações:', erroAcoes instanceof Error ? erroAcoes.message : erroAcoes);
    }
    const itensDaFila = montarFila(linhas).map((item) => {
      if (item.estado === 'arquivado') {
        // Arquivado não oferece ação nenhuma, nem o aviso de "envio
        // indisponível": a visão do envio não traz documento revogado, e o
        // aviso genérico pareceria defeito onde há uma decisão.
        return {
          ...item,
          podeVoltarEdicao: false,
          podeSolicitarEnvio: false,
          destinatarioNome: null,
          envioIndisponibilidade: null,
          envioEstado: null,
        };
      }
      const acao = acoesPorRelatorio.get(item.id);
      return {
        ...item,
        podeVoltarEdicao: podeVoltarEdicao(item.estado, item.enviadoEm, acao),
        podeSolicitarEnvio: acao?.podeSolicitarEnvio === true,
        destinatarioNome: acao?.destinatarioNome ?? null,
        /* `??` aqui era errado: com a ação presente e SEM indisponibilidade —
           que é o caso bom — ele caía no fallback e escrevia "Envio
           indisponível" ao lado de um botão que funciona. O fallback só vale
           quando a P5 nao respondeu, ou seja, quando `acao` nao existe. */
        envioIndisponibilidade: acao
          ? acao.indisponibilidade
          : (item.estado === 'liberado' ? 'p5_indisponivel' : null),
        envioEstado: acao?.envioEstado ?? null,
      };
    });

    /* As leituras que alimentam só a visão geral: recusas, envios e o prazo dos
     * meses anteriores. Cada uma falha SOZINHA e vira `null` — a tela escreve
     * "não deu para ler" em vez de zero, e a fila continua de pé. */
    const lerOuNulo = async <T,>(caminho: string, rotulo: string): Promise<T | null> => {
      try {
        const resposta = await fetch(`${urlSupabase}/rest/v1/${caminho}`, { headers: cabecalhos });
        if (!resposta.ok) {
          console.warn(`[painel-fila] ${rotulo} indisponível: HTTP ${resposta.status}.`);
          return null;
        }
        return (await resposta.json()) as T;
      } catch (erroLeitura) {
        console.warn(`[painel-fila] ${rotulo} indisponível:`, erroLeitura instanceof Error ? erroLeitura.message : erroLeitura);
        return null;
      }
    };

    const anteriores = competencias.filter((mes) => mes < competencia).slice(0, MESES_NO_COMPARATIVO_DO_PRAZO);
    const [ordensCruas, causasCruas, envios, prazoDeOutrosMeses] = await Promise.all([
      lerOuNulo<Array<Omit<OrdemDoMes, 'causas'>>>(
        `relatorio_ordens_correcao?competencia=eq.${competencia}` +
          '&select=id,cliente_slug,relatorio_versao,estado,catalog_version,solicitado_em,fechada_manualmente_em,falha_automatica_codigo',
        'Recusas',
      ),
      lerOuNulo<Array<{ ordem_correcao_id: string; ordinal: number; cause_id: string; catalog_version: string | null; parameters: any }>>(
        // As causas não têm competência; o filtro é pela ordem, via a relação.
        `relatorio_ordem_causas?select=ordem_correcao_id,ordinal,cause_id,catalog_version,parameters,relatorio_ordens_correcao!inner(competencia)` +
          `&relatorio_ordens_correcao.competencia=eq.${competencia}`,
        'Causas das recusas',
      ),
      lerOuNulo<EnvioDoMes[]>(`relatorio_envios?competencia=eq.${competencia}&select=relatorio_id,estado`, 'Envios'),
      anteriores.length === 0
        ? Promise.resolve([] as LinhaDoPrazo[])
        : lerOuNulo<LinhaDoPrazo[]>(
            `relatorios?competencia=in.(${anteriores.join(',')})&select=cliente_slug,competencia,versao,aprovado_em,revogado_em`,
            'Prazo dos meses anteriores',
          ),
    ]);
    const ordens: OrdemDoMes[] | null =
      ordensCruas && causasCruas
        ? ordensCruas.map((ordem) => ({
            ...ordem,
            causas: causasCruas
              .filter((causa) => causa.ordem_correcao_id === ordem.id)
              .sort((a, b) => a.ordinal - b.ordinal)
              .map(({ cause_id, catalog_version, parameters }) => ({ cause_id, catalog_version, parameters })),
          }))
        : null;

    /* A visão geral sai da MESMA leitura, de propósito.
     *
     * Um endpoint separado significaria uma segunda consulta de ~2 MB ao
     * Supabase, uma segunda porta de autorização para manter em dia e — o pior
     * — dois retratos tirados em momentos diferentes. Uma carga entrando entre
     * as duas chamadas faria o resumo dizer 34 e a fila mostrar 35, sem nada
     * parecer errado em lugar nenhum.
     *
     * As linhas COMPLETAS vão para a visão geral, não só as correntes: o
     * retrabalho é justamente o que a fila descarta.
     */
    return res.status(200).json({
      competencia,
      competencias,
      itens: itensDaFila,
      visaoGeral: montarVisaoGeral(linhas, competencia, new Date().toISOString(), {
        ordens,
        envios,
        prazoDeOutrosMeses,
      }),
    });
  } catch (err) {
    console.error('[painel-fila] Falha ao ler os relatórios:', err instanceof Error ? err.message : err);
    return res.status(502).json({
      erro: 'leitura_indisponivel',
      mensagem: 'Não foi possível ler os relatórios agora. Tente de novo em instantes.',
    });
  }
}
