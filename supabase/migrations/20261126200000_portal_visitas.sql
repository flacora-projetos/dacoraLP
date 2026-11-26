-- Contador próprio de visitas às páginas da Dácora (pedido do PO, 26/11/2026).
-- Só o servidor grava e lê (chave de serviço); navegador nenhum tem acesso direto.
-- O link do relatório nunca é guardado: `relatorio` é só "cliente/AAAA-MM".
begin;

create table public.portal_visitas (
  id bigint generated always as identity primary key,
  criado_em timestamptz not null default now(),
  area text not null check (area in (
    'painel-relatorios', 'reunioes', 'propostas', 'painel-black',
    'relatorio-cliente', 'fluxo', 'estatisticas'
  )),
  caminho text check (caminho is null or length(caminho) <= 300),
  email text check (email is null or length(email) <= 320),
  equipe boolean not null default false,
  visitante text check (visitante is null or visitante ~ '^[A-Za-z0-9-]{8,64}$'),
  relatorio text check (relatorio is null or length(relatorio) <= 140)
);

create index portal_visitas_criado_em on public.portal_visitas (criado_em);

alter table public.portal_visitas enable row level security;
revoke all on public.portal_visitas from public, anon, authenticated, service_role;
grant select, insert on public.portal_visitas to service_role;

commit;
