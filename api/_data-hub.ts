import type { Request, Response } from 'express';
import {
  configuracaoDataHub,
  executarRequisicaoDataHub,
  type RequisicaoDataHub,
} from './_data-hub-spike.js';

type Operacao = 'catalog' | 'list' | 'create' | 'get' | 'update' | 'delete' | 'run' | 'google-status' | 'google-connect' | 'google-callback' | 'google-disconnect' | 'google-spreadsheet-create' | 'google-spreadsheet-resolve' | 'google-picker-session';

function jsonBody(req: Request): unknown {
  return req.body == null ? {} : req.body;
}

function caminho(req: Request): string {
  const url = typeof req.url === 'string' ? req.url.split('?')[0] : '';
  const fromQuery = typeof req.query?.path === 'string' ? req.query.path : '';
  const value = fromQuery || url;
  return value.replace(/^\/api\/data-hub/, '').replace(/\/+$/, '') || '/';
}

function resolver(req: Request): { request: RequisicaoDataHub; operation: Operacao } | { error: string } {
  const path = caminho(req);
  const method = req.method;
  const config = configuracaoDataHub();
  const base = `${config.cloudRunAudience}/internal/v1/portal`;
  if (path === '/catalog' && method === 'GET') {
    return { operation: 'catalog', request: { endpoint: `${base}/catalog`, method: 'GET' } };
  }
  if (path === '/extractions' && method === 'GET') {
    return { operation: 'list', request: { endpoint: `${base}/extractions`, method: 'GET' } };
  }
  if (path === '/extractions' && method === 'POST') {
    return { operation: 'create', request: { endpoint: `${base}/extractions`, method: 'POST', body: jsonBody(req) } };
  }
  if (path === '/google/status' && method === 'GET') {
    return { operation: 'google-status', request: { endpoint: `${base}/google/status`, method: 'GET' } };
  }
  if (path === '/google/connect' && method === 'POST') {
    return { operation: 'google-connect', request: { endpoint: `${base}/google/connect`, method: 'POST', body: {} } };
  }
  if (path === '/google/callback' && method === 'POST') {
    return { operation: 'google-callback', request: { endpoint: `${base}/google/callback`, method: 'POST', body: jsonBody(req) } };
  }
  if (path === '/google/disconnect' && method === 'POST') {
    return { operation: 'google-disconnect', request: { endpoint: `${base}/google/disconnect`, method: 'POST', body: {} } };
  }
  if (path === '/google/spreadsheets' && method === 'POST') {
    return { operation: 'google-spreadsheet-create', request: { endpoint: `${base}/google/spreadsheets`, method: 'POST', body: jsonBody(req) } };
  }
  if (path === '/google/spreadsheets/resolve' && method === 'POST') {
    return { operation: 'google-spreadsheet-resolve', request: { endpoint: `${base}/google/spreadsheets/resolve`, method: 'POST', body: jsonBody(req) } };
  }
  if (path === '/google/picker/session' && method === 'POST') {
    return { operation: 'google-picker-session', request: { endpoint: `${base}/google/picker/session`, method: 'POST', body: {} } };
  }
  const runMatch = path.match(/^\/extractions\/([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\/run$/i);
  if (runMatch) {
    if (method !== 'POST') return { error: 'metodo_nao_permitido' };
    const id = encodeURIComponent(runMatch[1]);
    const intent = req.headers['x-data-hub-intent'];
    if (typeof intent !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(intent)) {
      return { error: 'intencao_invalida' };
    }
    return { operation: 'run', request: { endpoint: `${base}/extractions/${id}/run`, method: 'POST', body: {}, intentId: intent } };
  }
  const match = path.match(/^\/extractions\/([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/i);
  if (!match) return { error: 'rota_data_hub_invalida' };
  const id = encodeURIComponent(match[1]);
  if (method === 'GET') return { operation: 'get', request: { endpoint: `${base}/extractions/${id}`, method: 'GET' } };
  if (method === 'PATCH') return { operation: 'update', request: { endpoint: `${base}/extractions/${id}`, method: 'PATCH', body: jsonBody(req) } };
  if (method === 'DELETE') return { operation: 'delete', request: { endpoint: `${base}/extractions/${id}`, method: 'DELETE', body: jsonBody(req) } };
  return { error: 'metodo_nao_permitido' };
}

export interface DependenciasDataHubPortal {
  executar?: typeof executarRequisicaoDataHub;
}

export async function atenderDataHub(
  req: Request,
  res: Response,
  ator: { id: string; email: string },
  dependencias: DependenciasDataHubPortal = {},
) {
  res.setHeader('Cache-Control', 'private, no-store, no-cache, must-revalidate');
  const resolvido = resolver(req);
  if ('error' in resolvido) return res.status(resolvido.error === 'metodo_nao_permitido' ? 405 : 400).json({ erro: resolvido.error });
  try {
    const resultado = await (dependencias.executar ?? executarRequisicaoDataHub)(resolvido.request, ator);
    return res.status(resultado.status).json(resultado.corpo);
  } catch (error) {
    console.error('[data-hub] Falha na operação:', error instanceof Error ? error.message : 'erro_desconhecido');
    return res.status(502).json({ erro: 'data_hub_indisponivel', mensagem: 'Não foi possível consultar o Data Hub.' });
  }
}
