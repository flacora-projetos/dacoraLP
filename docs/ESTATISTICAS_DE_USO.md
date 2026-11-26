# Estatísticas de uso — `/estatisticas`

Pedido do PO em 26/11/2026: saber quem usa cada página, quanto e se volta, e se o cliente abriu o relatório do mês.

## O que é contado

| Área | Onde é contada | Quem aparece |
|---|---|---|
| Painel de relatórios | navegador, depois do login autorizado | e-mail da equipe |
| Reuniões (home e cada reunião) | navegador, depois do login | e-mail (equipe ou convidado) |
| Propostas (painel `/propostas`) | navegador, depois do login | e-mail da equipe |
| Dácora Fluxo (`crm.dacora.com.br`) | navegador do Fluxo, com a sessão do Fluxo conferida no banco do Fluxo | e-mail de quem entrou |
| Painel da Black (`/propostas/painel-black-santalberti`) | servidor, ao entregar a página com senha válida | navegador (sem e-mail) |
| Relatório do cliente (`/relatorios/<link>`) | navegador, só depois que o relatório aparece | navegador; equipe à parte |
| A própria `/estatisticas` | navegador | e-mail da equipe |

Outras propostas por endereço **não** são contadas ("os 4 que citei + o painel da black, não presuma"). Para incluir, acrescentar em `ENDERECOS_CONTADOS` (`api/_propostas.ts`), na lista de áreas (`api/_visitas.ts`) e na restrição da tabela.

## Regras

- Contador próprio, sem rastreador de terceiro (a casca privada continua reprovando `gtag`/`fbq`). Gravação e leitura só no servidor, pela chave de serviço; a tabela `portal_visitas` é fechada ao navegador.
- Área de login nunca grava visita anônima; o relatório só conta com link existente. O link (credencial) nunca é gravado: só `cliente/AAAA-MM`.
- Prévia da equipe no link do cliente fica à parte: sessão da equipe no mesmo navegador, ou navegador já identificado como da equipe numa página interna.
- Visita = aberturas da mesma pessoa na mesma área com menos de 30 minutos entre elas. Retenção = das pessoas da semana anterior, quantas voltaram nesta (semana de segunda, horário de São Paulo).
- Endereços novos de servidor entram como `modo=` da função `painel-sessao` (limite de 12 funções): `modo=visita` (POST) e `modo=estatisticas` (GET, só equipe).

## Para ligar

1. Migração `supabase/migrations/20261126200000_portal_visitas.sql` no banco de produção.
2. Variáveis na Vercel: `FLUXO_SUPABASE_URL` e `FLUXO_SUPABASE_ANON_KEY` (endereço e chave pública do banco do Fluxo; sem elas, só o Fluxo deixa de contar).
3. Publicar o site; no Fluxo, publicar o anúncio de visita.

Prova local: `npm run verifica:visitas` (banco fechado, recusas, link não gravado, prévia separada, painel da Black, contas do resumo; quatro mutações detectadas).
