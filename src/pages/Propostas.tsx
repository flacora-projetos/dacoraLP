import { useRef, useState, type FormEvent } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { usaPaginaPrivada } from '../painel/usaPaginaPrivada';
import '../reunioes/reunioes.css';
import './propostas.css';

const ENDERECO = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export default function Propostas() {
  usaPaginaPrivada('Propostas | Dácora');
  const campo = useRef<HTMLInputElement>(null);
  const [erro, setErro] = useState('');

  function continuar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const endereco = campo.current?.value.trim().toLowerCase() ?? '';

    if (!ENDERECO.test(endereco)) {
      setErro(endereco
        ? 'Use apenas letras sem acento, números e hífens entre palavras.'
        : 'Informe o identificador da sua proposta.');
      campo.current?.focus();
      return;
    }

    window.location.assign(`/propostas/${endereco}`);
  }

  return (
    <div className="dcr">
      <main className="dcr-portao dcr-portao-propostas">
        <a href="/" className="dcr-marca" aria-label="Dácora, página inicial">
          dácora<span aria-hidden="true">®</span>
        </a>
        <div className="dcr-propostas-conteudo">
          <h1>Consulte sua <span>proposta.</span></h1>
          <form className="dcr-propostas-formulario" onSubmit={continuar} noValidate>
            <label htmlFor="identificador-proposta">Identificador da proposta</label>
            <input
              id="identificador-proposta"
              ref={campo}
              type="text"
              required
              autoCapitalize="none"
              autoComplete="off"
              spellCheck={false}
              aria-invalid={erro ? true : undefined}
              aria-describedby={erro ? 'proposta-ajuda proposta-erro' : 'proposta-ajuda'}
              onChange={() => setErro('')}
            />
            <p id="proposta-ajuda">
              Use o identificador que você recebeu da Dácora. Se recebeu um link,
              é o trecho depois de /propostas/.
            </p>
            {erro && <p id="proposta-erro" className="dcr-erro" role="alert">{erro}</p>}
            <button type="submit" className="dcr-primario">
              Continuar <ArrowUpRight size={17} aria-hidden="true" />
            </button>
            <small>Na próxima tela, entre com o login e a senha da proposta.</small>
          </form>
        </div>
      </main>
    </div>
  );
}
