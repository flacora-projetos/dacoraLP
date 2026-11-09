# Propostas com senha

`/propostas/<endereço>` abre uma proposta comercial depois da senha própria dela.

**Nunca coloque proposta no Git nem em `public/`: este repositório é público.** A página e o resumo da senha ficam no bucket privado `propostas` do Supabase. O atendimento está em `api/_propostas.ts`, dentro da função `painel-sessao`, porque o plano da Vercel está no limite de 12 funções.

## Proposta nova ou trocar a senha

```bash
node --env-file=.env.local scripts/propostas-subir.mjs <endereco> <pagina.html> --guardar-senha <arquivo.env>
```

A senha é gerada e fica só no arquivo indicado, fora do Git, sem aparecer na tela. Trocar a senha derruba os acessos já abertos. O acesso dura 30 dias no aparelho.

## Só atualizar o texto, mantendo a senha

```bash
node --env-file=.env.local scripts/propostas-subir.mjs <endereco> <pagina.html> --manter-senha
```

Nenhum dos dois casos precisa de publicação do site. A página deve ter `noindex` e ser um documento HTML completo.

Verificação: `npm run verifica:propostas`.
