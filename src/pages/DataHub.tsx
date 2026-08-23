import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PainelAuthProvider, usarPainelAuth } from '../painel/AuthContext';
import Portao from '../painel/Portao';
import { usaPaginaPrivada } from '../painel/usaPaginaPrivada';
import { CriadorDeExtracao, ListaDeExtracoes, type ExtracaoLocal } from './data-hub-extracoes';
import { CATALOGO_PADRAO, normalizarCatalogo, type Catalogo } from './data-hub-catalogo';
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
  const [vista, setVista] = useState<'lista' | 'criador'>('lista');
  const [extracoes, setExtracoes] = useState<readonly ExtracaoLocal[]>([]);
  const [catalogo, setCatalogo] = useState<Catalogo>(CATALOGO_PADRAO);
  const [carregando, setCarregando] = useState(true);
  const [erroDados, setErroDados] = useState<string | null>(null);
  const [erroSalvar, setErroSalvar] = useState<string | null>(null);
  const email = autorizacao?.estado === 'autorizado' ? autorizacao.email : usuario?.email ?? '';

  async function chamarDataHub(path: string, init: RequestInit = {}) {
    if (!sessao?.access_token) throw new Error('sessao_indisponivel');
    const resposta = await fetch(`/api/data-hub${path}`, {
      ...init,
      headers: { Authorization: `Bearer ${sessao.access_token}`, 'Content-Type': 'application/json', ...(init.headers ?? {}) },
    });
    const corpo = await resposta.json().catch(() => null);
    if (!resposta.ok) throw new Error(String(corpo?.mensagem ?? corpo?.erro ?? 'Não foi possível consultar o Data Hub.'));
    return corpo;
  }

  useEffect(() => {
    if (!sessao?.access_token) return;
    let ativo = true;
    setCarregando(true);
    setErroDados(null);
    Promise.all([chamarDataHub('/catalog'), chamarDataHub('/extractions')])
      .then(([catalogoRemoto, extracoesRemotas]) => {
        if (!ativo) return;
        setCatalogo(normalizarCatalogo(catalogoRemoto));
        const items = extracoesRemotas?.data?.items ?? [];
        setExtracoes(items.map((item: any) => ({
          id: String(item.extractionId ?? item.id), revision: Number(item.revision ?? 1),
          nome: String(item.name ?? item.nome ?? item.extractionId), resumo: `${(item.fields ?? []).length} campos · ${item.periodContract?.dataPeriod?.type ?? 'período'} · ${item.periodContract?.outputGranularity ?? ''}`,
          definition: item,
        })));
      })
      .catch((error) => { if (ativo) setErroDados(error instanceof Error ? error.message : 'Não foi possível carregar o Data Hub.'); })
      .finally(() => { if (ativo) setCarregando(false); });
    return () => { ativo = false; };
  }, [sessao?.access_token]);

  async function salvarExtracao(extracao: ExtracaoLocal) {
    const definition = extracao.definition ?? {};
    const salvo = await chamarDataHub('/extractions', { method: 'POST', body: JSON.stringify({ extraction: definition }) });
    const item = salvo?.data;
    setExtracoes((atuais) => [...atuais, { ...extracao, id: String(item.extractionId ?? extracao.id), revision: Number(item.revision ?? 1), definition: item }]);
  }

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

      <nav className="dch-nav" aria-label="Seções do painel">
        <Link className="dch-nav__item" to="/painel-de-relatorios">Relatórios</Link>
        <span className="dch-nav__item dch-nav__item--ativo" aria-current="page">Data Hub</span>
      </nav>

      <main className="dch-corpo">
        {carregando ? <p className="dch-status" role="status">Carregando catálogo e extrações…</p> : erroDados ? <p className="dch-status dch-status--erro" role="alert">{erroDados}</p> : vista === 'lista' ? (
          <ListaDeExtracoes extracoes={extracoes} aoCriar={() => setVista('criador')} />
        ) : (
          <CriadorDeExtracao
            catalogo={catalogo}
            aoCancelar={() => setVista('lista')}
            aoConcluir={async (extracao) => {
              setErroSalvar(null);
              try {
                await salvarExtracao(extracao);
                setVista('lista');
              } catch (error) {
                setErroSalvar(error instanceof Error ? error.message : 'Não foi possível salvar a extração.');
              }
            }}
          />
        )}
        {erroSalvar ? <p className="dch-status dch-status--erro" role="alert">{erroSalvar}</p> : null}

        <section className="dch-conexao" aria-labelledby="conexao-titulo">
          <div>
            <span className="dch-etapa">Diagnóstico</span>
            <h2 id="conexao-titulo">Canal privado</h2>
            <p>
              Sua sessão autoriza o portal. Credenciais curtas conectam o servidor ao ambiente privado do Data Hub.
              O catálogo e suas extrações são lidos e salvos no Data Hub; este diagnóstico separado não cria planilhas nem agendas.
            </p>
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
