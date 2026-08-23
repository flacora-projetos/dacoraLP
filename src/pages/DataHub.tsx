import { useState } from 'react';
import { PainelAuthProvider, usarPainelAuth } from '../painel/AuthContext';
import Portao from '../painel/Portao';
import { usaPaginaPrivada } from '../painel/usaPaginaPrivada';
import '../painel/painel.css';
import './data-hub.css';

type EstadoConexao =
  | { tipo: 'inicial' }
  | { tipo: 'testando' }
  | { tipo: 'ok'; requestId: string }
  | { tipo: 'erro'; mensagem: string; requestId?: string };

export default function DataHub() {
  usaPaginaPrivada('Data Hub | Dácora');
  return (
    <div className="dc-painel dc-data-hub">
      <div className="dcp-portal" />
      <PainelAuthProvider>
        <Portao>
          <DataHubInicio />
        </Portao>
      </PainelAuthProvider>
    </div>
  );
}

function DataHubInicio() {
  const { sessao, autorizacao, usuario, sair } = usarPainelAuth();
  const [estado, setEstado] = useState<EstadoConexao>({ tipo: 'inicial' });
  const email = autorizacao?.estado === 'autorizado' ? autorizacao.email : usuario?.email ?? '';

  async function testarConexao() {
    if (!sessao?.access_token) {
      setEstado({ tipo: 'erro', mensagem: 'Sua sessão não está disponível. Entre novamente.' });
      return;
    }
    setEstado({ tipo: 'testando' });
    try {
      const resposta = await fetch('/api/data-hub-spike', {
        method: 'POST',
        headers: { Authorization: `Bearer ${sessao.access_token}`, 'Content-Type': 'application/json' },
        body: '{}',
      });
      let corpo: any = null;
      try { corpo = await resposta.json(); } catch { corpo = null; }
      if (resposta.ok && corpo?.status === 'accepted' && typeof corpo?.requestId === 'string') {
        setEstado({ tipo: 'ok', requestId: corpo.requestId });
        return;
      }
      setEstado({
        tipo: 'erro',
        mensagem: String(corpo?.mensagem ?? 'Não foi possível validar o canal com o Data Hub.'),
        requestId: typeof corpo?.requestId === 'string' ? corpo.requestId : undefined,
      });
    } catch {
      setEstado({ tipo: 'erro', mensagem: 'O portal não conseguiu alcançar o Data Hub agora.' });
    }
  }

  return (
    <>
      <header className="dcp-topo">
        <div className="dcp-topo__conteudo">
          <span className="dcp-topo__marca">Dácora</span>
          <span className="dcp-topo__separador" aria-hidden="true" />
          <span className="dcp-topo__titulo">Data Hub</span>
          <div className="dcp-topo__identidade">
            <span className="dcp-topo__email" title={email}>{email}</span>
            <button type="button" className="dcp-botao dcp-botao--discreto" onClick={() => void sair()}>Sair</button>
          </div>
        </div>
      </header>

      <main className="dch-corpo">
        <section className="dch-intro" aria-labelledby="data-hub-titulo">
          <p className="dcp-eyebrow">Fundação do produto</p>
          <h1 id="data-hub-titulo">Dados de marketing, sob controle.</h1>
          <p>
            A conexão segura entre este portal e o Data Hub está pronta para validação. Este teste não consulta contas,
            não cria planilhas e não agenda atualizações.
          </p>
        </section>

        <section className="dch-conexao" aria-labelledby="conexao-titulo">
          <div>
            <span className="dch-etapa">01</span>
            <h2 id="conexao-titulo">Canal privado</h2>
            <p>Sua sessão autoriza o portal. Credenciais curtas conectam o servidor ao ambiente privado do Data Hub.</p>
          </div>
          <div className="dch-acao">
            <button
              type="button"
              className="dcp-botao dcp-botao--primario"
              disabled={estado.tipo === 'testando'}
              onClick={() => void testarConexao()}
            >
              {estado.tipo === 'testando' ? 'Validando…' : 'Testar conexão'}
            </button>
            <EstadoDaConexao estado={estado} />
          </div>
        </section>

        <div className="dch-proximas" aria-label="Próximas etapas">
          <span>Depois desta validação</span>
          <p>Contas e campos → período e granularidade → destino no Google Sheets → agendamento.</p>
        </div>
      </main>
    </>
  );
}

function EstadoDaConexao({ estado }: { estado: EstadoConexao }) {
  if (estado.tipo === 'inicial') return <p className="dch-status">Nenhum dado será alterado neste teste.</p>;
  if (estado.tipo === 'testando') return <p className="dch-status" role="status">Validando identidade e canal privado…</p>;
  if (estado.tipo === 'ok') {
    return <p className="dch-status dch-status--ok" role="status">Conexão validada. Referência: <code>{estado.requestId}</code></p>;
  }
  return <p className="dch-status dch-status--erro" role="alert">{estado.mensagem}{estado.requestId ? <> Referência: <code>{estado.requestId}</code></> : null}</p>;
}
