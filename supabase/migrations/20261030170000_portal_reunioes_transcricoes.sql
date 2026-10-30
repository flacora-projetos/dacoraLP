begin;

-- Texto longo fica fora do roteiro: a tela atualiza a reunião a cada 10 segundos e
-- só busca a transcrição quando a equipe abre a aba. Sem update: nova leitura do
-- documento original exige decisão própria, para nunca regravar às cegas.
create table public.portal_reunioes_transcricoes (
  reuniao_id uuid primary key references public.portal_reunioes(id) on delete cascade,
  texto text not null check (length(trim(texto)) between 1 and 500000),
  fonte_url text not null check (fonte_url ~ '^https://docs\.google\.com/'),
  lida_em timestamptz not null,
  criado_em timestamptz not null default now()
);

alter table public.portal_reunioes_transcricoes enable row level security;
revoke all on public.portal_reunioes_transcricoes from public, anon, authenticated;
grant select, insert on public.portal_reunioes_transcricoes to service_role;

comment on table public.portal_reunioes_transcricoes is 'Portal: transcrição da reunião, somente equipe; nunca entra na resposta de convidado.';

commit;
