begin;

create table public.portal_reunioes (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) <= 120),
  titulo text not null check (length(titulo) between 1 and 180),
  cliente text not null check (length(cliente) between 1 and 140),
  data date not null,
  compartilhado jsonb not null check (jsonb_typeof(compartilhado) = 'object'),
  interno jsonb not null check (jsonb_typeof(interno) = 'object'),
  criado_por uuid not null,
  criado_em timestamptz not null default now()
);

create table public.portal_reunioes_convites (
  reuniao_id uuid not null references public.portal_reunioes(id) on delete cascade,
  email text not null check (email = lower(trim(email)) and length(email) between 3 and 254),
  ativo boolean not null default true,
  expira_em timestamptz not null,
  criado_por uuid not null,
  criado_em timestamptz not null default now(),
  primary key (reuniao_id, email)
);
create index portal_reunioes_convites_email on public.portal_reunioes_convites(email, expira_em) where ativo;

create table public.portal_reunioes_notas (
  id uuid primary key,
  reuniao_id uuid not null references public.portal_reunioes(id) on delete cascade,
  secao text not null check (secao ~ '^[a-z0-9-]{1,70}$'),
  visibilidade text not null check (visibilidade in ('interno', 'compartilhado')),
  tipo text not null check (tipo in ('anotacao', 'decisao', 'acao')),
  texto text not null check (length(trim(texto)) between 1 and 5000),
  autor_id uuid not null,
  autor_nome text not null check (length(autor_nome) between 1 and 254),
  criado_em timestamptz not null default now()
);
create index portal_reunioes_notas_reuniao on public.portal_reunioes_notas(reuniao_id, criado_em, id);

-- A autorização por convite vive no servidor. A chave pública não lê nem escreve estas tabelas.
alter table public.portal_reunioes enable row level security;
alter table public.portal_reunioes_convites enable row level security;
alter table public.portal_reunioes_notas enable row level security;
revoke all on public.portal_reunioes, public.portal_reunioes_convites, public.portal_reunioes_notas from public, anon, authenticated;
grant select, insert on public.portal_reunioes, public.portal_reunioes_notas to service_role;
grant select, insert, update on public.portal_reunioes_convites to service_role;

comment on table public.portal_reunioes is 'Portal: pauta compartilhada e roteiro interno, projetados separadamente pelo BFF.';
comment on table public.portal_reunioes_notas is 'Registros acrescentados individualmente; autor vem da sessão validada no servidor.';

commit;
