/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion } from 'motion/react';
import { CheckCircle2, Instagram } from 'lucide-react';
import { Link } from 'react-router-dom';

const CONTACT_LINK = 'https://wa.me/556296242626?text=Quero+melhorar+a+estrat%C3%A9gia+da+minha+empresa';

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

const trackContact = () => {
  if (typeof window !== 'undefined' && (window as any).fbq) {
    (window as any).fbq('track', 'Contact');
  }
};

export default function App() {
  return (
    <div className="min-h-screen bg-dacora-offwhite text-dacora-dark font-sans selection:bg-dacora-primary selection:text-dacora-offwhite">
      {/* 
        -------------------------------------------
        SEÇÃO 1 — HERO
        -------------------------------------------
      */}
      <section className="relative min-h-[85vh] lg:min-h-screen flex text-left items-center justify-center overflow-hidden w-full bg-dacora-dark">
        <div className="absolute inset-0 z-0">
          <img
            src="https://drive.google.com/thumbnail?id=1vCk73pPYTuKkEX4Rqe_IBS3mBjPJoCci&sz=w2000"
            alt="Executivo analisando dados"
            className="w-full h-full object-cover object-[70%_center] md:object-[60%_center]"
            referrerPolicy="no-referrer"
          />
          {/* General overlay */}
          <div className="absolute inset-0 bg-dacora-dark/40 pointer-events-none"></div>
          {/* Left side text protection mask */}
          <div className="absolute inset-0 bg-gradient-to-r from-dacora-dark/95 via-dacora-dark/75 to-transparent w-full md:w-3/4 lg:w-2/3 pointer-events-none"></div>
        </div>

        <div className="relative z-10 w-full max-w-7xl mx-auto px-6 py-24 mt-12 md:mt-0">
          <motion.div
            className="w-full flex flex-col"
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
          >
            <motion.div variants={fadeInUp}>
              <span className="inline-block uppercase tracking-[0.2em] text-sm font-medium text-dacora-offwhite/80 mb-6">
                TRÁFEGO PAGO
              </span>
            </motion.div>
            
            <motion.h1 
              variants={fadeInUp}
              className="text-4xl md:text-5xl lg:text-[3.5rem] font-bold text-dacora-offwhite leading-[1.15] mb-8 tracking-tight max-w-[650px]"
            >
              Você tem um serviço diferenciado.<br className="hidden md:block" /> O tráfego pago precisa<br className="hidden md:block" /> refletir isso.
            </motion.h1>
            
            <motion.p 
              variants={fadeInUp}
              className="text-lg md:text-xl lg:text-[1.35rem] text-dacora-offwhite/90 font-light mb-10 max-w-[580px] leading-relaxed"
            >
              Ajudamos negócios locais a atrair leads qualificados, mas o trabalho começa com um diagnóstico do seu processo comercial, não com o gerenciador.
            </motion.p>
            
            <motion.div variants={fadeInUp}>
              <a
                href={CONTACT_LINK}
                onClick={trackContact}
                className="inline-flex items-center justify-center px-10 py-[1.125rem] bg-dacora-offwhite text-dacora-primary font-bold text-lg rounded-[4px] hover:bg-white hover:scale-[1.02] transition-all duration-300 w-full sm:w-auto"
              >
                Solicitar proposta →
              </a>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* 
        -------------------------------------------
        SEÇÃO 2 — QUALIFICAÇÃO
        -------------------------------------------
      */}
      <section className="bg-dacora-primary text-dacora-offwhite py-24 px-6 md:py-32">
        <motion.div 
          className="max-w-4xl mx-auto"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          variants={staggerContainer}
        >
          <motion.h2 
            variants={fadeInUp}
            className="text-3xl md:text-4xl lg:text-5xl font-bold mb-16 text-center lg:text-left"
          >
            Esse serviço é para você que:
          </motion.h2>

          <div className="space-y-8 lg:space-y-12">
            {[
              "Tem um serviço diferenciado e quer que os anúncios tragam o cliente certo — não só volume.",
              "Investe em anúncios, mas os leads que chegam não viram cliente — e você nem sabe o porquê.",
              "Quer uma gestão que entende o seu processo comercial, não só as métricas da campanha."
            ].map((text, index) => (
              <motion.div 
                key={index} 
                variants={fadeInUp}
                className="flex items-start gap-5 lg:gap-6 group"
              >
                <CheckCircle2 className="w-6 h-6 md:w-8 md:h-8 text-dacora-sage opacity-80 shrink-0 mt-0.5 md:mt-0" strokeWidth={1.5} />
                <p className="text-xl md:text-2xl font-light leading-relaxed">
                  {text}
                </p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* 
        -------------------------------------------
        SEÇÃO 3 — PROBLEMA
        -------------------------------------------
      */}
      <section className="lg:min-h-screen flex flex-col lg:flex-row bg-dacora-offwhite relative">
          {/* Imagem (Faixa Editorial) */}
          <motion.div 
            className="w-full lg:w-[45%] h-[40vh] min-h-[300px] lg:h-auto relative"
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.8 }}
          >
          <img
            src="https://drive.google.com/thumbnail?id=1UOVkGZWLMgWOfF0XXB33Bgm26a5wEz2W&sz=w1000"
            alt="Reunião de diagnóstico"
            className="w-full h-full object-cover object-[center_60%] lg:object-[20%_70%]"
            style={{ filter: 'contrast(1.1) grayscale(0.2)' }}
            referrerPolicy="no-referrer"
          />
          {/* Overlay esverdeado/frio subtil */}
          <div className="absolute inset-0 bg-dacora-primary/10 mix-blend-multiply pointer-events-none"></div>
          <div className="absolute inset-0 bg-dacora-dark/10 pointer-events-none"></div>
        </motion.div>

        {/* Texto */}
        <div className="w-full lg:w-[55%] flex items-center">
          <div className="w-full px-6 py-20 lg:px-16 xl:px-24">
            <motion.div 
              className="max-w-2xl"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-100px' }}
              variants={staggerContainer}
            >
              <motion.div variants={fadeInUp}>
                <span className="inline-block uppercase tracking-[0.2em] text-sm font-semibold text-dacora-sage mb-6">
                  DIAGNÓSTICO COMERCIAL
                </span>
              </motion.div>

              <motion.h2 
                variants={fadeInUp}
                className="text-3xl md:text-4xl lg:text-[2.75rem] font-bold text-dacora-dark mb-8 leading-[1.15] tracking-tight"
              >
                O problema nem sempre está no anúncio
              </motion.h2>
              
              <motion.div variants={fadeInUp} className="text-lg md:text-xl text-dacora-gray font-light leading-relaxed">
                <p className="mb-10">
                  A maioria dos negócios locais que investe em tráfego pago encontra os gargalos antes do gerenciador:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 my-10">
                  {[
                    'Atendimento desorganizado', 
                    'Oferta mal posicionada', 
                    'Follow-up inexistente'
                  ].map((item, idx) => (
                    <div key={idx} className="pt-4 border-t border-dacora-sage/30">
                       <span className="text-dacora-dark text-base md:text-lg font-medium block leading-snug">
                         {item}
                       </span>
                    </div>
                  ))}
                </div>

                <p className="mb-4">
                  O anúncio traz o lead. O processo comercial é o que converte.
                </p>
                <p>
                  Por isso a gestão começa com diagnóstico.
                </p>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* 
        -------------------------------------------
        SEÇÃO 4 — COMO FUNCIONA
        -------------------------------------------
      */}
      <section className="py-24 lg:py-32 px-6 bg-[#EBE7E1] border-t border-t-dacora-sage/10">
        <div className="max-w-7xl mx-auto">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-3xl md:text-4xl lg:text-5xl font-bold text-dacora-dark mb-16 lg:mb-24 text-center lg:text-left"
          >
            Como funciona:
          </motion.h2>

          <motion.div 
            className="grid grid-cols-1 md:grid-cols-3 gap-12 lg:gap-16 mb-20"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-50px' }}
            variants={staggerContainer}
          >
            {[
              {
                num: "01",
                title: "Diagnóstico comercial",
                desc: "Mapeamos o seu processo para identificar gargalos e oportunidades antes de criar qualquer campanha."
              },
              {
                num: "02",
                title: "Guia de Criativos",
                desc: "Um documento personalizado para orientar a produção de conteúdo estratégico."
              },
              {
                num: "03",
                title: "Gestão profissional",
                desc: "Gestão de tráfego pago por uma equipe especializada com mais de 5 anos de mercado e processo validado."
              }
            ].map((step, idx) => (
              <motion.div key={idx} variants={fadeInUp} className="flex flex-col">
                <span className="text-6xl lg:text-7xl font-bold text-dacora-primary mb-6 block tracking-tight">
                  {step.num}
                </span>
                <h3 className="text-xl lg:text-2xl font-bold text-dacora-dark mb-4">
                  {step.title}
                </h3>
                <p className="text-dacora-gray font-light text-lg leading-relaxed">
                  {step.desc}
                </p>
              </motion.div>
            ))}
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="flex justify-center"
          >
            <div className="px-8 py-5 border border-dacora-sage/30 bg-dacora-offwhite rounded-[4px] shadow-sm">
              <span className="text-dacora-dark font-medium text-lg md:text-xl tracking-wide">
                Planos a partir de <span className="font-bold text-dacora-primary">R$1.500,00</span>/mês
              </span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* 
        -------------------------------------------
        SEÇÃO 5 — CTA FINAL
        -------------------------------------------
      */}
      <section className="relative bg-dacora-primary text-dacora-offwhite py-32 px-6 overflow-hidden">
        {/* Subtle background detail */}
        <div className="absolute inset-0 opacity-5 pointer-events-none" 
             style={{ backgroundImage: 'radial-gradient(circle at 50% 50%, #F2EFEB 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
             
        <motion.div 
          className="max-w-4xl mx-auto text-center relative z-10"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={staggerContainer}
        >
          <motion.div variants={fadeInUp} className="mb-6 md:mb-8">
            <span className="text-dacora-sage/90 italic font-light text-lg md:text-xl tracking-wide">
              Tráfego atrai. Estrutura converte. Método escala.
            </span>
          </motion.div>

          <motion.h2 
            variants={fadeInUp}
            className="text-4xl md:text-5xl lg:text-6xl font-bold mb-12 leading-tight"
          >
            Quer atrair os clientes certos e se destacar no seu mercado?
          </motion.h2>

          <motion.div variants={fadeInUp} className="mb-10">
            <a
              href={CONTACT_LINK}
              onClick={trackContact}
              className="inline-flex items-center justify-center px-10 py-5 bg-dacora-offwhite text-dacora-primary font-bold text-lg md:text-xl rounded-[4px] hover:bg-white transition-colors duration-300"
            >
              Solicitar proposta →
            </a>
          </motion.div>

          <motion.p 
            variants={fadeInUp}
            className="text-dacora-sage font-light text-base md:text-lg max-w-2xl mx-auto"
          >
            Vagas limitadas. Trabalhamos com um número reduzido de clientes para garantir qualidade de entrega.
          </motion.p>
        </motion.div>
      </section>

      {/* 
        -------------------------------------------
        SEÇÃO 6 — RODAPÉ
        -------------------------------------------
      */}
      <footer className="bg-dacora-primary pt-12 pb-28 md:pb-12 px-6 border-t border-t-dacora-offwhite/10 relative">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8 md:pr-24 lg:pr-32">
          
          <span className="text-dacora-offwhite/60 font-light tracking-wide text-sm order-3 md:order-1 mt-2 md:mt-0">
            dacora.com.br
          </span>

          <div className="flex flex-col sm:flex-row items-center gap-6 sm:gap-10 order-1 md:order-2">
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
            href="https://wa.me/5562999465725"
            target="_blank"
            rel="noopener noreferrer"
            className="text-dacora-sage/60 hover:text-dacora-offwhite transition-colors text-xs tracking-wide order-2 md:order-3"
          >
            Desenvolvido por Flávio Corá
          </a>

        </div>
      </footer>

      {/* Floating WhatsApp Button */}
      <motion.a
        href={CONTACT_LINK}
        onClick={trackContact}
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 lg:bottom-10 lg:right-10 z-50 bg-[#25D366] text-white p-4 rounded-full shadow-lg hover:bg-[#1EBE5D] hover:scale-105 hover:shadow-xl transition-all duration-300 group flex items-center justify-center pointer-events-auto"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 1, type: "spring", bounce: 0.5 }}
      >
        <WhatsAppIcon />
        <span className="absolute right-full mr-4 bg-dacora-dark text-dacora-offwhite text-sm font-medium px-4 py-2 rounded shadow-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none whitespace-nowrap hidden sm:block">
          Fale conosco
        </span>
      </motion.a>
    </div>
  );
}
