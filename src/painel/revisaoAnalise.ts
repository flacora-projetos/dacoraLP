export function afirmacoesDaIntroducaoRevisada(texto: string) {
  const paragrafos = texto
    .split(/\n\s*\n/)
    .map((paragrafo) => paragrafo.trim())
    .filter(Boolean);

  return (paragrafos.length > 0 ? paragrafos : [texto]).map((paragrafo) => ({
    texto: paragrafo,
    sustentadaPor: [] as string[],
  }));
}
