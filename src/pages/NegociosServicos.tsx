import { motion, useReducedMotion, type Variants } from 'motion/react';
import { Instagram, Pause, Play } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useState } from 'react';

const CONTACT_LINK =
  'https://wa.me/5519988947233?text=Ol%C3%A1%21+Vim+do+site+da+D%C3%A1cora+e+quero+meu+diagn%C3%B3stico.';
const GOOGLE_ADS_CONVERSION_SEND_TO = 'AW-18415625900/F2OMCMWG1-kcEKzNoM1E';
const GOOGLE_LINK =
  'https://www.google.com/search?q=D%C3%A1cora+%7C+Ag%C3%AAncia+de+Tr%C3%A1fego+Pago';

const method = [
  {
    num: '01',
    title: 'Diagnóstico',
    text: 'Entendemos o negócio, a oferta, os canais de aquisição e o processo comercial antes de definir a estratégia.',
  },
  {
    num: '02',
    title: 'Estratégia',
    text: 'Definimos os canais, campanhas, públicos, ofertas e pontos da jornada que precisam ser trabalhados para gerar melhores oportunidades.',
  },
  {
    num: '03',
    title: 'Otimização',
    text: 'Acompanhamos mídia e dados comerciais para entender o que está funcionando, identificar gargalos e definir os próximos ajustes.',
  },
] as const;

const services = [
  {
    title: 'Gestão de Tráfego',
    text: 'Planejamos, estruturamos e otimizamos campanhas no Meta Ads e Google Ads com foco em gerar oportunidades qualificadas para o negócio — não apenas cliques ou alcance.',
  },
  {
    title: 'Presença Digital',
    text: 'Direcionamos conteúdos, criativos e os principais pontos de contato da marca para que Instagram, Google e outros canais trabalhem junto com a estratégia de aquisição.',
  },
  {
    title: 'Estrutura Comercial',
    text: 'Quando necessário, estruturamos landing pages, rastreamento e CRM para acompanhar melhor a jornada do lead e conectar os dados de mídia ao que realmente acontece nas vendas.',
  },
] as const;

const logos = [
  { file: 'hannover.png', alt: 'Hannover Fondue', width: 488, height: 140 },
  { file: 'dona-raiz.png', alt: 'Dona Raiz', width: 201, height: 140 },
  { file: 'rei-dos-pulverizadores.png', alt: 'Rei dos Pulverizadores', width: 264, height: 140 },
  { file: 'realmaq.png', alt: 'Realmaq Service', width: 431, height: 140 },
  { file: 'med-moveis.png', alt: 'M e D Móveis Planejados', width: 138, height: 140 },
  { file: 'avlon.png', alt: 'Avlon', width: 302, height: 140 },
  { file: 'aphase.png', alt: 'Aphase', width: 483, height: 140 },
  { file: 'dr-danilo.png', alt: 'Dr. Danilo de Sá', width: 369, height: 140 },
  { file: 'dr-flavio-zenun.png', alt: 'Dr. Flávio Zenun', width: 565, height: 140 },
  { file: 'lucas-bulcao.png', alt: 'Lucas Bulcão', width: 131, height: 140 },
  { file: 'sant-alberti.png', alt: "Sant'Alberti", width: 639, height: 140 },
  { file: 'aviarte.png', alt: 'Aviarte', width: 296, height: 140 },
  { file: 'lerrux.png', alt: 'Lerrux', width: 487, height: 140 },
  { file: 'maria-nazare.png', alt: 'Dra. Maria Nazaré', width: 236, height: 140 },
] as const;

const team = [
  {
    name: 'Fernanda Corá',
    role: 'Estratégia e Crescimento',
    bio: 'Fundadora da Dácora. Atua na construção da estratégia de aquisição e crescimento, conectando mídia, posicionamento, oferta e processo comercial.',
    instagram: 'nandacora',
    image: '/img/negocios-servicos/team/fernanda.jpg',
  },
  {
    name: 'Flávio Corá',
    role: 'Performance e Desenvolvimento',
    bio: 'Especialista em mídia paga, desenvolvimento e infraestrutura de conversão. Atua na construção de landing pages, rastreamento e integrações.',
    instagram: 'flacora',
    image: '/img/negocios-servicos/team/flavio.jpg',
  },
  {
    name: 'Roberlei',
    role: 'Performance e Dados',
    bio: 'Especialista em gestão e otimização de campanhas, com foco em análise de dados, rastreamento e melhoria contínua da performance.',
    instagram: 'trafegocomroberlei',
    image: '/img/negocios-servicos/team/roberlei.jpg',
  },
] as const;

function revealVariants(reduceMotion: boolean): Variants {
  return {
    hidden: {
      opacity: 0,
      transform: reduceMotion ? 'none' : 'translateY(20px)',
    },
    visible: {
      opacity: 1,
      transform: 'translateY(0)',
      transition: {
        duration: reduceMotion ? 0.2 : 0.55,
        ease: [0.23, 1, 0.32, 1],
      },
    },
  };
}

const staggerContainer: Variants = {
  hidden: { opacity: 1 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

function trackContact() {
  const eventId =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `evt-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;

  if (typeof window !== 'undefined' && (window as any).fbq) {
    (window as any).fbq('track', 'Contact', {}, { eventID: eventId });
  }

  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', 'Contact', {
      event_category: 'Negócios e Serviços',
      event_label: 'Contact',
    });
    (window as any).gtag('event', 'conversion', {
      send_to: GOOGLE_ADS_CONVERSION_SEND_TO,
    });
  }

  if (typeof window !== 'undefined') {
    const fbp = document.cookie
      .split('; ')
      .find((row) => row.startsWith('_fbp='))
      ?.split('=')[1] || null;
    const fbc = document.cookie
      .split('; ')
      .find((row) => row.startsWith('_fbc='))
      ?.split('=')[1] || null;

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
    }).catch((error) => console.error('CAPI fetch error:', error));
  }
}

function DiagnosticButton({ inverse = false }: { inverse?: boolean }) {
  return (
    <a
      href={CONTACT_LINK}
      target="_blank"
      rel="noopener noreferrer"
      onClick={trackContact}
      className={
        inverse
          ? 'inline-flex min-h-14 w-full items-center justify-center rounded-[4px] bg-dacora-offwhite px-8 py-4 text-base font-bold text-dacora-primary transition-colors duration-200 hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-dacora-offwhite sm:w-auto'
          : 'inline-flex min-h-14 w-full items-center justify-center rounded-[4px] bg-dacora-primary px-8 py-4 text-base font-bold text-dacora-offwhite transition-colors duration-200 hover:bg-dacora-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-dacora-primary sm:w-auto'
      }
    >
      Quero meu diagnóstico →
    </a>
  );
}

export default function NegociosServicos() {
  const reduceMotion = useReducedMotion() ?? false;
  const reveal = revealVariants(reduceMotion);
  const [clientsPaused, setClientsPaused] = useState(false);

  return (
    <div className="min-h-screen overflow-x-hidden bg-dacora-offwhite font-sans text-dacora-dark selection:bg-dacora-primary selection:text-dacora-offwhite">
      <a
        href="#conteudo-principal"
        className="fixed left-4 top-4 z-[70] -translate-y-24 rounded-[4px] bg-dacora-offwhite px-4 py-3 font-bold text-dacora-primary shadow-lg transition-transform duration-200 focus:translate-y-0"
      >
        Ir para o conteúdo
      </a>

      <header className="absolute inset-x-0 top-0 z-50 px-6 py-6">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-6">
          <Link
            to="/"
            className="text-2xl font-bold tracking-tight text-dacora-offwhite transition-opacity duration-200 hover:opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-dacora-offwhite"
            aria-label="Dácora — página inicial"
          >
            DÁCORA
          </Link>

          <nav className="flex items-center gap-6" aria-label="Navegação da página">
            <a
              href="#servicos"
              className="hidden text-sm font-medium tracking-wide text-dacora-offwhite/80 transition-colors duration-200 hover:text-dacora-offwhite focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-dacora-offwhite md:inline"
            >
              Serviços
            </a>
            <a
              href="#equipe"
              className="hidden text-sm font-medium tracking-wide text-dacora-offwhite/80 transition-colors duration-200 hover:text-dacora-offwhite focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-dacora-offwhite md:inline"
            >
              Equipe
            </a>
            <a
              href={CONTACT_LINK}
              target="_blank"
              rel="noopener noreferrer"
              onClick={trackContact}
              className="rounded-[4px] bg-dacora-offwhite px-4 py-2.5 text-sm font-bold text-dacora-primary transition-colors duration-200 hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-dacora-offwhite sm:px-6"
            >
              <span className="sm:hidden">Diagnóstico</span>
              <span className="hidden sm:inline">Quero meu diagnóstico</span>
            </a>
          </nav>
        </div>
      </header>

      <main id="conteudo-principal">
        <section className="relative flex min-h-[90vh] items-center overflow-hidden bg-dacora-dark text-left lg:min-h-screen">
          <div className="pointer-events-none absolute inset-0" aria-hidden="true">
            <div
              className="absolute inset-0 opacity-[0.08]"
              style={{
                backgroundImage: 'radial-gradient(circle, #F2EFEB 1px, transparent 1px)',
                backgroundSize: '34px 34px',
              }}
            />
            <div className="absolute inset-y-0 right-0 hidden w-[42%] border-l border-dacora-offwhite/10 lg:block">
              <div className="absolute inset-x-[14%] top-[18%] h-[64%] border border-dacora-offwhite/12" />
              <div className="absolute left-[28%] top-[31%] h-[44%] w-[58%] border border-dacora-sage/25" />
              <div className="absolute left-[42%] top-[44%] h-[24%] w-[30%] bg-dacora-primary/70" />
              <div className="absolute left-[14%] top-1/2 h-px w-[72%] bg-dacora-offwhite/15" />
              <div className="absolute left-1/2 top-[18%] h-[64%] w-px bg-dacora-offwhite/15" />
              <div className="absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-dacora-offwhite" />
            </div>
            <div className="absolute bottom-0 left-0 h-px w-full bg-dacora-offwhite/10" />
          </div>

          <div className="relative z-10 mx-auto w-full max-w-7xl px-6 pb-24 pt-36 md:pt-32">
            <motion.div
              className="flex max-w-[760px] flex-col"
              initial="hidden"
              animate="visible"
              variants={staggerContainer}
            >
              <motion.p
                variants={reveal}
                className="mb-6 text-sm font-medium uppercase tracking-[0.2em] text-dacora-offwhite/80"
              >
                Tráfego pago com estratégia, não no escuro
              </motion.p>

              <motion.h1
                variants={reveal}
                className="max-w-[740px] text-balance text-4xl font-bold leading-[1.08] tracking-tight text-dacora-offwhite md:text-5xl lg:text-[3.75rem]"
              >
                Seu problema pode não ser falta de tráfego.
                <span className="mt-2 block font-light italic text-dacora-offwhite/82">
                  Pode estar no que acontece antes e depois do clique.
                </span>
              </motion.h1>

              <motion.p
                variants={reveal}
                className="mb-10 mt-8 max-w-[610px] text-pretty text-lg font-light leading-relaxed text-dacora-offwhite/90 md:text-xl"
              >
                Ajudamos <strong className="font-semibold text-dacora-offwhite">negócios de serviços</strong> a gerar oportunidades mais qualificadas, conectando mídia paga, presença digital e processo comercial.
              </motion.p>

              <motion.div variants={reveal}>
                <DiagnosticButton inverse />
              </motion.div>
            </motion.div>
          </div>
        </section>

        <section className="bg-dacora-primary px-6 py-24 text-dacora-offwhite md:py-32">
          <motion.div
            className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.95fr_1.05fr] lg:gap-20"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            variants={staggerContainer}
          >
            <motion.div variants={reveal}>
              <p className="mb-6 text-sm font-medium uppercase tracking-[0.2em] text-dacora-sage">
                Diferencial
              </p>
              <h2 className="text-balance text-3xl font-bold leading-[1.12] tracking-tight md:text-4xl lg:text-5xl">
                Não basta gerar clique. Você precisa saber o que acontece depois dele.
              </h2>
            </motion.div>

            <motion.div
              variants={reveal}
              className="self-end border-l border-dacora-offwhite/20 pl-6 text-lg font-light leading-relaxed text-dacora-offwhite/80 md:pl-8 md:text-xl"
            >
              <p>
                Antes de aumentar orçamento ou criar mais campanhas, olhamos para a jornada inteira: como o cliente encontra sua empresa, o que ele vê, onde entra em contato e o que acontece até a venda.
              </p>
              <p className="mt-6 text-dacora-offwhite">
                Porque tráfego pago não corrige sozinho uma oferta fraca, uma página que não converte ou um processo comercial desorganizado.
              </p>
            </motion.div>
          </motion.div>
        </section>

        <section className="bg-[#EBE7E1] px-6 py-24 md:py-32" aria-labelledby="metodo-title">
          <div className="mx-auto max-w-7xl">
            <motion.div
              className="mb-16 max-w-3xl lg:mb-24"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-80px' }}
              variants={staggerContainer}
            >
              <motion.p variants={reveal} className="mb-6 text-sm font-medium uppercase tracking-[0.2em] text-dacora-sage">
                Como funciona
              </motion.p>
              <motion.h2
                variants={reveal}
                id="metodo-title"
                className="scroll-mt-24 text-balance text-3xl font-bold tracking-tight text-dacora-primary md:text-4xl lg:text-5xl"
              >
                O método Dácora
              </motion.h2>
            </motion.div>

            <motion.div
              className="grid grid-cols-1 gap-12 md:grid-cols-3 lg:gap-16"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-80px' }}
              variants={staggerContainer}
            >
              {method.map((item) => (
                <motion.article key={item.num} variants={reveal} className="border-t border-dacora-sage/30 pt-6">
                  <span className="mb-6 block text-6xl font-bold tracking-tight text-dacora-primary md:text-7xl">
                    {item.num}
                  </span>
                  <h3 className="mb-4 text-xl font-bold text-dacora-dark lg:text-2xl">{item.title}</h3>
                  <p className="text-pretty text-base font-light leading-relaxed text-dacora-gray md:text-lg">
                    {item.text}
                  </p>
                </motion.article>
              ))}
            </motion.div>
          </div>
        </section>

        <section id="servicos" className="scroll-mt-20 bg-dacora-offwhite px-6 py-24 md:py-32" aria-labelledby="servicos-title">
          <div className="mx-auto max-w-7xl">
            <motion.div
              className="mb-16 max-w-3xl"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-80px' }}
              variants={staggerContainer}
            >
              <motion.p variants={reveal} className="mb-6 text-sm font-medium uppercase tracking-[0.2em] text-dacora-sage">
                O que fazemos
              </motion.p>
              <motion.h2
                variants={reveal}
                id="servicos-title"
                className="text-3xl font-bold tracking-tight text-dacora-primary md:text-4xl lg:text-5xl"
              >
                Serviços
              </motion.h2>
            </motion.div>

            <div className="border-t border-dacora-sage/25">
              {services.map((service, index) => (
                <motion.article
                  key={service.title}
                  className="grid gap-5 border-b border-dacora-sage/25 py-10 md:grid-cols-[72px_280px_1fr] md:items-start md:gap-8 lg:py-12"
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, margin: '-70px' }}
                  variants={reveal}
                >
                  <span className="text-sm font-bold tracking-[0.18em] text-dacora-sage">0{index + 1}</span>
                  <h3 className="text-2xl font-bold leading-tight text-dacora-dark">{service.title}</h3>
                  <p className="max-w-2xl text-pretty text-base font-light leading-relaxed text-dacora-gray md:text-lg">
                    {service.text}
                  </p>
                </motion.article>
              ))}
            </div>
          </div>
        </section>

        <section className="border-y border-dacora-sage/15 bg-white px-6 py-24 md:py-32" aria-labelledby="clientes-title">
          <div className="mx-auto max-w-7xl">
            <motion.div
              className="grid gap-10 lg:grid-cols-[1fr_auto] lg:items-end"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-80px' }}
              variants={staggerContainer}
            >
              <div className="max-w-3xl">
                <motion.p variants={reveal} className="mb-6 text-sm font-medium uppercase tracking-[0.2em] text-dacora-sage">
                  Quem já confia
                </motion.p>
                <motion.h2
                  variants={reveal}
                  id="clientes-title"
                  className="text-balance text-3xl font-bold leading-[1.12] tracking-tight text-dacora-primary md:text-4xl lg:text-5xl"
                >
                  Mais de 150 empresas já passaram pelo nosso processo.
                </motion.h2>
                <motion.p variants={reveal} className="mt-8 max-w-2xl text-pretty text-lg font-light leading-relaxed text-dacora-gray">
                  De negócios locais a empresas com operação nacional, nossa estratégia parte sempre do mesmo princípio: entender o negócio antes de decidir como anunciar.
                </motion.p>
              </div>

              <motion.button
                variants={reveal}
                type="button"
                onClick={() => setClientsPaused((paused) => !paused)}
                className="motion-reduce:hidden inline-flex min-h-12 items-center justify-center gap-2 rounded-[4px] border border-dacora-sage/30 px-4 text-sm font-semibold text-dacora-primary transition-[border-color,background-color] duration-200 hover:border-dacora-primary hover:bg-dacora-offwhite focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dacora-primary"
                aria-pressed={clientsPaused}
                aria-label={clientsPaused ? 'Continuar carrossel de clientes' : 'Pausar carrossel de clientes'}
              >
                {clientsPaused ? (
                  <Play className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
                ) : (
                  <Pause className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
                )}
                {clientsPaused ? 'Continuar' : 'Pausar'}
              </motion.button>
            </motion.div>

            <div
              className="mt-16 overflow-hidden motion-reduce:overflow-x-auto motion-reduce:pb-4"
              tabIndex={reduceMotion ? 0 : undefined}
              role="region"
              aria-label="Carrossel automático com logos de clientes"
            >
              <div
                className="dacora-client-marquee flex w-max"
                data-paused={clientsPaused ? 'true' : 'false'}
              >
                {[0, 1].map((groupIndex) => (
                  <div
                    key={groupIndex}
                    className="flex shrink-0 gap-4 pr-4"
                    aria-hidden={groupIndex === 1 ? true : undefined}
                  >
                    {logos.map((logo) => (
                      <div
                        key={`${groupIndex}-${logo.file}`}
                        className="flex h-32 min-w-[220px] items-center justify-center rounded-[4px] border border-dacora-sage/20 bg-dacora-offwhite px-8 md:h-36 md:min-w-[260px]"
                      >
                        <img
                          src={`/img/negocios-servicos/logos/${logo.file}`}
                          alt={groupIndex === 0 ? logo.alt : ''}
                          width={logo.width}
                          height={logo.height}
                          className="max-h-12 w-auto max-w-[170px] object-contain md:max-h-14 md:max-w-[190px]"
                          loading="lazy"
                          decoding="async"
                        />
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="equipe" className="scroll-mt-20 bg-[#EBE7E1] px-6 py-24 md:py-32" aria-labelledby="equipe-title">
          <div className="mx-auto max-w-7xl">
            <motion.div
              className="mb-16 max-w-3xl lg:mb-20"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-80px' }}
              variants={staggerContainer}
            >
              <motion.p variants={reveal} className="mb-6 text-sm font-medium uppercase tracking-[0.2em] text-dacora-sage">
                Quem está por trás
              </motion.p>
              <motion.h2
                variants={reveal}
                id="equipe-title"
                className="text-balance text-3xl font-bold tracking-tight text-dacora-primary md:text-4xl lg:text-5xl"
              >
                Uma equipe, três especialidades
              </motion.h2>
            </motion.div>

            <motion.div
              className="grid grid-cols-1 gap-12 md:grid-cols-3 lg:gap-10"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-80px' }}
              variants={staggerContainer}
            >
              {team.map((member) => (
                <motion.article key={member.instagram} variants={reveal} className="group">
                  <div className="mb-7 rounded-[4px] border border-dacora-sage/25 bg-dacora-offwhite p-2 md:p-3">
                    <div className="relative aspect-[4/5] overflow-hidden rounded-[2px] bg-dacora-dark">
                      <img
                        src={member.image}
                        alt={member.name}
                        width={640}
                        height={800}
                        className="h-full w-full object-cover"
                        loading="lazy"
                        decoding="async"
                      />
                      <div className="absolute inset-0 bg-dacora-primary/10 mix-blend-multiply" aria-hidden="true" />
                    </div>
                  </div>

                  <h3 className="text-2xl font-bold text-dacora-dark">{member.name}</h3>
                  <p className="mt-1 text-base font-medium italic text-dacora-primary">{member.role}</p>
                  <p className="mt-5 text-pretty text-base font-light leading-relaxed text-dacora-gray">{member.bio}</p>
                  <a
                    href={`https://www.instagram.com/${member.instagram}/`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-dacora-primary transition-colors duration-200 hover:text-dacora-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-dacora-primary"
                  >
                    <Instagram className="h-[18px] w-[18px]" strokeWidth={1.5} aria-hidden="true" />
                    @{member.instagram}
                  </a>
                </motion.article>
              ))}
            </motion.div>
          </div>
        </section>

        <section className="relative overflow-hidden bg-dacora-primary px-6 py-28 text-dacora-offwhite md:py-36">
          <div
            className="absolute inset-0 opacity-5"
            style={{ backgroundImage: 'radial-gradient(circle at 50% 50%, #F2EFEB 1px, transparent 1px)', backgroundSize: '40px 40px' }}
            aria-hidden="true"
          />
          <motion.div
            className="relative z-10 mx-auto max-w-4xl text-center"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            variants={staggerContainer}
          >
            <motion.p variants={reveal} className="mb-7 text-sm font-medium uppercase tracking-[0.2em] text-dacora-sage">
              Próximo passo
            </motion.p>
            <motion.h2
              variants={reveal}
              className="text-balance text-3xl font-bold leading-[1.1] tracking-tight md:text-5xl lg:text-6xl"
            >
              Antes de aumentar seu investimento em tráfego, vamos descobrir onde está a maior oportunidade de crescimento do seu negócio.
            </motion.h2>
            <motion.div variants={reveal} className="mt-10">
              <DiagnosticButton inverse />
            </motion.div>
          </motion.div>
        </section>
      </main>

      <footer className="border-t border-dacora-offwhite/10 bg-dacora-primary px-6 pb-12 pt-14 text-dacora-offwhite">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-12 border-b border-dacora-offwhite/10 pb-12 lg:grid-cols-[1fr_auto_auto] lg:gap-20">
            <div className="max-w-md">
              <Link
                to="/"
                className="text-2xl font-bold tracking-tight transition-opacity duration-200 hover:opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-dacora-offwhite"
              >
                DÁCORA
              </Link>
              <p className="mt-5 text-base font-light leading-relaxed text-dacora-offwhite/60">
                Tráfego pago com visão de negócio. Estratégia, mídia e processo comercial conectados.
              </p>
            </div>

            <div>
              <p className="mb-4 text-xs font-medium uppercase tracking-[0.18em] text-dacora-sage">Equipe</p>
              <div className="flex flex-col gap-2.5">
                {team.map((member) => (
                  <a
                    key={member.instagram}
                    href={`https://www.instagram.com/${member.instagram}/`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-dacora-offwhite/70 transition-colors duration-200 hover:text-dacora-offwhite focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dacora-offwhite"
                  >
                    @{member.instagram}
                  </a>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-4 text-xs font-medium uppercase tracking-[0.18em] text-dacora-sage">Contato</p>
              <div className="flex flex-col gap-2.5">
                <a
                  href={CONTACT_LINK}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={trackContact}
                  className="text-sm text-dacora-offwhite/70 transition-colors duration-200 hover:text-dacora-offwhite focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dacora-offwhite"
                >
                  WhatsApp
                </a>
                <a
                  href={GOOGLE_LINK}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-dacora-offwhite/70 transition-colors duration-200 hover:text-dacora-offwhite focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dacora-offwhite"
                >
                  Ver no Google
                </a>
                <Link
                  to="/politica-de-privacidade"
                  className="text-sm text-dacora-offwhite/70 transition-colors duration-200 hover:text-dacora-offwhite focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dacora-offwhite"
                >
                  Política de Privacidade
                </Link>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 pt-8 text-xs font-light tracking-wide text-dacora-offwhite/45 sm:flex-row sm:items-center sm:justify-between">
            <span>© 2026 Dácora</span>
            <span>Diagnóstico → Processo → Otimização</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
