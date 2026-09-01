/**
 * `.css` como módulo vazio, para regressão que monta componente de verdade.
 *
 * O Vite resolve folha de estilo no build; o Node, não. Sem este gancho,
 * qualquer verificador que importe um componente que carrega `report.css`
 * morre em ERR_UNKNOWN_FILE_EXTENSION antes da primeira asserção. Nada aqui
 * altera comportamento de produção — o alvo destas regressões é estado, não
 * aparência.
 */
export async function load(url, context, nextLoad) {
  if (url.endsWith('.css')) {
    return { format: 'module', shortCircuit: true, source: 'export default {};' };
  }
  return nextLoad(url, context);
}
