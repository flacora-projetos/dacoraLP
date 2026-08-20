import type { Request, Response } from 'express';
import { conferirAcesso } from './_painel-autorizacao.js';
import { validarLinhaParaAnalise, type LinhaAnalise } from './_painel-analise-introducao.js';
import {
  ANALISES_SECAO_PROMPT_VERSAO,
  chamarAnalisesSecao,
  contextoParaAnalises,
  hashDoContextoAnalitico,
  lerPedidoAnaliseSecao,
} from './_painel-analises-secao.js';
import { espacosAnaliticosDoSnapshot } from '../src/reports/blocos/analise.js';
import { lerDispensasVigentes } from './_painel-estado-editorial.js';
import { registrarRevisaoViva, salvarContextoVivo } from './_painel-revisao-viva.js';

const COLUNAS = 'id,cliente_slug,competencia,versao,estado,checksum,checksum_factual_editorial,substituido_por,revogado_em,conteudo';
const FALHAS_DE_CONCORRENCIA = new Set(['checksum_divergente', 'versao_fora_de_revisao', 'sugestao_nao_encontrada']);

export const config = { maxDuration: 180 };

function configuracao() {
  const urlSupabase = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const chaveDeServico = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return urlSupabase && chaveDeServico ? { urlSupabase, chaveDeServico } : null;
}

function corpoDoPedido(req: Request): unknown {
  const bruto = (req as any).body;
  if (typeof bruto !== 'string') return bruto ?? null;
  try { return JSON.parse(bruto); } catch { return null; }
}

function headers(config: NonNullable<ReturnType<typeof configuracao>>) {
  return { apikey: config.chaveDeServico, Authorization: `Bearer ${config.chaveDeServico}` };
}

async function lerRelatorio(id: string, config: NonNullable<ReturnType<typeof configuracao>>) {
  const resposta = await fetch(`${config.urlSupabase}/rest/v1/relatorios?id=eq.${id}&select=${COLUNAS}&limit=1`, { headers: headers(config) });
  if (!resposta.ok) throw new Error(`leitura_relatorio_http_${resposta.status}`);
  return (await resposta.json() as LinhaAnalise[])[0];
}

async function lerContextoMes(id: string, checksum: string, config: NonNullable<ReturnType<typeof configuracao>>) {
  const url = `${config.urlSupabase}/rest/v1/relatorio_contextos_mes?relatorio_id=eq.${id}&relatorio_checksum=eq.${encodeURIComponent(checksum)}&select=contexto,atualizado_por,atualizado_em&limit=1`;
  const resposta = await fetch(url, { headers: headers(config) });
  if (!resposta.ok) throw new Error(`leitura_contexto_http_${resposta.status}`);
  return (await resposta.json() as any[])[0] ?? null;
}

function sugestaoDaLinha(linha: any, modeloGerado?: string | null) {
  return linha ? {
    id: linha.sugestao_id ?? linha.id,
    secao: linha.secao,
    estado: linha.estado,
    texto: linha.texto_atual,
    checksum: linha.relatorio_checksum,
    modelo: linha.modelo ?? modeloGerado ?? null,
  } : null;
}

async function lerSugestoes(id: string, checksum: string, config: NonNullable<ReturnType<typeof configuracao>>) {
  const url = `${config.urlSupabase}/rest/v1/relatorio_analise_sugestoes?relatorio_id=eq.${id}&relatorio_checksum=eq.${encodeURIComponent(checksum)}&secao=like.bloco:*&order=gerado_em.desc&select=id,secao,estado,texto_atual,relatorio_checksum,modelo`;
  const resposta = await fetch(url, { headers: headers(config) });
  if (!resposta.ok) throw new Error(`leitura_sugestoes_http_${resposta.status}`);
  const vistas = new Set<string>();
  return (await resposta.json() as any[]).filter((linha) => {
    if (vistas.has(linha.secao)) return false;
    vistas.add(linha.secao);
    return true;
  }).map((linha: any) => sugestaoDaLinha(linha));
}

async function falhaDaRpc(rpc: globalThis.Response) {
  const bruto = await rpc.text();
  try {
    const corpo = JSON.parse(bruto);
    const mensagem = typeof corpo?.message === 'string' ? corpo.message : '';
    if (FALHAS_DE_CONCORRENCIA.has(mensagem)) {
      return { status: 409, erro: 'revisao_desatualizada', mensagem: 'A revisão mudou antes de registrar esta ação. Reabra o relatório.' };
    }
    console.error(`[painel-analises-secao] rpc_http_${rpc.status} code=${corpo?.code ?? 'desconhecido'}`);
  } catch {
    console.error(`[painel-analises-secao] rpc_http_${rpc.status} corpo_invalido`);
  }
  return { status: 502, erro: 'auditoria_falhou', mensagem: 'Não foi possível registrar a ação editorial. Nenhuma alteração foi salva; tente novamente.' };
}

export default async function handler(req: Request, res: Response) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  if (req.method !== 'GET' && req.method !== 'POST') return res.status(405).json({ erro: 'metodo_nao_permitido' });
  const acesso = await conferirAcesso(req.headers.authorization);
  if (acesso.ok === false) return res.status(acesso.status).json(acesso.corpo);
  const config = configuracao();
  if (!config) return res.status(500).json({ erro: 'sem_chave_de_servico', mensagem: 'O servidor não consegue revisar as análises agora.' });

  const bruto = req.method === 'GET'
    ? { id: req.query?.id, checksum: req.query?.checksum, acao: 'gerar_todas' }
    : corpoDoPedido(req);
  const leitura = lerPedidoAnaliseSecao(bruto);
  if (leitura.ok === false) return res.status(400).json({ erro: leitura.erro, mensagem: leitura.mensagem });
  const pedido = leitura.pedido;

  try {
    const relatorio = await lerRelatorio(pedido.id, config);
    const linhaValida = validarLinhaParaAnalise(relatorio, pedido.checksum);
    if (!linhaValida.ok) return res.status(linhaValida.status).json(linhaValida);
    const espacos = espacosAnaliticosDoSnapshot(relatorio.conteudo);
    if (pedido.acao === 'registrar_observacao_publica') {
      const secoesCanonicas = new Set([
        'relatorio_inteiro',
        'introducao',
        ...(Array.isArray(relatorio.conteudo?.montagem) ? relatorio.conteudo.montagem.map((bloco: any) => `bloco:${bloco?.id}`) : []),
      ]);
      if (!pedido.secao || !secoesCanonicas.has(pedido.secao)) {
        return res.status(422).json({ erro: 'secao_invalida', mensagem: 'A seção escolhida não pertence a esta versão do relatório.' });
      }
      const rpc = await fetch(`${config.urlSupabase}/rest/v1/rpc/registrar_observacao_publica`, {
        method: 'POST',
        headers: { ...headers(config), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          p_relatorio_id: pedido.id,
          p_checksum_visto: pedido.checksum,
          p_secao: pedido.secao,
          p_texto: pedido.texto ?? '',
          p_por: acesso.email,
        }),
      });
      if (!rpc.ok) {
        const falha = await falhaDaRpc(rpc);
        return res.status(falha.status).json({ erro: falha.erro, mensagem: falha.mensagem });
      }
      const [observacao] = await rpc.json();
      if (!observacao || observacao.secao_registrada !== pedido.secao) {
        return res.status(409).json({ erro: 'observacao_nao_confirmada', mensagem: 'A observação não voltou confirmada. Reabra a revisão antes de tentar de novo.' });
      }
      console.log(`[painel-analises-secao] observacao_publica · ${pedido.id} · ${pedido.secao} · por ${acesso.email}`);
      return res.status(200).json({ observacaoPublica: { secao: observacao.secao_registrada, texto: observacao.texto_registrado ?? null, ativa: observacao.ativa === true } });
    }
    const dispensavel = pedido.acao === 'dispensar' || pedido.acao === 'reverter_dispensa';
    const espaco = pedido.secao ? espacos.find((item) => item.secao === pedido.secao) : null;
    /* A dispensa vale para toda seção obrigatória, e a introdução é obrigatória
       sem ser um bloco analítico — ela não aparece em `espacos`. */
    const secaoObrigatoria = pedido.secao === 'introducao' || Boolean(espaco);
    if (pedido.secao && !espaco && !(dispensavel && secaoObrigatoria)) {
      return res.status(422).json({ erro: 'secao_sem_funcao_analitica', mensagem: 'Este bloco não tem função analítica cadastrada.' });
    }

    if (req.method === 'GET') {
      const [contexto, sugestoes, dispensas] = await Promise.all([
        lerContextoMes(pedido.id, pedido.checksum, config),
        lerSugestoes(pedido.id, pedido.checksum, config),
        lerDispensasVigentes(pedido.id, pedido.checksum, config),
      ]);
      return res.status(200).json({
        contexto: contexto ? { texto: contexto.contexto, atualizadoPor: contexto.atualizado_por, atualizadoEm: contexto.atualizado_em } : null,
        sugestoes,
        dispensas,
        espacos: espacos.map(({ secao, blocoId, titulo, objetivo }) => ({ secao, blocoId, titulo, objetivo })),
      });
    }

    if (dispensavel) {
      const rpc = await fetch(`${config.urlSupabase}/rest/v1/rpc/registrar_dispensa_secao`, {
        method: 'POST',
        headers: { ...headers(config), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          p_relatorio_id: pedido.id,
          p_checksum_visto: pedido.checksum,
          p_secao: pedido.secao,
          p_por: acesso.email,
          p_dispensar: pedido.acao === 'dispensar',
        }),
      });
      if (!rpc.ok) {
        const falha = await falhaDaRpc(rpc);
        return res.status(falha.status).json({ erro: falha.erro, mensagem: falha.mensagem });
      }
      const [decidida] = await rpc.json();
      if (!decidida || decidida.secao_decidida !== pedido.secao) {
        return res.status(409).json({
          erro: 'revisao_desatualizada',
          mensagem: 'A revisão mudou antes de registrar esta decisão. Reabra o relatório.',
        });
      }
      /* "Revisada sem análise" é decisão editorial e vira revisão durável.
         `reverter_dispensa` NÃO escreve no modelo AV: a RPC só sabe registrar
         uma decisão nova, e não existe "estado anterior" para restaurar sem
         inventar informação. Quem cobre isso é a prontidão, que deixa o legado
         derrubar a revisão AV quando ele tem decisão explícita em contrário. */
      const registro = pedido.acao === 'dispensar' && decidida.dispensa_ativa === true
        ? await registrarRevisaoViva({
            relatorioId: pedido.id,
            checksumDocumento: pedido.checksum,
            checksumFactual: relatorio.checksum_factual_editorial ?? null,
            secao: pedido.secao!,
            tipoDecisao: 'sem_analise',
            texto: null,
            por: acesso.email,
          }, config)
        : null;
      console.log(`[painel-analises-secao] ${pedido.acao} · ${pedido.id} · ${pedido.secao} · por ${acesso.email}${registro ? ` · av=${registro}` : ''}`);
      return res.status(200).json({
        dispensa: {
          secao: decidida.secao_decidida,
          ativa: decidida.dispensa_ativa === true,
          por: decidida.decidida_por ?? null,
          em: decidida.decidida_em ?? null,
        },
      });
    }

    if (pedido.acao === 'salvar_contexto') {
      const rpc = await fetch(`${config.urlSupabase}/rest/v1/rpc/salvar_contexto_mes_relatorio`, {
        method: 'POST',
        headers: { ...headers(config), 'Content-Type': 'application/json' },
        body: JSON.stringify({ p_relatorio_id: pedido.id, p_checksum_visto: pedido.checksum, p_contexto: pedido.contexto ?? '', p_por: acesso.email }),
      });
      if (!rpc.ok) {
        const falha = await falhaDaRpc(rpc);
        return res.status(falha.status).json({ erro: falha.erro, mensagem: falha.mensagem });
      }
      const [salvo] = await rpc.json();
      const registro = salvo
        ? await salvarContextoVivo({
            relatorioId: pedido.id,
            checksumDocumento: pedido.checksum,
            checksumFactual: relatorio.checksum_factual_editorial ?? null,
            contexto: typeof salvo.contexto === 'string' ? salvo.contexto : (pedido.contexto ?? ''),
            por: acesso.email,
          }, config)
        : null;
      console.log(`[painel-analises-secao] salvar_contexto · ${pedido.id} · por ${acesso.email}${registro ? ` · av=${registro}` : ''}`);
      return res.status(200).json({ contexto: salvo ? { texto: salvo.contexto, atualizadoPor: salvo.atualizado_por, atualizadoEm: salvo.atualizado_em } : null });
    }

    let analises: Array<{ secao: string; texto: string }> | null = null;
    let modelo: string | null = null;
    let contextoAnalitico: ReturnType<typeof contextoParaAnalises> = null;
    if (pedido.acao === 'gerar_todas' || pedido.acao === 'gerar_secao') {
      const contextoMes = await lerContextoMes(pedido.id, pedido.checksum, config);
      contextoAnalitico = contextoParaAnalises(relatorio, contextoMes?.contexto ?? '', pedido.acao === 'gerar_secao' ? pedido.secao : undefined);
      if (!contextoAnalitico) return res.status(422).json({ erro: 'contexto_indisponivel', mensagem: 'Esta versão não tem espaços analíticos com dados disponíveis.' });
      const respostaModelo = await chamarAnalisesSecao(contextoAnalitico, pedido.modo);
      if (respostaModelo.ok === false) return res.status(respostaModelo.status).json({ erro: respostaModelo.erro, mensagem: respostaModelo.mensagem });
      modelo = respostaModelo.modelo;
      analises = respostaModelo.analises;
    }

    const rpc = await fetch(`${config.urlSupabase}/rest/v1/rpc/registrar_sugestoes_analise_secoes`, {
      method: 'POST',
      headers: { ...headers(config), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        p_relatorio_id: pedido.id,
        p_checksum_visto: pedido.checksum,
        p_acao: pedido.acao === 'gerar_todas' || pedido.acao === 'gerar_secao' ? 'gerar' : pedido.acao,
        p_por: acesso.email,
        p_secao: pedido.secao ?? null,
        p_modelo: modelo,
        p_prompt_versao: analises ? ANALISES_SECAO_PROMPT_VERSAO : null,
        p_contexto_hash: contextoAnalitico ? hashDoContextoAnalitico(contextoAnalitico) : null,
        p_analises: analises?.map((analise) => ({
          secao: analise.secao,
          textoOriginal: JSON.stringify(espacos.find((item) => item.secao === analise.secao)?.fonte ?? {}),
          textoSugerido: analise.texto,
        })) ?? null,
        p_sugestao_id: pedido.sugestaoId ?? null,
        p_texto_editado: pedido.acao === 'editar' ? pedido.texto : null,
      }),
    });
    if (!rpc.ok) {
      const falha = await falhaDaRpc(rpc);
      return res.status(falha.status).json({ erro: falha.erro, mensagem: falha.mensagem });
    }
    const resultado = await rpc.json();
    if (!Array.isArray(resultado) || resultado.length === 0) return res.status(409).json({ erro: 'revisao_desatualizada', mensagem: 'A revisão mudou antes de registrar esta ação. Reabra o relatório.' });
    const sugestoes = resultado.map((linha: any) => sugestaoDaLinha(linha, modelo));
    /* Aplicar e editar são as duas decisões que publicam texto. `gerar` é
       proposta do modelo, não decisão, e `desfazer` derruba a decisão sem ter
       o que colocar no lugar — nenhum dos dois vira revisão durável. O texto
       registrado é o que a RPC devolveu, não o que a tela mandou: vale o que
       ficou gravado. */
    const decidida = (pedido.acao === 'aplicar' || pedido.acao === 'editar')
      ? sugestoes.find((item: any) => item?.secao === pedido.secao)
      : null;
    const registro = decidida && (decidida.estado === 'aplicada' || decidida.estado === 'editada') && decidida.texto
      ? await registrarRevisaoViva({
          relatorioId: pedido.id,
          checksumDocumento: pedido.checksum,
          checksumFactual: relatorio.checksum_factual_editorial ?? null,
          secao: decidida.secao,
          tipoDecisao: 'analise',
          texto: decidida.texto,
          por: acesso.email,
          origemSugestaoId: decidida.id ?? pedido.sugestaoId ?? null,
        }, config)
      : null;
    console.log(`[painel-analises-secao] ${pedido.acao} · ${pedido.id} · ${sugestoes.length} seção(ões) · por ${acesso.email}${registro ? ` · av=${registro}` : ''}`);
    return res.status(200).json({ sugestoes, sugestao: sugestoes.length === 1 ? sugestoes[0] : undefined });
  } catch (erro) {
    console.error('[painel-analises-secao] falha:', erro instanceof Error ? erro.message : erro);
    return res.status(502).json({ erro: 'analises_indisponiveis', mensagem: 'Não foi possível concluir as análises agora. O relatório permanece preservado.' });
  }
}
