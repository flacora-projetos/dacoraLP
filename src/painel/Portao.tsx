/**
 * O portão do painel.
 *
 * Mesma forma do `ProtectedRoute.tsx` da SmartBio — carregando → sem sessão →
 * sem autorização → conteúdo —, com duas diferenças:
 *
 * - lá o "sem sessão" redireciona para `/login`, uma rota própria. Aqui não há
 *   rota de login: o painel tem um endereço só, e quem não entrou vê a tela de
 *   entrada nele mesmo. Isso resolve de graça o retorno do OAuth (a pessoa
 *   volta para o mesmo lugar de onde saiu) e a sessão expirada no meio da
 *   revisão, que na §7 do handoff é um requisito explícito;
 * - o bloqueio por autorização não é uma consequência de "faltou carregar
 *   alguma coisa": é uma resposta do servidor, com tela própria.
 *
 * A regra que o portão implementa: **nada é liberado no benefício da dúvida.**
 * Qualquer estado que não seja um "sim" explícito do servidor mantém o painel
 * fechado.
 */
import type { ReactNode } from 'react';
import { usarPainelAuth } from './AuthContext';
import { TelaEntrar, TelaErroDeVerificacao, TelaEspera, TelaNaoAutorizado, TelaNaoConfigurado } from './telas';

export default function Portao({ children }: { children: ReactNode }) {
  const { usuario, carregando, autorizacao, erroConfiguracao, entrarComGoogle, sair, reverificar } =
    usarPainelAuth();

  if (erroConfiguracao) {
    return <TelaNaoConfigurado faltando={erroConfiguracao} />;
  }

  if (carregando) {
    return <TelaEspera rotulo="Verificando seu acesso" />;
  }

  if (!usuario) {
    return <TelaEntrar aoEntrar={entrarComGoogle} />;
  }

  // Sessão existe mas o servidor ainda não respondeu nada sobre ela. Não é
  // caminho esperado (o `carregando` cobre a consulta), e por isso mesmo trata
  // como fechado em vez de deixar passar.
  if (!autorizacao) {
    return (
      <TelaErroDeVerificacao
        mensagem="Sua entrada foi reconhecida, mas o servidor ainda não confirmou o acesso."
        aoTentarDeNovo={reverificar}
        aoSair={sair}
      />
    );
  }

  if (autorizacao.estado === 'negado') {
    return <TelaNaoAutorizado email={autorizacao.email} mensagem={autorizacao.mensagem} aoSair={sair} />;
  }

  if (autorizacao.estado === 'erro') {
    return (
      <TelaErroDeVerificacao mensagem={autorizacao.mensagem} aoTentarDeNovo={reverificar} aoSair={sair} />
    );
  }

  return <>{children}</>;
}
