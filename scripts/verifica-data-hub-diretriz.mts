import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

const read = (relativePath: string) =>
  readFile(path.join(root, relativePath), 'utf8')

const requiredDocs = [
  'AGENTS.md',
  'CLAUDE.md',
  'docs/DATA_HUB_ESTADO_ATUAL.md',
  'docs/PROMPT_PROXIMA_SESSAO.md',
]

for (const relativePath of requiredDocs) {
  const content = await read(relativePath)
  assert.match(
    content,
    /DATA_HUB_DIRETRIZ_QUERY_FIRST\.md/,
    `${relativePath} precisa apontar para a diretriz query-first do Data Hub`,
  )
}

const directive = await read('docs/DATA_HUB_DIRETRIZ_QUERY_FIRST.md')
assert.match(directive, /Query Engine V2/i)
assert.match(directive, /schema-first\/wide.*legado/is)
assert.match(directive, /não deve.*segunda lista manual/is)

const prompt = await read('docs/PROMPT_PROXIMA_SESSAO.md')
const state = await read('docs/DATA_HUB_ESTADO_ATUAL.md')
const progress = await read('docs/PAINEL_PROGRESSO.md')

for (const [name, content] of [
  ['PROMPT_PROXIMA_SESSAO.md', prompt],
  ['DATA_HUB_ESTADO_ATUAL.md', state],
] as const) {
  assert.match(content, /Query Engine V2/i, `${name} precisa apontar o gate vigente`)
  assert.match(content, /LEGADO/i, `${name} precisa marcar o motor anterior como legado`)
}

const forbiddenPromptPhrases = [
  'expandir hierarquia e Insights por lotes',
  'completar as variações de `count`, `value` e `cost` das actions',
  'A matriz de 676 capacidades ainda aguarda sanitização',
]

for (const phrase of forbiddenPromptPhrases) {
  assert.equal(
    prompt.includes(phrase),
    false,
    `PROMPT_PROXIMA_SESSAO.md voltou a prescrever estado/motor legado: ${phrase}`,
  )
}

const latestDataHubCheckpoint = progress.slice(
  progress.lastIndexOf('## 2026-09-07 — Data Hub'),
)
assert.match(latestDataHubCheckpoint, /Query Engine V2/i)
assert.match(latestDataHubCheckpoint, /LEGADO PARA NOVA COBERTURA/i)
assert.equal(
  latestDataHubCheckpoint.includes('O próximo gate é executar o smoke autenticado novo e expandir primeiro'),
  false,
  'PAINEL_PROGRESSO.md voltou ao gate schema-first antigo',
)

console.log('Diretriz Data Hub query-first: OK')
