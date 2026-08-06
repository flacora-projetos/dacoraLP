/**
 * Botão "Entrar com o Google".
 *
 * O ícone em SVG veio literal do `GoogleAuthButton.tsx` da SmartBio — é a marca
 * do Google e não pode ser redesenhada. O resto foi reescrito: lá o botão usa o
 * `Button` do shadcn e carrega a intenção de plano/checkout do funil de vendas;
 * aqui não há funil, e o projeto não tem biblioteca de componentes.
 *
 * A marca Google exige fundo claro com borda — este botão não pode virar o
 * verde da Dácora, mesmo sendo a ação principal da tela.
 */
import { useState } from 'react';

function IconeGoogle() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true" focusable="false">
      <path
        fill="#4285F4"
        d="M17.64 9.2045c0-.6382-.0573-1.2518-.1636-1.8409H9v3.4814h4.8436c-.2086 1.125-.8427 2.0782-1.7959 2.7164v2.2582h2.9086c1.7018-1.5668 2.6837-3.874 2.6837-6.6151z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.4673-.806 5.9564-2.1809l-2.9086-2.2582c-.8059.54-1.8368.859-3.0478.859-2.344 0-4.3282-1.5831-5.036-3.7104H.9573v2.3318C2.4382 15.9832 5.4818 18 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.964 10.71c-.18-.54-.2823-1.1168-.2823-1.71s.1023-1.17.2823-1.71V4.9582H.9573C.3477 6.1732 0 7.5477 0 9s.3477 2.8268.9573 4.0418L3.964 10.71z"
      />
      <path
        fill="#EA4335"
        d="M9 3.5795c1.3214 0 2.5077.4541 3.4405 1.346l2.5813-2.5814C13.4632.8918 11.426 0 9 0 5.4818 0 2.4382 2.0168.9573 4.9582L3.964 7.29C4.6718 5.1627 6.656 3.5795 9 3.5795z"
      />
    </svg>
  );
}

interface Props {
  rotulo: string;
  aoEntrar: () => Promise<void>;
}

export default function BotaoGoogle({ rotulo, aoEntrar }: Props) {
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function aoClicar() {
    setOcupado(true);
    setErro(null);
    try {
      await aoEntrar();
      // No caminho feliz o navegador vai embora para o Google e este componente
      // é desmontado — não há como (nem por que) desligar o `ocupado` aqui.
    } catch (err) {
      setOcupado(false);
      setErro(
        err instanceof Error && err.message
          ? `Não foi possível abrir a entrada do Google: ${err.message}`
          : 'Não foi possível abrir a entrada do Google. Tente de novo.',
      );
    }
  }

  return (
    <div className="dcp-google">
      <button type="button" className="dcp-botao-google" onClick={aoClicar} disabled={ocupado}>
        <IconeGoogle />
        {ocupado ? 'Abrindo o Google…' : rotulo}
      </button>
      {erro ? (
        <p className="dcp-erro" role="alert">
          {erro}
        </p>
      ) : null}
    </div>
  );
}
