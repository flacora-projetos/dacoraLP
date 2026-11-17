begin;

-- Visão geral da reunião (pedido do PO, 17/11/2026): escrita depois da reunião pelo
-- Jeeves e conferida pela Dácora (cada item com trecho literal da transcrição ou do
-- Slack autorizado). Só a equipe lê. Uma por reunião e sem update: transcrição que
-- muda pede conferência, nunca regravação às cegas.
create table public.portal_reunioes_visoes (
  reuniao_id uuid primary key references public.portal_reunioes(id) on delete cascade,
  cliente_slug text not null check (cliente_slug ~ '^[a-z0-9_-]{1,80}$'),
  -- Data da reunião, para o mensal achar o período sem juntar tabelas.
  data date not null,
  conteudo jsonb not null check (jsonb_typeof(conteudo) = 'object' and length(conteudo::text) <= 200000),
  fontes jsonb not null default '{}'::jsonb check (jsonb_typeof(fontes) = 'object'),
  conta text not null default '' check (length(conta) <= 40),
  transcricao_lida_em timestamptz not null,
  gerada_em timestamptz not null default now()
);

-- Correção humana: inserção individual com autor dado pelo servidor; o original fica.
-- O último registro de cada item vale (corrigir, não procede ou restaurar).
create table public.portal_reunioes_visao_correcoes (
  id uuid primary key,
  reuniao_id uuid not null references public.portal_reunioes_visoes(reuniao_id) on delete cascade,
  item_id text not null check (item_id ~ '^([a-f0-9]{24}|executivo)$'),
  acao text not null check (acao in ('corrigir', 'nao_procede', 'restaurar')),
  texto text check (texto is null or length(trim(texto)) between 1 and 1200),
  autor_id uuid not null,
  autor_nome text not null check (length(autor_nome) between 1 and 160),
  criado_em timestamptz not null default now(),
  check ((acao = 'corrigir') = (texto is not null))
);
create index portal_reunioes_visoes_cliente_data on public.portal_reunioes_visoes (cliente_slug, data);
create index portal_reunioes_visao_correcoes_reuniao on public.portal_reunioes_visao_correcoes (reuniao_id, criado_em, id);

alter table public.portal_reunioes_visoes enable row level security;
alter table public.portal_reunioes_visao_correcoes enable row level security;
revoke all on public.portal_reunioes_visoes from public, anon, authenticated;
revoke all on public.portal_reunioes_visao_correcoes from public, anon, authenticated;
grant select, insert on public.portal_reunioes_visoes to service_role;
grant select, insert on public.portal_reunioes_visao_correcoes to service_role;

comment on table public.portal_reunioes_visoes is 'Portal: visão geral pós-reunião, somente equipe; itens com trecho literal da fonte.';
comment on table public.portal_reunioes_visao_correcoes is 'Portal: correções da equipe na visão geral; o original é preservado.';

commit;
