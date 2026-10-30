import { useState } from 'react';
import { rotulosContexto, textoDosItens, type ContextoSugerido } from './contextoSugerido';

export function ContextoAutomatico({ sugestao, aviso, ocupada, aoUsar, aoOrganizar }: {
  sugestao: ContextoSugerido | null;
  aviso?: string | null;
  ocupada: boolean;
  aoUsar: (texto: string) => void;
  aoOrganizar: (ids: string[]) => Promise<string>;
}) {
  const [retirados, setRetirados] = useState<Set<string>>(new Set());
  const [organizado, setOrganizado] = useState('');
  const [organizando, setOrganizando] = useState(false);
  const [erro, setErro] = useState('');
  const itens = sugestao?.itens.filter(i => !retirados.has(i.id)) ?? [];
  const bloqueada = ocupada || organizando;
  async function organizar() {
    setOrganizando(true); setErro('');
    try { setOrganizado(await aoOrganizar(itens.map(i => i.id))); }
    catch (e) { setErro(e instanceof Error ? e.message : 'Não foi possível organizar. Os registros originais continuam disponíveis.'); }
    finally { setOrganizando(false); }
  }
  return <section className="dcp-contexto-automatico" aria-label="Sugestão do segundo cérebro">
    <strong>Sugestão do segundo cérebro</strong>
    <p>Registros do período deste relatório. Retire o que não ajuda a análise. Decisão registrada não comprova execução.</p>
    {aviso && <p role="status">{aviso}</p>}
    {sugestao && <>
      <small>Atualizado em {new Date(sugestao.geradoEm).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })} · {sugestao.itens.length} de {sugestao.total} registros</small>
      {sugestao.avisos.map((a, i) => <p className="dcp-contexto-automatico__aviso" key={i}>{a}</p>)}
      {sugestao.omitidos > 0 && <p>{sugestao.omitidos} registros ficaram fora deste resumo. Os mais relevantes aparecem primeiro.</p>}
      {!sugestao.itens.length && <p>Nenhum registro encontrado nas fontes lidas. Confira os avisos de cobertura acima.</p>}
      <ul>{sugestao.itens.map(i => <li key={i.id}>
        <label><input type="checkbox" checked={!retirados.has(i.id)} disabled={bloqueada} onChange={() => {
          setRetirados(anteriores => { const novos = new Set(anteriores); novos.has(i.id) ? novos.delete(i.id) : novos.add(i.id); return novos; });
          setOrganizado('');
        }} />
          <span><small>{i.data.split('-').reverse().join('/')} · {rotulosContexto[i.tipo]}</small><br />{i.texto}<br /><small>Fonte: {i.fonte}</small></span>
        </label>
      </li>)}</ul>
      <div className="dcp-contexto-mes__acoes">
        <button type="button" className="dcp-botao dcp-botao--discreto" disabled={bloqueada || !itens.length} onClick={() => aoUsar(organizado || textoDosItens(itens))}>Acrescentar ao contexto</button>
        <button type="button" className="dcp-botao dcp-botao--discreto" disabled={bloqueada || itens.length < 2} onClick={() => void organizar()}>{organizando ? 'Organizando…' : 'Organizar com IA'}</button>
      </div>
      <small>A IA só organiza os registros selecionados, preservando os textos. O contexto existente será mantido; confira e salve antes de gerar análises.</small>
      {organizado && <div className="dcp-contexto-automatico__previa"><strong>Prévia organizada · ainda não salva</strong><p>{organizado}</p></div>}
    </>}
    {erro && <p role="alert">{erro}</p>}
  </section>;
}
