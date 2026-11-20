begin;

create table public.portal_propostas (
  slug text primary key check (length(slug) <= 100 and slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  cliente text not null check (length(trim(cliente)) between 1 and 120),
  titulo text not null check (length(trim(titulo)) between 1 and 180),
  valor_centavos integer check (valor_centavos >= 0),
  situacao text not null default 'sem-situacao'
    check (situacao in ('sem-situacao', 'enviada', 'negociacao', 'fechada', 'sem-acordo')),
  revisao integer not null default 0 check (revisao >= 0),
  cadastrado_em timestamptz not null default now()
);

create table public.portal_propostas_historico (
  slug text not null references public.portal_propostas(slug),
  revisao integer not null,
  situacao text not null check (situacao in ('sem-situacao', 'enviada', 'negociacao', 'fechada', 'sem-acordo')),
  autor text not null check (length(autor) between 1 and 160),
  criado_em timestamptz not null default now(),
  primary key (slug, revisao)
);

alter table public.portal_propostas enable row level security;
alter table public.portal_propostas_historico enable row level security;
revoke all on public.portal_propostas, public.portal_propostas_historico from public, anon, authenticated, service_role;
grant select, insert on public.portal_propostas, public.portal_propostas_historico to service_role;
grant update (situacao, revisao) on public.portal_propostas to service_role;

create function public.portal_propostas_mudar_situacao(
  proposta_slug text, proposta_revisao integer, nova_situacao text, autor_validado text
)
returns text
language plpgsql
security invoker
set search_path = ''
as $$
declare
  atual public.portal_propostas;
begin
  select * into atual from public.portal_propostas where slug = proposta_slug for update;
  if not found then return 'ausente'; end if;
  if atual.revisao = proposta_revisao + 1 and atual.situacao = nova_situacao then
    return 'salva';
  end if;
  if atual.revisao <> proposta_revisao then return 'conflito'; end if;
  if atual.situacao = nova_situacao then return 'salva'; end if;

  update public.portal_propostas
     set situacao = nova_situacao, revisao = atual.revisao + 1
   where slug = proposta_slug;
  insert into public.portal_propostas_historico (slug, revisao, situacao, autor)
    values (proposta_slug, atual.revisao + 1, nova_situacao, autor_validado);
  return 'salva';
end;
$$;

revoke all on function public.portal_propostas_mudar_situacao(text, integer, text, text) from public, anon, authenticated;
grant execute on function public.portal_propostas_mudar_situacao(text, integer, text, text) to service_role;

commit;
