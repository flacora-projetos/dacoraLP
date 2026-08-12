/**
 * O endereço de "Voltar para a fila", preservando competência, aba e filtros.
 *
 * A fila guarda esse estado na própria URL (`Fila.tsx`), e cada link que abre
 * um relatório — externo (`?relatorio=`) ou interno (`/painel-de-relatorios/
 * interno/:id`) — já leva esses parâmetros junto. Isso faz a volta ser
 * simplesmente "a mesma URL, sem `relatorio`": nada precisa ser lembrado à
 * parte, e o botão "voltar" do navegador funciona pelo mesmo motivo, porque
 * ele também está só navegando entre URLs.
 *
 * Compartilhado entre `RevisaoMoldura.tsx` (mensal externo) e
 * `DetalheInterno.tsx` (mensal interno Allgrotech) para as duas telas terem
 * exatamente a mesma regra — sem cada uma reimplementar por conta própria e
 * arriscar divergir depois.
 */
import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

export function useLinkDeVoltaParaFila(): string {
  const [searchParams] = useSearchParams();
  return useMemo(() => {
    const preservados = new URLSearchParams(searchParams);
    preservados.delete('relatorio');
    const query = preservados.toString();
    return query ? `/painel-de-relatorios?${query}` : '/painel-de-relatorios';
  }, [searchParams]);
}
