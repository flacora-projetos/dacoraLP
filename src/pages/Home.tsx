/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Home da Dácora — remodelação "manifesto" (opção 2), escolhida pela Fernanda
 * e transmitida pelo Flávio em 16/11/2026, com a tipografia Editorial.
 * Decisão: OpenClaw-Dacora/cerebro/decisoes/2026-11-16-remodelacao-home-dacora.md
 *
 * Os efeitos moram em ./home-efeitos e só ligam no navegador (useEffect); o
 * HTML pré-renderizado mantém todo o texto, que é o que buscadores e IAs leem.
 */

import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { Fragment, useEffect, useRef } from 'react';
import './home-manifesto.css';
import {
  iniciarBando,
  iniciarContagem,
  iniciarEtapas,
  iniciarIma,
  iniciarReticula,
  iniciarTextoQueAcende,
} from './home-efeitos';

const CONTACT_LINK = 'https://wa.me/5519988947233?text=Ol%C3%A1%21+Vim+do+site+da+D%C3%A1cora+e+quero+saber+mais';
const GOOGLE_ADS_CONVERSION_SEND_TO = 'AW-18415625900/F2OMCMWG1-kcEKzNoM1E';

/** Só clientes ativos da carteira (conferido em config/clients.json, 16/11/2026). */
const partnerLogos = [
  { file: 'hannover.png', alt: 'Hannover Fondue', width: 488, height: 140 },
  { file: 'dona-raiz.png', alt: 'Dona Raiz', width: 201, height: 140 },
  { file: 'rei-dos-pulverizadores.png', alt: 'Rei dos Pulverizadores', width: 264, height: 140 },
  { file: 'aphase.png', alt: 'Aphase', width: 483, height: 140 },
  { file: 'dr-danilo.png', alt: 'Dr. Danilo de Sá', width: 369, height: 140 },
  { file: 'lucas-bulcao.png', alt: 'Lucas Bulcão', width: 131, height: 140 },
  { file: 'sant-alberti.png', alt: "Sant'Alberti", width: 639, height: 140 },
  { file: 'aviarte.png', alt: 'Aviarte', width: 296, height: 140 },
  { file: 'lerrux.png', alt: 'Lerrux', width: 487, height: 140 },
  { file: 'maria-nazare.png', alt: 'Dra. Maria Nazaré', width: 236, height: 140 },
] as const;

const etapas = [
  {
    n: '01',
    titulo: 'Diagnóstico comercial',
    texto: 'Mapeamos o seu processo para identificar gargalos e oportunidades antes de criar qualquer campanha.',
    img: 'estrategia-planejamento',
    alt: 'Mapa do processo comercial do cliente',
  },
  {
    n: '02',
    titulo: 'Guia de Criativos',
    texto: 'Um documento personalizado para orientar a produção de conteúdo estratégico.',
    img: 'landing-page-mobile',
    alt: 'Guia de criativos sendo planejado',
  },
  {
    n: '03',
    titulo: 'Gestão profissional',
    texto: 'Gestão de tráfego pago por uma equipe especializada com mais de 5 anos de mercado e processo validado.',
    img: 'estrutura-tecnica',
    alt: 'Estrutura técnica das campanhas',
  },
] as const;

const WhatsAppIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 lg:w-7 lg:h-7">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
  </svg>
);

const trackContact = () => {
  const eventId = typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : 'evt-' + Date.now() + '-' + Math.random().toString(36).substring(2, 11);

  // 1. Pixel no front-end
  if (typeof window !== 'undefined' && (window as any).fbq) {
    (window as any).fbq('track', 'Contact', {}, { eventID: eventId });
  }

  // 2. Google Analytics 4 (GA4) e conversão do Google Ads
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', 'Contact', { event_category: 'Home Page', event_label: 'Contact' });
    (window as any).gtag('event', 'conversion', { send_to: GOOGLE_ADS_CONVERSION_SEND_TO });
  }

  // 3. Conversions API no server-side
  if (typeof window !== 'undefined') {
    const fbp = document.cookie.split('; ').find(row => row.startsWith('_fbp='))?.split('=')[1] || null;
    const fbc = document.cookie.split('; ').find(row => row.startsWith('_fbc='))?.split('=')[1] || null;
    fetch('/api/meta-capi', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventName: 'Contact',
        eventId,
        eventUrl: window.location.href,
        userAgent: navigator.userAgent,
        fbp,
        fbc,
      }),
    }).catch(err => console.error('CAPI fetch error:', err));
  }
};

/** Botão de contato: abre o WhatsApp e registra a conversão, como antes. */
function Cta({ children, escuro, id }: { children: string; escuro?: boolean; id?: string }) {
  return (
    <a
      id={id}
      className={escuro ? 'cta escuro' : 'cta'}
      href={CONTACT_LINK}
      target="_blank"
      rel="noopener noreferrer"
      onClick={trackContact}
      data-ima=""
    >
      {children} <span className="s" aria-hidden="true">→</span>
    </a>
  );
}

/** Título palavra por palavra: cada palavra sobe da sua própria máscara. */
function Palavras({ texto, inicio }: { texto: string; inicio: number }) {
  const ws = texto.split(' ');
  return (
    <>
      {ws.map((w, k) => (
        <Fragment key={k}>
          <span className="palavra">
            <span style={{ ['--i' as string]: inicio + k }}>{w}</span>
          </span>
          {k < ws.length - 1 ? ' ' : null}
        </Fragment>
      ))}
    </>
  );
}

/** Texto que acende ao rolar: cada palavra vira um alvo. */
function Acende({ texto }: { texto: string }) {
  return (
    <>
      {texto.split(' ').map((w, k, ws) => (
        <Fragment key={k}>
          <span className="w">{w}</span>
          {k < ws.length - 1 ? ' ' : null}
        </Fragment>
      ))}
    </>
  );
}

const TITULO_1 = 'Você tem um serviço diferenciado.';
const TITULO_2 = 'O tráfego pago precisa refletir isso.';

export default function App() {
  const raiz = useRef<HTMLDivElement>(null);
  const heroi = useRef<HTMLElement>(null);
  const bando = useRef<HTMLCanvasElement>(null);
  const retic = useRef<HTMLElement>(null);
  const acende = useRef<HTMLParagraphElement>(null);
  const conta = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = raiz.current;
    if (!el) return;
    const reduz = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    // As classes que "apagam" texto e etapas só valem com os efeitos ligados.
    if (!reduz) el.classList.add('fx');
    const limpezas = [
      bando.current && heroi.current ? iniciarBando(bando.current, heroi.current, el.querySelector('#cta-heroi')) : null,
      retic.current ? iniciarReticula(retic.current) : null,
      acende.current ? iniciarTextoQueAcende(acende.current) : null,
      iniciarEtapas(el),
      conta.current ? iniciarContagem(conta.current, 150) : null,
      iniciarIma(el),
    ];
    return () => {
      limpezas.forEach((f) => f?.());
      el.classList.remove('fx');
    };
  }, []);

  return (
    <div ref={raiz} className="hm">
      <header className="topo lado">
        <div className="miolo">
          <a className="marca" href="#topo" aria-label="Dácora, início da página">dácora</a>
          <nav aria-label="Seções">
            <a href="#diagnostico">Diagnóstico</a>
            <a href="#etapas">Como funciona</a>
            <a href="#parceiros">Parceiros</a>
          </nav>
        </div>
      </header>

      <main id="topo">
        {/* HERÓI — o espetáculo: cada ponto é um lead e o bando segue o mouse */}
        <section ref={heroi} className="heroi lado grao" aria-labelledby="t1">
          <div className="foto" aria-hidden="true">
            <img
              src="/img/hero-trafego-pago-1920.webp"
              srcSet="/img/hero-trafego-pago-640.webp 640w, /img/hero-trafego-pago-828.webp 828w, /img/hero-trafego-pago-1280.webp 1280w, /img/hero-trafego-pago-1920.webp 1920w"
              sizes="100vw"
              width={1920}
              height={1280}
              alt=""
              fetchPriority="high"
              decoding="async"
            />
          </div>
          <canvas ref={bando} aria-hidden="true" />
          <p className="dica d" aria-hidden="true">cada ponto é um lead.<br />passe o mouse no <b>botão</b>.</p>
          <div className="miolo">
            <p className="rot d">tráfego pago para negócios locais</p>
            <h1 id="t1" aria-label={`${TITULO_1} ${TITULO_2}`}>
              <span aria-hidden="true"><Palavras texto={TITULO_1} inicio={0} /></span>
              <span className="v" aria-hidden="true"><Palavras texto={TITULO_2} inicio={TITULO_1.split(' ').length} /></span>
            </h1>
            <div className="base">
              <p>
                Ajudamos negócios locais a atrair leads qualificados, mas <b>o trabalho começa com um diagnóstico do seu processo comercial</b>, não com o gerenciador.
              </p>
              <Cta id="cta-heroi">Solicitar proposta</Cta>
            </div>
          </div>
        </section>

        {/* PARA QUEM É */}
        <section className="manif papel lado grao" aria-labelledby="t2">
          <div className="miolo">
            <h2 className="d" id="t2">esse serviço é para você que</h2>
            <p ref={acende} className="grande">
              <Acende texto="Tem um serviço diferenciado e quer que os anúncios tragam" />{' '}
              <span className="v"><Acende texto="o cliente certo" /></span>{' '}
              <Acende texto="— não só volume." />
            </p>
            <div className="quem">
              <article><span className="d n">01 · volume não basta</span><p>Investe em anúncios, mas os leads que chegam não viram cliente — e você nem sabe o porquê.</p></article>
              <article><span className="d n">02 · processo antes de campanha</span><p>Quer uma gestão que entende o seu processo comercial, não só as métricas da campanha.</p></article>
              <article><span className="d n">03 · prova toda semana</span><p>Quer ver, toda segunda, o que o investimento trouxe — em mensagem clara, no WhatsApp.</p></article>
            </div>
          </div>
        </section>

        {/* DIAGNÓSTICO — a foto se revela por trás da retícula */}
        <section id="diagnostico" className="diag lado grao" aria-labelledby="t3">
          <div className="miolo">
            <div>
              <p className="d">diagnóstico comercial</p>
              <h2 id="t3">O problema nem sempre está <span className="v">no anúncio.</span></h2>
              <p className="l">A maioria dos negócios locais que investe em tráfego pago encontra os gargalos antes do gerenciador:</p>
              <ul className="garg">
                <li>Atendimento desorganizado <span className="d">gargalo 1</span></li>
                <li>Oferta mal posicionada <span className="d">gargalo 2</span></li>
                <li>Follow-up inexistente <span className="d">gargalo 3</span></li>
              </ul>
              <p className="frase">O anúncio traz o lead. O processo comercial é o que <b>converte.</b> Por isso a gestão começa com diagnóstico.</p>
            </div>
            <figure ref={retic} className="retic">
              <img
                src="/img/diagnostico-comercial-828.webp"
                srcSet="/img/diagnostico-comercial-640.webp 640w, /img/diagnostico-comercial-828.webp 828w, /img/diagnostico-comercial-1200.webp 1200w"
                sizes="(min-width: 900px) 600px, 100vw"
                width={828}
                height={1242}
                alt="Reunião de diagnóstico do processo comercial antes de iniciar as campanhas"
                loading="lazy"
                decoding="async"
              />
              <canvas aria-hidden="true" />
              <figcaption className="d" aria-hidden="true">passe o mouse para ver por trás do anúncio</figcaption>
            </figure>
          </div>
        </section>

        {/* COMO FUNCIONA — etapas presas na rolagem */}
        <section id="etapas" className="etapas papel lado grao" aria-labelledby="t4">
          <div className="miolo">
            <div className="fixo">
              <p className="d">como funciona</p>
              <h2 id="t4">Três etapas, <span className="v">nessa ordem.</span></h2>
              <div className="contador" aria-hidden="true"><span className="num"><span data-num="">01</span></span><span className="d tot">/ 03</span></div>
              <div className="barra" aria-hidden="true"><i data-barra="" /></div>
              <Cta escuro>Quero saber mais</Cta>
            </div>
            <div>
              {etapas.map((e) => (
                <article key={e.n} className="passo" data-n={e.n}>
                  <figure>
                    <img
                      src={`/img/${e.img}-640.webp`}
                      srcSet={`/img/${e.img}-400.webp 400w, /img/${e.img}-640.webp 640w, /img/${e.img}-1000.webp 1000w`}
                      sizes="(min-width: 900px) 640px, 100vw"
                      alt={e.alt}
                      width={640}
                      height={400}
                      loading="lazy"
                      decoding="async"
                    />
                  </figure>
                  <span className="d">etapa {e.n}</span>
                  <h3>{e.titulo}</h3>
                  <p>{e.texto}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* PARCEIROS — o número grande e quem já passou pelo processo */}
        <section id="parceiros" className="prova lado grao" aria-labelledby="t5">
          <div className="miolo">
            <p className="d">parceiros</p>
            <div className="topo-prova">
              <div className="cento" aria-hidden="true"><span ref={conta}>150</span><span className="v">+</span></div>
              <div>
                <h2 id="t5">Mais de 150 empresas já passaram pelo nosso processo.</h2>
                <p className="l">De negócios locais a empresas com operação nacional, nossa estratégia parte sempre do mesmo princípio: entender o negócio antes de decidir como anunciar.</p>
              </div>
            </div>
            <ul className="logos" aria-label="Alguns clientes da Dácora">
              {partnerLogos.map((logo) => (
                <li key={logo.file}>
                  <img
                    src={`/img/negocios-servicos/logos/${logo.file}`}
                    alt={logo.alt}
                    width={logo.width}
                    height={logo.height}
                    loading="lazy"
                    decoding="async"
                  />
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* CHAMADA FINAL */}
        <section className="final papel lado grao" aria-labelledby="t6">
          <div className="miolo">
            <p className="d">próximo passo</p>
            <h2 id="t6">Quer atrair os clientes certos e <span className="v">se destacar no seu mercado?</span></h2>
            <div className="linha">
              <p>Vagas limitadas. Trabalhamos com um número reduzido de clientes para garantir qualidade de entrega.</p>
              <Cta escuro>Solicitar proposta</Cta>
            </div>
          </div>
        </section>
      </main>

      <footer className="rod lado">
        <div className="miolo">
          <span>dacora.com.br</span>
          <nav aria-label="Links do rodapé">
            <a href="https://www.instagram.com/dacora.com.br/" target="_blank" rel="noopener noreferrer">Instagram</a>
            <Link to="/politica-de-privacidade">Política de Privacidade</Link>
            {/* Página de vendas do Dácora Fluxo: projeto próprio, servido em /fluxo/ pelo vercel.json */}
            <a href="/fluxo/">Dácora Fluxo</a>
          </nav>
          <a className="d" href="https://wa.me/5562999465725" target="_blank" rel="noopener noreferrer">desenvolvido por flávio corá</a>
        </div>
      </footer>

      {/* Botão flutuante do WhatsApp */}
      <motion.a
        href={CONTACT_LINK}
        onClick={trackContact}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Fale conosco pelo WhatsApp"
        className="fixed bottom-6 right-6 lg:bottom-10 lg:right-10 z-50 bg-[#25D366] text-white p-4 rounded-full shadow-lg hover:bg-[#1EBE5D] hover:scale-105 hover:shadow-xl transition-all duration-300 group flex items-center justify-center pointer-events-auto"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 1, type: 'spring', bounce: 0.5 }}
      >
        <WhatsAppIcon />
        <span className="absolute right-full mr-4 bg-dacora-dark text-dacora-offwhite text-sm font-medium px-4 py-2 rounded shadow-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none whitespace-nowrap hidden sm:block">
          Fale conosco
        </span>
      </motion.a>
    </div>
  );
}
