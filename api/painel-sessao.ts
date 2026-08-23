/**
 * `GET /api/painel-sessao` — a única resposta para "quem é você, e você pode?".
 *
 * A tela do painel pergunta a este endereço, mandando o token da sessão do
 * Supabase. Quem decide é `conferirAcesso`, no módulo compartilhado, para que
 * este endpoint e todos os que vierem depois (a fila, a aprovação, o envio)
 * confiram exatamente a mesma coisa. Quando essa conferência é copiada e
 * colada, a quinta cópia acaba conferindo menos que a primeira — e é sempre a
 * que devolve dado de cliente.
 *
 * Três coisas que não podem mudar aqui:
 *
 * 1. **A lista de e-mails nunca sai daqui.** Nem na resposta de sucesso, nem na
 *    de recusa, nem em log. A recusa devolve o e-mail de QUEM tentou — que a
 *    pessoa já sabe qual é — e mais nada.
 * 2. **A tela esconder o botão é conforto, não segurança.**
 * 3. **Falta de configuração falha fechado.** Sem URL, sem chave ou com a lista
 *    vazia, ninguém entra — e a resposta diz o que falta configurar, porque o
 *    contrário disso é alguém passar uma tarde procurando um erro de código
 *    que era uma variável de ambiente em branco.
 */
import type { Request, Response } from 'express';
import {
  conferirAcesso,
  // A extensão `.js` é OBRIGATÓRIA aqui, e a falta dela derrubou a função
  // inteira na primeira prévia publicada: a Vercel compila cada arquivo de
  // `api/` para ESM sem juntar os módulos vizinhos, e o Node em ESM não
  // completa extensão sozinho — o import extensionless virava
  // `ERR_MODULE_NOT_FOUND` e todo pedido respondia 500. Localmente nada
  // aparecia, porque o `tsx` e o `esbuild` completam a extensão por conta.
  // O TypeScript resolve `.js` para o arquivo `.ts` ao lado, então isto
  // compila e continua sendo o mesmo módulo compartilhado.
} from './_painel-autorizacao.js';
import { executarSpikeDataHub } from './_data-hub-spike.js';
import { atenderDataHub, type DependenciasDataHubPortal } from './_data-hub.js';

export async function atenderPainelSessao(
  req: Request,
  res: Response,
  dependencias: { spike?: typeof executarSpikeDataHub; dataHub?: DependenciasDataHubPortal } = {},
) {
  // Resposta de autorização nunca pode ser guardada por cache intermediário.
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');

  const dataHubMode = req.query?.modo === 'data-hub';
  if (dataHubMode
    ? !['GET', 'POST', 'PATCH', 'DELETE'].includes(req.method)
    : req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ erro: 'metodo_nao_permitido' });
  }

  const acesso = await conferirAcesso(req.headers['authorization']);
  if (acesso.ok === false) {
    return res.status(acesso.status).json(acesso.corpo);
  }

  if (req.method === 'POST' && req.query?.modo === 'data-hub-spike') {
    if (req.body != null && (typeof req.body !== 'object' || Array.isArray(req.body) || Object.keys(req.body).length > 0)) {
      return res.status(400).json({ erro: 'payload_invalido', mensagem: 'Este teste não aceita dados enviados pelo navegador.' });
    }
    try {
      const resultado = await (dependencias.spike ?? executarSpikeDataHub)({ email: acesso.email });
      console.info(`[data-hub] Spike concluído para ${acesso.email}; requestId=${resultado.audit.requestId}.`);
      return res.status(resultado.status).json(resultado.corpo);
    } catch (erro) {
      console.error('[data-hub] Falha no spike:', erro instanceof Error ? erro.message : 'erro_desconhecido');
      return res.status(502).json({ erro: 'data_hub_indisponivel', mensagem: 'Não foi possível validar o canal com o Data Hub.' });
    }
  }

  if (req.query?.modo === 'data-hub') {
    if (req.method !== 'GET' && req.method !== 'POST' && req.method !== 'PATCH' && req.method !== 'DELETE') {
      return res.status(405).json({ erro: 'metodo_nao_permitido' });
    }
    return atenderDataHub(req, res, { email: acesso.email }, dependencias.dataHub);
  }

  return res.status(200).json({ autorizado: true, email: acesso.email, nome: acesso.nome });
}

export default async function handler(req: Request, res: Response) {
  return atenderPainelSessao(req, res);
}
