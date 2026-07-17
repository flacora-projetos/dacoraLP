import { motion } from 'motion/react';
import { CheckCircle2, Instagram, ChevronDown } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import fernandaFaceClose from '../assets/images/proposta-landing-page/fernanda-face-close.webp';
import fernandaCaneca from '../assets/images/proposta-landing-page/fernanda-caneca.webp';
import fernandaCelular from '../assets/images/proposta-landing-page/fernanda-celular.webp';
import fernandaNotebook from '../assets/images/proposta-landing-page/fernanda-notebook.webp';

const CONTACT_LINK = 'https://wa.me/556296242626?text=Ol%C3%A1%21+Vi+a+proposta+de+landing+pages+da+D%C3%A1cora+e+gostaria+de+conversar+sobre+meu+projeto.';

const trackEvent = (eventName: string) => {
  const generateEventId = () => {
    return typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : 'evt-' + Date.now() + '-' + Math.random().toString(36).substring(2, 11);
  };
  
  const eventId = generateEventId();

  // 1. Pixel no front-end
  if (typeof window !== 'undefined' && (window as any).fbq) {
    (window as any).fbq('trackCustom', eventName, {}, { eventID: eventId });
  }

  // 2. Conversions API no server-side
  if (typeof window !== 'undefined') {
    const fbp = document.cookie.split('; ').find(row => row.startsWith('_fbp='))?.split('=')[1] || null;
    const fbc = document.cookie.split('; ').find(row => row.startsWith('_fbc='))?.split('=')[1] || null;

    fetch('/api/meta-capi', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventName: eventName,
        eventId: eventId,
        eventUrl: window.location.href,
        userAgent: navigator.userAgent,
        fbp,
        fbc
      })
    }).catch(err => console.error('CAPI fetch error:', err));
  }
};

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2,
    },
  },
};

const WhatsAppIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    className="w-6 h-6 lg:w-7 lg:h-7"
  >
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
  </svg>
);

const FaqItem = ({ question, answer, eventName }: { question: string, answer: string, eventName?: string }) => {
  const [isOpen, setIsOpen] = useState(false);

  const toggle = () => {
    const newState = !isOpen;
    setIsOpen(newState);
    if (newState && eventName) {
      trackEvent(eventName);
    }
  };

  return (
    <div className="border-b border-dacora-sage/30 py-6">
      <button
        onClick={toggle}
        className="w-full flex justify-between items-center text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-dacora-primary rounded-sm"
        aria-expanded={isOpen}
      >
        <span className="text-lg md:text-xl font-medium text-dacora-dark pr-8">{question}</span>
        <ChevronDown 
          className={`w-6 h-6 text-dacora-primary shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>
      <div 
        className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-96 opacity-100 mt-4' : 'max-h-0 opacity-0'}`}
        aria-hidden={!isOpen}
      >
        <p className="text-dacora-gray font-light text-base md:text-lg leading-relaxed">
          {answer}
        </p>
      </div>
    </div>
  );
};

export default function PropostaLandingPage() {
  useEffect(() => {
    // SEO metadata
    document.title = "Criação de Landing Pages que Convertem | Dácora";
    
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.setAttribute('name', 'description');
      document.head.appendChild(metaDesc);
    }
    metaDesc.setAttribute('content', 'Landing pages personalizadas com estratégia, copy, design, WhatsApp, mensuração e qualificação de leads. Conheça as opções da Dácora.');
    
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', 'https://dacora.com.br/proposta-landing-page');

    // Schema
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.id = 'schema-landing-page';
    script.innerHTML = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Service",
      "serviceType": "Criação de Landing Pages",
      "provider": {
        "@type": "Organization",
        "name": "Dácora Performance Digital",
        "url": "https://dacora.com.br"
      }
    });
    document.head.appendChild(script);

    // Track page view
    trackEvent('ViewLandingPageProposal');

    return () => {
      // Cleanup schema on unmount if needed
      const existingScript = document.getElementById('schema-landing-page');
      if (existingScript) existingScript.remove();
    };
  }, []);

  return (
    <div className="min-h-screen bg-dacora-offwhite text-dacora-dark font-sans selection:bg-dacora-primary selection:text-dacora-offwhite">
      {/* 
        -------------------------------------------
        HEADER
        -------------------------------------------
      */}
      <header className="absolute top-0 w-full z-50 py-6 px-6">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <Link to="/" className="text-dacora-offwhite font-bold text-2xl tracking-tight">
            DÁCORA
          </Link>
          <div className="hidden md:flex items-center gap-8">
            <a href="#como-funciona" className="text-sm font-medium tracking-wide text-dacora-offwhite/80 hover:text-dacora-offwhite transition-colors">Como funciona</a>
            <a href="#opcoes" className="text-sm font-medium tracking-wide text-dacora-offwhite/80 hover:text-dacora-offwhite transition-colors">Opções</a>
            <a href="#duvidas" className="text-sm font-medium tracking-wide text-dacora-offwhite/80 hover:text-dacora-offwhite transition-colors">Dúvidas</a>
            <a 
              href={CONTACT_LINK} 
              target="_blank" 
              rel="noopener noreferrer"
              onClick={() => trackEvent('ClickHeroWhatsApp')}
              className="text-sm font-bold tracking-wide text-dacora-primary bg-dacora-offwhite px-6 py-2.5 rounded-[4px] hover:bg-white transition-colors"
            >
              Solicitar proposta
            </a>
          </div>
        </div>
      </header>

      {/* 
        -------------------------------------------
        SEÇÃO 1 — HERO
        -------------------------------------------
      */}
      <section className="relative min-h-[85vh] lg:min-h-screen flex text-left items-center justify-center overflow-hidden w-full bg-dacora-dark">
        <div className="absolute inset-0 z-0">
          <img
            src={fernandaFaceClose}
            alt="Fernanda Corá"
            className="w-full h-full object-cover object-[center_30%] md:object-[60%_25%]"
            fetchPriority="high"
          />
          {/* General overlay */}
          <div className="absolute inset-0 bg-dacora-dark/40 pointer-events-none"></div>
          {/* Left side text protection mask */}
          <div className="absolute inset-0 bg-gradient-to-r from-dacora-dark/95 via-dacora-dark/75 to-transparent w-full md:w-3/4 lg:w-2/3 pointer-events-none"></div>
        </div>

        <div className="relative z-10 w-full max-w-7xl mx-auto px-6 py-24 mt-12 md:mt-0 pt-32">
          <motion.div 
            className="w-full flex flex-col"
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
          >
            <motion.div variants={fadeInUp}>
              <span className="inline-block uppercase tracking-[0.2em] text-sm font-medium text-dacora-offwhite/80 mb-6">
                LANDING PAGES ESTRATÉGICAS
              </span>
            </motion.div>
            
            <motion.h1 
              variants={fadeInUp}
              className="text-4xl md:text-5xl lg:text-[3.5rem] font-bold text-dacora-offwhite leading-[1.15] mb-8 tracking-tight max-w-[650px]"
            >
              Uma página bonita chama atenção.<br className="hidden md:block" /> Uma página bem planejada<br className="hidden md:block" /> transforma interesse em contato.
            </motion.h1>
            
            <motion.p 
              variants={fadeInUp}
              className="text-lg md:text-xl lg:text-[1.35rem] text-dacora-offwhite/90 font-light mb-10 max-w-[580px] leading-relaxed"
            >
              Criamos landing pages personalizadas para apresentar sua oferta com clareza, conduzir o visitante até a ação e gerar oportunidades reais para o seu negócio.
            </motion.p>
            
            <motion.p 
              variants={fadeInUp}
              className="text-base text-dacora-offwhite/70 font-medium italic mb-10 max-w-[580px]"
            >
              Estratégia, copy, design, desenvolvimento e mensuração reunidos em uma única entrega.
            </motion.p>
            
            <motion.div variants={fadeInUp} className="flex flex-col items-start gap-4">
              <a
                href={CONTACT_LINK}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackEvent('ClickHeroWhatsApp')}
                className="inline-flex items-center justify-center px-10 py-[1.125rem] bg-dacora-offwhite text-dacora-primary font-bold text-lg rounded-[4px] hover:bg-white hover:scale-[1.02] transition-all duration-300 w-full sm:w-auto"
              >
                Quero uma landing page que converte →
              </a>
              <span className="text-sm text-dacora-offwhite/60 font-light tracking-wide">
                Atendimento personalizado para empresas e profissionais.
              </span>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* 
        -------------------------------------------
        SEÇÃO 2 — O PROBLEMA
        -------------------------------------------
      */}
      <section className="py-24 lg:py-32 px-6">
        <motion.div 
          className="max-w-4xl mx-auto text-center lg:text-left"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          variants={staggerContainer}
        >
          <motion.div variants={fadeInUp}>
            <span className="inline-block uppercase tracking-[0.2em] text-sm font-medium text-dacora-sage mb-6">
              MAIS DO QUE PRESENÇA DIGITAL
            </span>
          </motion.div>
          
          <motion.h2 
            variants={fadeInUp}
            className="text-3xl md:text-4xl lg:text-[2.75rem] font-bold text-dacora-primary mb-12 leading-[1.15] tracking-tight"
          >
            Ter uma página no ar não significa ter uma página preparada para vender.
          </motion.h2>

          <motion.div variants={fadeInUp} className="text-lg md:text-xl text-dacora-gray font-light leading-relaxed space-y-6 max-w-3xl">
            <p>
              Muitas páginas apresentam informações, mas não ajudam o visitante a entender por que deveria escolher aquela empresa, qual é o próximo passo ou o que acontece depois do clique.
            </p>
            <p>
              Quando a oferta está confusa, a navegação é ruim no celular ou o contato chega ao WhatsApp sem contexto, parte do investimento em divulgação se perde antes mesmo do atendimento começar.
            </p>
          </motion.div>

          <motion.div variants={fadeInUp} className="mt-16 border-l-2 border-dacora-primary pl-6 lg:pl-8">
            <p className="text-2xl md:text-3xl font-medium text-dacora-dark leading-tight italic">
              A landing page não deve ser apenas o destino do anúncio. Ela deve continuar a venda.
            </p>
          </motion.div>
        </motion.div>
      </section>

      {/* 
        -------------------------------------------
        SEÇÃO 3 — ESTRATÉGIA
        -------------------------------------------
      */}
      <section className="py-24 lg:py-32 px-6 bg-[#EBE7E1]">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row-reverse items-center gap-16 lg:gap-20">
          <motion.div 
            className="w-full lg:w-1/2"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            variants={staggerContainer}
          >
            <motion.div variants={fadeInUp}>
              <span className="inline-block uppercase tracking-[0.2em] text-sm font-medium text-dacora-sage mb-6">
                ANTES DO DESIGN
              </span>
            </motion.div>
            
            <motion.h2 
              variants={fadeInUp}
              className="text-3xl md:text-4xl lg:text-[2.75rem] font-bold text-dacora-primary mb-8 leading-[1.15] tracking-tight"
            >
              A página começa pelo entendimento do seu negócio.
            </motion.h2>
            
            <motion.div variants={fadeInUp} className="text-lg text-dacora-gray font-light leading-relaxed space-y-6 mb-10">
              <p>
                Antes de definir cores, blocos e botões, organizamos a oferta, os diferenciais, o público e a ação que o visitante precisa realizar.
              </p>
              <p>
                Isso permite construir uma página coerente com o posicionamento da empresa e com a jornada de quem chega pelos anúncios, pelo Instagram, pelo Google ou por uma indicação.
              </p>
            </motion.div>

            <motion.ol variants={fadeInUp} className="list-decimal list-inside text-lg text-dacora-dark font-medium space-y-3 mb-10">
              <li>Clareza da oferta;</li>
              <li>Hierarquia das informações;</li>
              <li>Argumentos comerciais;</li>
              <li>Redução de objeções;</li>
              <li>Caminho até o contato.</li>
            </motion.ol>

            <motion.div variants={fadeInUp}>
              <p className="text-xl font-bold text-dacora-primary">
                Design sem estratégia decora. Estratégia bem apresentada conduz.
              </p>
            </motion.div>
          </motion.div>

          <motion.div 
            className="w-full lg:w-1/2 flex justify-start"
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.8 }}
          >
            <div className="relative w-full max-w-[500px] aspect-square rounded-[4px] overflow-hidden">
              <img
                src={fernandaCaneca}
                alt="Estratégia e planejamento"
                className="w-full h-full object-cover object-center"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-dacora-primary/5 mix-blend-multiply pointer-events-none"></div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* 
        -------------------------------------------
        SEÇÃO 4 — COMO FUNCIONA
        -------------------------------------------
      */}
      <section id="como-funciona" className="py-24 lg:py-32 px-6">
        <div className="max-w-7xl mx-auto">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mb-16 lg:mb-24"
          >
            <span className="inline-block uppercase tracking-[0.2em] text-sm font-medium text-dacora-sage mb-6 block text-center lg:text-left">
              PROCESSO
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-dacora-primary text-center lg:text-left">
              Da ideia à página publicada.
            </h2>
          </motion.div>

          <motion.div 
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12 lg:gap-16"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-50px' }}
            variants={staggerContainer}
          >
            {[
              {
                num: "01",
                title: "Diagnóstico e briefing",
                desc: "Entendemos o negócio, o público, a oferta, os diferenciais, os objetivos da página e a origem prevista dos acessos."
              },
              {
                num: "02",
                title: "Estrutura e copy",
                desc: "Organizamos a sequência das seções e escrevemos os textos para apresentar a oferta, responder objeções e conduzir o visitante até a ação."
              },
              {
                num: "03",
                title: "Direção visual e desenvolvimento",
                desc: "Criamos uma experiência personalizada, responsiva e alinhada ao posicionamento da marca, sem depender de um template genérico."
              },
              {
                num: "04",
                title: "Integrações e mensuração",
                desc: "Configuramos os recursos previstos no plano, como WhatsApp, Meta Pixel, eventos, planilha de leads, UTMs e API de Conversões."
              },
              {
                num: "05",
                title: "Testes e publicação",
                desc: "Validamos a página em celular e computador, revisamos os fluxos e publicamos no domínio definido para o projeto."
              }
            ].map((step, idx) => (
              <motion.div key={idx} variants={fadeInUp} className="flex flex-col pt-6 border-t border-dacora-sage/20">
                <span className="text-4xl lg:text-5xl font-bold text-dacora-primary/20 mb-4 block tracking-tight">
                  {step.num}.
                </span>
                <h3 className="text-xl lg:text-2xl font-bold text-dacora-dark mb-4">
                  {step.title}
                </h3>
                <p className="text-dacora-gray font-light text-base leading-relaxed">
                  {step.desc}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* 
        -------------------------------------------
        SEÇÃO 5 — MOBILE E WHATSAPP
        -------------------------------------------
      */}
      <section className="py-24 lg:py-32 px-6 bg-dacora-primary text-dacora-offwhite">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-16 lg:gap-20">
          <motion.div 
            className="w-full lg:w-1/2"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            variants={staggerContainer}
          >
            <motion.div variants={fadeInUp}>
              <span className="inline-block uppercase tracking-[0.2em] text-sm font-medium text-dacora-sage mb-6">
                PENSADA PARA O USO REAL
              </span>
            </motion.div>
            
            <motion.h2 
              variants={fadeInUp}
              className="text-3xl md:text-4xl lg:text-[2.75rem] font-bold mb-8 leading-[1.15] tracking-tight"
            >
              Seu cliente provavelmente vai conhecer sua oferta pelo celular.
            </motion.h2>
            
            <motion.div variants={fadeInUp} className="text-lg text-dacora-offwhite/80 font-light leading-relaxed space-y-6 mb-10">
              <p>
                Por isso, a experiência mobile não será uma adaptação feita no final. Ela será considerada desde o início da estrutura.
              </p>
              <p>
                Textos, botões, imagens, formulários e contato pelo WhatsApp serão organizados para facilitar a leitura e reduzir atritos no caminho até a conversa.
              </p>
            </motion.div>

            <motion.ul variants={fadeInUp} className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-dacora-offwhite font-medium mb-12">
              {[
                "carregamento otimizado",
                "leitura confortável",
                "botões fáceis de tocar",
                "CTA visível",
                "formulários simples",
                "mensagem de WhatsApp com contexto"
              ].map((item, idx) => (
                <li key={idx} className="flex items-center gap-3">
                  <span className="w-1.5 h-1.5 bg-dacora-sage rounded-full shrink-0"></span>
                  {item}
                </li>
              ))}
            </motion.ul>

            <motion.div variants={fadeInUp} className="border-l-2 border-dacora-sage pl-6">
              <p className="text-xl md:text-2xl font-medium text-dacora-offwhite italic">
                Menos esforço para navegar. Mais clareza para decidir.
              </p>
            </motion.div>
          </motion.div>

          <motion.div 
            className="w-full lg:w-1/2 flex justify-center"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.8 }}
          >
            <div className="relative w-full max-w-[400px] aspect-[4/5] rounded-[4px] overflow-hidden">
              <img
                src={fernandaCelular}
                alt="Uso no celular"
                className="w-full h-full object-cover object-center"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-dacora-dark/20 mix-blend-multiply pointer-events-none"></div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* 
        -------------------------------------------
        SEÇÃO 6 — DUAS FORMAS DE ENTREGA
        -------------------------------------------
      */}
      <section id="opcoes" className="py-24 lg:py-32 px-6">
        <div className="max-w-7xl mx-auto">
          <motion.div 
            className="text-center max-w-3xl mx-auto mb-20"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            variants={staggerContainer}
          >
            <motion.div variants={fadeInUp}>
              <span className="inline-block uppercase tracking-[0.2em] text-sm font-medium text-dacora-sage mb-6">
                ESCOLHA A ESTRUTURA
              </span>
            </motion.div>
            <motion.h2 
              variants={fadeInUp}
              className="text-3xl md:text-4xl lg:text-5xl font-bold text-dacora-primary mb-6"
            >
              Uma solução para apresentar. Outra para apresentar, qualificar e medir.
            </motion.h2>
            <motion.p variants={fadeInUp} className="text-lg text-dacora-gray font-light">
              A estrutura ideal depende do objetivo da página e da complexidade da jornada comercial.
            </motion.p>
          </motion.div>

          <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 items-stretch">
            {/* Opção 1 */}
            <motion.div 
              className="flex-1 flex flex-col bg-white border border-dacora-sage/20 p-8 md:p-10 rounded-[4px] shadow-sm relative"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <h3 className="text-2xl font-bold text-dacora-dark mb-4">OPÇÃO 1 — LANDING PAGE ESSENCIAL</h3>
              <div className="mb-6">
                <span className="text-3xl font-bold text-dacora-primary">A partir de R$ 1.800</span>
              </div>
              <p className="text-dacora-gray font-light mb-8 pb-8 border-b border-dacora-sage/20">
                Indicada para apresentar a empresa, fortalecer o posicionamento da marca e direcionar os interessados para o WhatsApp.
              </p>
              
              <ul className="flex-1 space-y-4 text-base font-light text-dacora-dark mb-10">
                <li className="flex gap-3"><CheckCircle2 className="w-5 h-5 text-dacora-sage shrink-0" strokeWidth={1.5} />landing page personalizada</li>
                <li className="flex gap-3"><CheckCircle2 className="w-5 h-5 text-dacora-sage shrink-0" strokeWidth={1.5} />versão responsiva para celular e computador</li>
                <li className="flex gap-3"><CheckCircle2 className="w-5 h-5 text-dacora-sage shrink-0" strokeWidth={1.5} />estrutura visual alinhada à marca</li>
                <li className="flex gap-3"><CheckCircle2 className="w-5 h-5 text-dacora-sage shrink-0" strokeWidth={1.5} />organização das seções com foco comercial</li>
                <li className="flex gap-3"><CheckCircle2 className="w-5 h-5 text-dacora-sage shrink-0" strokeWidth={1.5} />copy e hierarquia de conteúdo</li>
                <li className="flex gap-3"><CheckCircle2 className="w-5 h-5 text-dacora-sage shrink-0" strokeWidth={1.5} />apresentação de serviços, produtos e diferenciais</li>
                <li className="flex gap-3"><CheckCircle2 className="w-5 h-5 text-dacora-sage shrink-0" strokeWidth={1.5} />galeria de imagens, quando necessária</li>
                <li className="flex gap-3"><CheckCircle2 className="w-5 h-5 text-dacora-sage shrink-0" strokeWidth={1.5} />botões estratégicos para o WhatsApp</li>
                <li className="flex gap-3"><CheckCircle2 className="w-5 h-5 text-dacora-sage shrink-0" strokeWidth={1.5} />instalação do Meta Pixel</li>
                <li className="flex gap-3"><CheckCircle2 className="w-5 h-5 text-dacora-sage shrink-0" strokeWidth={1.5} />configuração dos principais eventos de clique e contato</li>
                <li className="flex gap-3"><CheckCircle2 className="w-5 h-5 text-dacora-sage shrink-0" strokeWidth={1.5} />publicação do código no GitHub da empresa</li>
                <li className="flex gap-3"><CheckCircle2 className="w-5 h-5 text-dacora-sage shrink-0" strokeWidth={1.5} />configuração do domínio disponível</li>
                <li className="flex gap-3"><CheckCircle2 className="w-5 h-5 text-dacora-sage shrink-0" strokeWidth={1.5} />testes finais de funcionamento e responsividade</li>
              </ul>

              <div className="bg-[#EBE7E1] p-6 rounded-[4px] mb-8">
                <span className="block text-sm font-bold tracking-wide uppercase text-dacora-primary mb-2">Ideal para:</span>
                <p className="text-dacora-dark font-medium text-sm">Empresas que precisam apresentar bem sua oferta e conduzir o visitante diretamente ao atendimento.</p>
              </div>

              <p className="text-sm text-dacora-gray font-light italic mb-8">
                Não inclui filtro de qualificação, planilha automática de leads ou API de Conversões.
              </p>

              <a
                href={CONTACT_LINK}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackEvent('ClickEssentialPlan')}
                className="block text-center px-8 py-4 bg-dacora-offwhite text-dacora-primary border border-dacora-primary font-bold text-lg rounded-[4px] hover:bg-dacora-primary hover:text-dacora-offwhite hover:scale-[1.02] transition-all duration-300"
              >
                Quero a opção Essencial
              </a>
            </motion.div>

            {/* Opção 2 */}
            <motion.div 
              className="flex-1 flex flex-col bg-dacora-primary text-dacora-offwhite p-8 md:p-10 rounded-[4px] shadow-lg relative"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <div className="absolute top-0 right-8 -translate-y-1/2">
                <span className="bg-[#EBE7E1] text-dacora-primary text-xs font-bold px-3 py-1 uppercase tracking-wider rounded-[2px] shadow-sm">
                  MAIS COMPLETA
                </span>
              </div>
              <h3 className="text-2xl font-bold mb-4">OPÇÃO 2 — LANDING PAGE COMPLETA COM QUALIFICAÇÃO</h3>
              <div className="mb-6">
                <span className="text-3xl font-bold">A partir de R$ 2.500</span>
              </div>
              <p className="text-dacora-offwhite/80 font-light mb-8 pb-8 border-b border-dacora-offwhite/20">
                Indicada para campanhas de anúncios e negócios que precisam receber contatos mais organizados antes do atendimento.
              </p>
              
              <div className="mb-6 text-sm font-medium italic text-dacora-sage">Inclui tudo da opção Essencial, mais:</div>
              <ul className="flex-1 space-y-4 text-base font-light mb-10">
                <li className="flex gap-3"><CheckCircle2 className="w-5 h-5 text-dacora-sage shrink-0" strokeWidth={1.5} />filtro personalizado de qualificação</li>
                <li className="flex gap-3"><CheckCircle2 className="w-5 h-5 text-dacora-sage shrink-0" strokeWidth={1.5} />perguntas estratégicas adaptadas ao negócio</li>
                <li className="flex gap-3"><CheckCircle2 className="w-5 h-5 text-dacora-sage shrink-0" strokeWidth={1.5} />coleta de informações importantes antes do WhatsApp</li>
                <li className="flex gap-3"><CheckCircle2 className="w-5 h-5 text-dacora-sage shrink-0" strokeWidth={1.5} />mensagem pré-preenchida com as respostas do lead</li>
                <li className="flex gap-3"><CheckCircle2 className="w-5 h-5 text-dacora-sage shrink-0" strokeWidth={1.5} />registro automático em planilha</li>
                <li className="flex gap-3"><CheckCircle2 className="w-5 h-5 text-dacora-sage shrink-0" strokeWidth={1.5} />identificação da origem por UTMs</li>
                <li className="flex gap-3"><CheckCircle2 className="w-5 h-5 text-dacora-sage shrink-0" strokeWidth={1.5} />eventos personalizados para cada etapa do funil</li>
                <li className="flex gap-3"><CheckCircle2 className="w-5 h-5 text-dacora-sage shrink-0" strokeWidth={1.5} />evento de lead qualificado</li>
                <li className="flex gap-3"><CheckCircle2 className="w-5 h-5 text-dacora-sage shrink-0" strokeWidth={1.5} />Meta Pixel integrado à API de Conversões</li>
                <li className="flex gap-3"><CheckCircle2 className="w-5 h-5 text-dacora-sage shrink-0" strokeWidth={1.5} />deduplicação de eventos</li>
                <li className="flex gap-3"><CheckCircle2 className="w-5 h-5 text-dacora-sage shrink-0" strokeWidth={1.5} />testes completos do filtro, planilha, WhatsApp, Pixel e API</li>
              </ul>

              <div className="bg-[#0D1F18] p-6 rounded-[4px] mb-8">
                <span className="block text-sm font-bold tracking-wide uppercase text-dacora-sage mb-2">Ideal para:</span>
                <p className="font-medium text-sm mb-4">Empresas que anunciam, recebem volume de contatos e precisam identificar melhor quem chegou, o que procura e de onde veio.</p>
                <p className="text-xs text-dacora-offwhite/60 italic">Na prática, o atendimento recebe mais contexto e as campanhas passam a contar com sinais mais confiáveis sobre os contatos gerados.</p>
              </div>

              <a
                href={CONTACT_LINK}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackEvent('ClickCompletePlan')}
                className="block text-center px-8 py-4 bg-dacora-offwhite text-dacora-primary font-bold text-lg rounded-[4px] hover:bg-white hover:scale-[1.02] transition-all duration-300"
              >
                Quero a opção Completa
              </a>
            </motion.div>
          </div>
          
          <p className="text-center text-sm text-dacora-gray font-light mt-12 max-w-3xl mx-auto">
            Os valores são referências iniciais. O investimento final pode variar conforme quantidade de conteúdo, integrações, funcionalidades e necessidades específicas do projeto.
          </p>
        </div>
      </section>

      {/* 
        -------------------------------------------
        SEÇÃO 7 — MENSURAÇÃO E ESTRUTURA TÉCNICA
        -------------------------------------------
      */}
      <section className="py-24 lg:py-32 px-6 bg-[#EBE7E1]">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-16 lg:gap-20">
          <motion.div 
            className="w-full lg:w-1/2"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            variants={staggerContainer}
          >
            <motion.div variants={fadeInUp}>
              <span className="inline-block uppercase tracking-[0.2em] text-sm font-medium text-dacora-sage mb-6">
                O QUE ACONTECE DEPOIS DO CLIQUE
              </span>
            </motion.div>
            
            <motion.h2 
              variants={fadeInUp}
              className="text-3xl md:text-4xl lg:text-[2.75rem] font-bold text-dacora-primary mb-8 leading-[1.15] tracking-tight"
            >
              Uma página profissional também precisa produzir informação útil.
            </motion.h2>
            
            <motion.div variants={fadeInUp} className="text-lg text-dacora-gray font-light leading-relaxed mb-12">
              <p>
                Quando a estrutura de mensuração está bem configurada, é possível acompanhar ações importantes, entender a origem dos contatos e melhorar as campanhas com base no comportamento real dos visitantes.
              </p>
            </motion.div>

            <motion.div variants={staggerContainer} className="space-y-6">
              <motion.div variants={fadeInUp}>
                <h3 className="text-xl font-bold text-dacora-dark mb-2">Meta Pixel</h3>
                <p className="text-dacora-gray font-light">Registra ações importantes realizadas na página, como cliques e contatos.</p>
              </motion.div>
              <motion.div variants={fadeInUp}>
                <h3 className="text-xl font-bold text-dacora-dark mb-2">UTMs</h3>
                <p className="text-dacora-gray font-light">Identificam de qual campanha, anúncio ou canal o visitante veio.</p>
              </motion.div>
              <motion.div variants={fadeInUp}>
                <h3 className="text-xl font-bold text-dacora-dark mb-2">API de Conversões</h3>
                <p className="text-dacora-gray font-light">Envia eventos ao Meta por uma integração adicional, ajudando a tornar a mensuração mais confiável.</p>
              </motion.div>
              <motion.div variants={fadeInUp}>
                <h3 className="text-xl font-bold text-dacora-dark mb-2">Planilha de leads</h3>
                <p className="text-dacora-gray font-light">Organiza automaticamente os contatos e as informações coletadas no filtro.</p>
              </motion.div>
              <motion.div variants={fadeInUp}>
                <h3 className="text-xl font-bold text-dacora-dark mb-2">Deduplicação</h3>
                <p className="text-dacora-gray font-light">Evita que o mesmo evento seja contado duas vezes quando navegador e servidor enviam o mesmo sinal.</p>
              </motion.div>
            </motion.div>

            <motion.div variants={fadeInUp} className="mt-8 text-sm italic text-dacora-sage">
              Nota: Os recursos utilizados dependem da opção contratada e das necessidades do projeto.
            </motion.div>
          </motion.div>

          <motion.div 
            className="w-full lg:w-1/2 flex justify-center"
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.8 }}
          >
            <div className="relative w-full max-w-[500px] aspect-[4/3] rounded-[4px] overflow-hidden">
              <img
                src={fernandaNotebook}
                alt="Estrutura técnica e mensuração"
                className="w-full h-full object-cover object-center"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-dacora-primary/5 mix-blend-multiply pointer-events-none"></div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* 
        -------------------------------------------
        SEÇÃO 8 — HOSPEDAGEM, DOMÍNIO E PROPRIEDADE
        -------------------------------------------
      */}
      <section className="py-24 lg:py-32 px-6">
        <motion.div 
          className="max-w-4xl mx-auto text-center"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          variants={staggerContainer}
        >
          <motion.div variants={fadeInUp}>
            <span className="inline-block uppercase tracking-[0.2em] text-sm font-medium text-dacora-sage mb-6">
              SEM AMARRAS DESNECESSÁRIAS
            </span>
          </motion.div>
          
          <motion.h2 
            variants={fadeInUp}
            className="text-3xl md:text-4xl lg:text-[2.75rem] font-bold text-dacora-primary mb-12 leading-[1.15] tracking-tight"
          >
            O projeto continua sendo da empresa que contratou.
          </motion.h2>

          <motion.div variants={fadeInUp} className="text-lg text-dacora-gray font-light leading-relaxed space-y-6 mb-12 text-left md:text-center">
            <p>
              O código será publicado no GitHub da própria empresa, permitindo que ela mantenha acesso à estrutura desenvolvida.
            </p>
            <p>
              A página poderá ser publicada em uma plataforma compatível com plano gratuito, desde que o projeto permaneça dentro dos limites oferecidos pelo serviço. O domínio será contratado diretamente pela empresa, caso ainda não esteja disponível.
            </p>
          </motion.div>

          <motion.ul variants={fadeInUp} className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 text-left text-dacora-dark font-medium max-w-3xl mx-auto mb-16">
            <li className="flex items-start gap-3"><CheckCircle2 className="w-5 h-5 text-dacora-sage mt-0.5 shrink-0" strokeWidth={1.5} /> não há mensalidade obrigatória de manutenção</li>
            <li className="flex items-start gap-3"><CheckCircle2 className="w-5 h-5 text-dacora-sage mt-0.5 shrink-0" strokeWidth={1.5} /> alterações futuras podem ser orçadas separadamente</li>
            <li className="flex items-start gap-3"><CheckCircle2 className="w-5 h-5 text-dacora-sage mt-0.5 shrink-0" strokeWidth={1.5} /> a empresa pode continuar com a Dácora ou contratar outro profissional</li>
            <li className="flex items-start gap-3"><CheckCircle2 className="w-5 h-5 text-dacora-sage mt-0.5 shrink-0" strokeWidth={1.5} /> eventual plano pago de hospedagem será contratado diretamente pela empresa</li>
            <li className="flex items-start gap-3 md:col-span-2"><CheckCircle2 className="w-5 h-5 text-dacora-sage mt-0.5 shrink-0" strokeWidth={1.5} /> novas páginas, seções ou integrações não previstas serão orçadas à parte</li>
          </motion.ul>

          <motion.div variants={fadeInUp} className="inline-block px-8 py-5 bg-[#EBE7E1] rounded-[4px]">
            <p className="text-xl font-bold text-dacora-primary">
              Você não fica preso a uma hospedagem proprietária nem perde acesso ao código do projeto.
            </p>
          </motion.div>
        </motion.div>
      </section>

      {/* 
        -------------------------------------------
        SEÇÃO 9 — QUEM ESTÁ POR TRÁS
        -------------------------------------------
      */}
      <section className="py-24 lg:py-32 px-6 bg-dacora-primary text-dacora-offwhite">
        <div className="max-w-7xl mx-auto">
          <motion.div 
            className="text-center max-w-3xl mx-auto mb-20"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            variants={staggerContainer}
          >
            <motion.div variants={fadeInUp}>
              <span className="inline-block uppercase tracking-[0.2em] text-sm font-medium text-dacora-sage mb-6">
                ESTRATÉGIA E EXECUÇÃO
              </span>
            </motion.div>
            <motion.h2 
              variants={fadeInUp}
              className="text-3xl md:text-4xl lg:text-5xl font-bold mb-8"
            >
              Uma entrega construída com visão comercial e estrutura técnica.
            </motion.h2>
            <motion.div variants={fadeInUp} className="text-lg text-dacora-offwhite/80 font-light space-y-4">
              <p>A proposta reúne a experiência comercial e de comunicação da Fernanda Corá com a estratégia digital e a execução técnica da Dácora.</p>
              <p>Cada projeto é pensado para traduzir a oferta da empresa em uma experiência clara, profissional e preparada para receber tráfego.</p>
            </motion.div>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-16">
            <motion.div 
              className="bg-white/5 border border-white/10 p-8 lg:p-10 rounded-[4px]"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <div className="w-20 h-20 rounded-full overflow-hidden mb-6 border-2 border-dacora-sage">
                <img
                  src={fernandaFaceClose}
                  alt="Fernanda Corá"
                  className="w-full h-full object-cover object-[center_30%]"
                  loading="lazy"
                />
              </div>
              <h3 className="text-2xl font-bold mb-4">Fernanda Corá</h3>
              <p className="text-dacora-offwhite/80 font-light leading-relaxed">
                Parceira comercial e de comunicação, responsável por contribuir com o entendimento do negócio, posicionamento da oferta e relação com o cliente.
              </p>
            </motion.div>

            <motion.div 
              className="bg-white/5 border border-white/10 p-8 lg:p-10 rounded-[4px]"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <div className="h-20 flex items-center mb-6">
                <span className="text-2xl font-bold tracking-tight text-dacora-offwhite">DÁCORA</span>
              </div>
              <h3 className="text-2xl font-bold mb-4">Dácora Performance Digital</h3>
              <p className="text-dacora-offwhite/80 font-light leading-relaxed">
                Estratégia, desenvolvimento, mensuração e integração da landing page com os canais de aquisição e atendimento.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* 
        -------------------------------------------
        SEÇÃO 10 — FAQ
        -------------------------------------------
      */}
      <section id="duvidas" className="py-24 lg:py-32 px-6">
        <div className="max-w-3xl mx-auto">
          <motion.div 
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <span className="inline-block uppercase tracking-[0.2em] text-sm font-medium text-dacora-sage mb-6">
              DÚVIDAS FREQUENTES
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-dacora-primary">
              Antes de começar, vale esclarecer.
            </h2>
          </motion.div>

          <div className="border-t border-dacora-sage/30">
            <FaqItem 
              eventName="ClickFAQItem"
              question="A landing page funciona no celular?" 
              answer="Sim. A estrutura é desenvolvida e testada para celular e computador, com atenção especial à experiência mobile." 
            />
            <FaqItem 
              eventName="ClickFAQItem"
              question="O domínio está incluído?" 
              answer="A configuração pode estar incluída, mas a compra ou renovação do domínio é feita diretamente pela empresa contratante." 
            />
            <FaqItem 
              eventName="ClickFAQItem"
              question="Existe mensalidade obrigatória?" 
              answer="Não. Alterações futuras e manutenção podem ser solicitadas e orçadas conforme a necessidade." 
            />
            <FaqItem 
              eventName="ClickFAQItem"
              question="A hospedagem é gratuita?" 
              answer="O projeto pode ser publicado em uma plataforma com plano gratuito, desde que permaneça dentro dos limites desse plano. Caso seja necessário migrar para um plano pago, a contratação será feita diretamente pela empresa." 
            />
            <FaqItem 
              eventName="ClickFAQItem"
              question="O código fica com quem?" 
              answer="O código será publicado no GitHub da própria empresa, que continuará com acesso ao projeto." 
            />
            <FaqItem 
              eventName="ClickFAQItem"
              question="A página já inclui os textos?" 
              answer="Sim. A organização e a copy das seções fazem parte da entrega, com base nas informações fornecidas durante o briefing." 
            />
            <FaqItem 
              eventName="ClickFAQItem"
              question="Vocês fazem as fotos e os vídeos?" 
              answer="A produção de fotos e vídeos não está incluída, salvo quando descrita expressamente na proposta. A empresa deverá fornecer os materiais necessários ou contratar a produção separadamente." 
            />
            <FaqItem 
              eventName="ClickFAQItem"
              question="Qual é o prazo?" 
              answer="O prazo será definido após o briefing e dependerá da complexidade da página, do envio dos materiais e das integrações necessárias." 
            />
            <FaqItem 
              eventName="ClickFAQItem"
              question="A opção Completa substitui um CRM?" 
              answer="Não. A planilha e o filtro ajudam a organizar e qualificar os contatos, mas não substituem necessariamente um CRM completo." 
            />
            <FaqItem 
              eventName="ClickFAQItem"
              question="É possível integrar com outras ferramentas?" 
              answer="Sim, dependendo da ferramenta e da viabilidade técnica. Integrações não previstas serão avaliadas e orçadas separadamente." 
            />
          </div>
        </div>
      </section>

      {/* 
        -------------------------------------------
        SEÇÃO 11 — CTA FINAL
        -------------------------------------------
      */}
      <section className="relative bg-dacora-primary text-dacora-offwhite py-32 px-6 overflow-hidden text-center">
        {/* Subtle background detail */}
        <div className="absolute inset-0 opacity-5 pointer-events-none" 
             style={{ backgroundImage: 'radial-gradient(circle at 50% 50%, #F2EFEB 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
             
        <motion.div 
          className="max-w-4xl mx-auto relative z-10"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={staggerContainer}
        >
          <motion.div variants={fadeInUp} className="mb-8 flex justify-center">
            <span className="text-2xl font-bold tracking-tight text-dacora-offwhite/50">DÁCORA</span>
          </motion.div>

          <motion.h2 
            variants={fadeInUp}
            className="text-4xl md:text-5xl lg:text-6xl font-bold mb-8 leading-tight"
          >
            Sua oferta merece mais do que uma página improvisada.
          </motion.h2>

          <motion.p 
            variants={fadeInUp}
            className="text-lg md:text-xl text-dacora-sage font-light max-w-2xl mx-auto mb-12"
          >
            Vamos construir uma landing page capaz de apresentar seu negócio com clareza, receber tráfego e conduzir o visitante até o próximo passo.
          </motion.p>

          <motion.div variants={fadeInUp} className="mb-6 flex flex-col items-center gap-4">
            <a
              href={CONTACT_LINK}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackEvent('ClickFinalWhatsApp')}
              className="inline-flex items-center justify-center px-10 py-5 bg-dacora-offwhite text-dacora-primary font-bold text-lg md:text-xl rounded-[4px] hover:bg-white transition-colors duration-300"
            >
              Conversar sobre meu projeto
            </a>
            <span className="text-sm font-light text-dacora-offwhite/60">
              Conte brevemente o que sua empresa oferece e qual é o objetivo da página.
            </span>
          </motion.div>
        </motion.div>
      </section>

      {/* 
        -------------------------------------------
        FOOTER
        -------------------------------------------
      */}
      <footer className="bg-dacora-primary pt-12 pb-28 md:pb-12 px-6 border-t border-t-dacora-offwhite/10 relative">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8 md:pr-24 lg:pr-32">
          
          <span className="text-dacora-offwhite/60 font-light tracking-wide text-sm order-3 md:order-1 mt-2 md:mt-0 text-center md:text-left">
            &copy; {new Date().getFullYear()} Dácora Performance Digital<br/>
            Estratégia apresenta. Estrutura conduz. Mensuração melhora.
          </span>

          <div className="flex flex-col sm:flex-row items-center gap-6 sm:gap-10 order-1 md:order-2">
            <Link 
              to="/"
              className="text-dacora-offwhite/80 hover:text-dacora-offwhite transition-colors text-sm tracking-wide font-medium"
            >
              Página Inicial
            </Link>
            <a 
              href="https://www.instagram.com/dacora.com.br/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram da Dácora"
              className="inline-flex items-center gap-2 text-dacora-offwhite/80 hover:text-dacora-offwhite transition-colors group"
            >
              <Instagram className="w-[18px] h-[18px] group-hover:scale-110 transition-transform" strokeWidth={1.5} />
              <span className="text-sm tracking-wide font-medium">Instagram</span>
            </a>
            <Link 
              to="/politica-de-privacidade"
              className="text-dacora-offwhite/80 hover:text-dacora-offwhite transition-colors text-sm tracking-wide font-medium"
            >
              Política de Privacidade
            </Link>
          </div>

          <a 
            href={CONTACT_LINK}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackEvent('ClickFooterWhatsApp')}
            className="text-dacora-sage/60 hover:text-dacora-offwhite transition-colors text-xs tracking-wide order-2 md:order-3"
          >
            WhatsApp
          </a>

        </div>
      </footer>

      {/* Floating WhatsApp Button */}
      <motion.a
        href={CONTACT_LINK}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => trackEvent('ClickFloatingWhatsApp')}
        className="fixed bottom-6 right-6 lg:bottom-10 lg:right-10 z-50 bg-[#25D366] text-white p-4 rounded-full shadow-lg hover:bg-[#1EBE5D] hover:scale-105 hover:shadow-xl transition-all duration-300 group flex items-center justify-center pointer-events-auto"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 1, type: "spring", bounce: 0.5 }}
      >
        <WhatsAppIcon />
        <span className="absolute right-full mr-4 bg-dacora-dark text-dacora-offwhite text-sm font-medium px-4 py-2 rounded shadow-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none whitespace-nowrap hidden sm:block">
          Conversar agora
        </span>
      </motion.a>
    </div>
  );
}
