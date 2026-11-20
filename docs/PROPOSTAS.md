# Propostas com senha

`/propostas/<endereço>` abre uma proposta comercial depois da senha própria dela.

`/propostas/` é o painel interno. Usa a sessão Google do Portal e uma lista
própria de dois e-mails, `PROPOSTAS_EQUIPE_EMAILS`, configurada apenas no
servidor. A lista, os valores, as situações e o histórico são verificados e
servidos por `painel-sessao?modo=painel-propostas`. O painel e os documentos
individuais ficam fora do sitemap e do índice de busca.

O painel acompanha links existentes. Cada linha mostra o endereço da proposta
e abre a página individual numa nova aba (que continua pedindo a senha do
cliente). Adicionar um link apenas registra a proposta para a equipe. O envio
ao cliente e o acesso ao documento continuam no fluxo individual. O registro
começa em “Sem situação” se ainda não foi classificado. O valor é o total do
ciclo proposto e pode ser preenchido ou corrigido em “Detalhes”; em branco
fica “a definir”. O placar soma somente os valores informados. Cada mudança de
situação ou de valor registra o autor da sessão Google e o horário do banco na
mesma transação (`portal_propostas_atualizar`, desde 20/11/2026). Uma mudança
concorrente pede nova conferência.

Para publicar, aplicar `20261119233000_portal_propostas.sql` e `20261120020000_portal_propostas_valor.sql` no Dácora Reports,
configurar a lista privada na Vercel e confirmar o retorno do Google para
`https://www.dacora.com.br/propostas/`. Cadastrar os links comerciais
conferidos no bucket sem alterar os documentos e sem assumir a sua situação.

**Nunca coloque proposta no Git nem em `public/`: este repositório é público.** A página e o resumo da senha ficam no bucket privado `propostas` do Supabase. O atendimento está em `api/_propostas.ts`, dentro da função `painel-sessao`, porque o plano da Vercel está no limite de 12 funções.

## Proposta nova ou trocar a senha

```bash
node --env-file=.env.local scripts/propostas-subir.mjs <endereco> <pagina.html> --guardar-senha <arquivo.env>
```

A senha é gerada e fica só no arquivo indicado, fora do Git, sem aparecer na tela. Trocar a senha derruba os acessos já abertos. O acesso dura 30 dias no aparelho.

## Senha definida pelo PO e lista de logins

Grave `PROPOSTA_SENHA_<ENDERECO>` no arquivo indicado e rode:

```bash
node --env-file=.env.local scripts/propostas-subir.mjs <endereco> <pagina.html> --usar-senha <arquivo.env> --logins login,pessoa@empresa.com
```

Sem lista, o login aceito é o próprio endereço.

## Só atualizar o texto, mantendo a senha

```bash
node --env-file=.env.local scripts/propostas-subir.mjs <endereco> <pagina.html> --manter-senha
```

Nenhum dos dois casos precisa de publicação do site. A página deve ter `noindex` e ser um documento HTML completo.

Verificação: `npm run verifica:propostas`.
