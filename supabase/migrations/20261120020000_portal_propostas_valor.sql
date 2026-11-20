begin;

-- O valor da proposta passa a ser editável no painel, com autoria no histórico.
alter table public.portal_propostas_historico
  add column valor_centavos integer check (valor_centavos >= 0);

grant update (situacao, valor_centavos, revisao) on public.portal_propostas to service_role;

create function public.portal_propostas_atualizar(
  proposta_slug text, proposta_revisao integer, nova_situacao text, novo_valor integer, autor_validado text
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
  if atual.revisao = proposta_revisao + 1 and atual.situacao = nova_situacao
    and atual.valor_centavos is not distinct from novo_valor then
    return 'salva';
  end if;
  if atual.revisao <> proposta_revisao then return 'conflito'; end if;
  if atual.situacao = nova_situacao and atual.valor_centavos is not distinct from novo_valor then
    return 'salva';
  end if;

  update public.portal_propostas
     set situacao = nova_situacao, valor_centavos = novo_valor, revisao = atual.revisao + 1
   where slug = proposta_slug;
  insert into public.portal_propostas_historico (slug, revisao, situacao, valor_centavos, autor)
    values (proposta_slug, atual.revisao + 1, nova_situacao, novo_valor, autor_validado);
  return 'salva';
end;
$$;

revoke all on function public.portal_propostas_atualizar(text, integer, text, integer, text) from public, anon, authenticated;
grant execute on function public.portal_propostas_atualizar(text, integer, text, integer, text) to service_role;

-- A função antiga fica até a versão nova do site estar no ar; sai na próxima limpeza.

commit;
