function encerrarFrase(texto: string): string {
  const limpo = texto.trim();
  if (!limpo) return '';
  return /[.!?…]$/.test(limpo) ? limpo : `${limpo}.`;
}

export function paragrafosDaAnaliseEditorial(texto: string): string[] {
  const paragrafos = texto
    .split(/\n\s*\n/)
    .map((item) => item.trim())
    .filter(Boolean);

  if (paragrafos.length !== 1 || !paragrafos[0].includes(';')) return paragrafos;

  const trechos = paragrafos[0]
    .split(/;\s+/)
    .map(encerrarFrase)
    .filter(Boolean);

  return trechos.length > 1 ? trechos : paragrafos;
}
