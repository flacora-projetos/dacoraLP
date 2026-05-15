/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion } from 'motion/react';

const CONTACT_LINK = 'INSERIR_LINK_DE_CONTATO'; // Default as requested
// const CONTACT_LINK = 'https://wa.me/556296242626'; // Actual whatsapp link based on prompt header if needed

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
            Esse serviço é para você se:
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
                className="flex items-start gap-6 group"
              >
                <span className="text-dacora-sage font-light text-2xl md:text-3xl opacity-50 mt-1">—</span>
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

              <motion.div 
                variants={fadeInUp}
                className="pl-6 md:pl-8 border-l-[4px] border-dacora-primary py-3 md:py-5 mt-16"
              >
                <p className="text-2xl md:text-3xl lg:text-[2rem] text-dacora-primary font-medium leading-snug">
                  Campanha atrai. <br className="hidden md:block" />
                  <span className="font-light italic text-dacora-gray mt-1 block">Processo comercial converte.</span>
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
          <motion.h2 
            variants={fadeInUp}
            className="text-4xl md:text-5xl lg:text-6xl font-bold mb-12 leading-tight"
          >
            Quer atrair os clientes certos e se destacar no seu mercado?
          </motion.h2>

          <motion.div variants={fadeInUp} className="mb-10">
            <a
              href={CONTACT_LINK}
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
      <footer className="bg-dacora-primary pt-12 pb-8 px-6 border-t border-t-dacora-offwhite/10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <p className="text-dacora-offwhite/70 font-light tracking-wide text-sm md:text-base text-center md:text-left">
            Tráfego atrai. Estrutura converte. Método escala.
          </p>
          <a 
            href="#" 
            className="text-dacora-offwhite/50 hover:text-dacora-offwhite transition-colors text-sm uppercase tracking-widest"
          >
            @dacora.com.br
          </a>
        </div>
      </footer>
    </div>
  );
}
