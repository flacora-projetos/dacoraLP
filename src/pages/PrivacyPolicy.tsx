import { motion } from 'motion/react';
import { Link } from 'react-router-dom';

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-dacora-offwhite text-dacora-dark font-sans selection:bg-dacora-primary selection:text-dacora-offwhite">
      {/* HEADER */}
      <header className="py-8 px-6 border-b border-dacora-sage/10">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <Link to="/" className="text-dacora-primary font-bold tracking-widest uppercase text-sm hover:text-dacora-medium transition-colors">
            @dacora.com.br
          </Link>
          <Link to="/" className="text-dacora-gray hover:text-dacora-primary transition-colors text-sm font-medium">
            Voltar para a página inicial &rarr;
          </Link>
        </div>
      </header>

      {/* CONTENT */}
      <main className="px-6 py-16 md:py-24">
        <motion.div 
          className="max-w-3xl mx-auto"
          initial="hidden"
          animate="visible"
          variants={staggerContainer}
        >
          <motion.div variants={fadeInUp} className="mb-16">
            <h1 className="text-4xl md:text-5xl lg:text-5xl font-bold text-dacora-dark mb-6 leading-tight tracking-tight">
              Política de Privacidade
            </h1>
            <p className="text-lg md:text-xl text-dacora-gray font-light leading-relaxed">
              Esta página informa como os dados são tratados, com transparência e segurança.
            </p>
          </motion.div>

          <motion.div variants={fadeInUp} className="max-w-none text-dacora-gray font-light leading-relaxed">
            <p className="mb-8">Última atualização: [INSERIR DATA]</p>

            <p className="mb-10">
              A Dácora Performance Digital respeita a sua privacidade e se compromete a tratar os seus dados pessoais com responsabilidade, transparência e segurança.
            </p>
            <p className="mb-12">
              Esta Política de Privacidade explica quais dados podem ser coletados nesta página, para quais finalidades eles são usados, com quem podem ser compartilhados e quais são os seus direitos como titular dos dados.
            </p>

            <div className="space-y-12">
              <section>
                <h2 className="text-2xl font-bold text-dacora-dark mb-4">1. Quem somos</h2>
                <p className="mb-4">Esta página é mantida pela Dácora Performance Digital.</p>
                <p className="mb-2">Responsável pelo tratamento dos dados:</p>
                <ul className="list-disc pl-5 space-y-2 marker:text-dacora-sage/50">
                  <li><strong>Nome/Razão social:</strong> FGC SERVICOS DE MARKETING DIGITAL LTDA</li>
                  <li><strong>CNPJ:</strong> 44.386.972/0001-31</li>
                  <li><strong>E-mail de contato:</strong> contato@nandacora.com.br</li>
                  <li><strong>Site:</strong> dacora.com.br</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-dacora-dark mb-4">2. Quais dados podemos coletar</h2>
                <p className="mb-4">Podemos coletar dados fornecidos diretamente por você, como:</p>
                <ul className="list-disc pl-5 space-y-2 mb-6 marker:text-dacora-sage/50">
                  <li>nome;</li>
                  <li>telefone/WhatsApp;</li>
                  <li>e-mail;</li>
                  <li>nome da empresa;</li>
                  <li>informações enviadas voluntariamente durante o contato, briefing, diagnóstico ou solicitação de proposta.</li>
                </ul>
                <p className="mb-4">Também podemos coletar dados de navegação e interação com a página, como:</p>
                <ul className="list-disc pl-5 space-y-2 marker:text-dacora-sage/50">
                  <li>endereço IP;</li>
                  <li>tipo de dispositivo;</li>
                  <li>navegador utilizado;</li>
                  <li>páginas acessadas;</li>
                  <li>origem do acesso, como campanha, anúncio, rede social ou mecanismo de busca;</li>
                  <li>cliques em botões, especialmente botões de contato;</li>
                  <li>cookies e identificadores similares usados para análise, mensuração e melhoria das campanhas.</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-dacora-dark mb-4">3. Para que usamos os dados</h2>
                <p className="mb-4">Os dados podem ser usados para as seguintes finalidades:</p>
                <ul className="list-disc pl-5 space-y-2 marker:text-dacora-sage/50">
                  <li>responder solicitações enviadas por você;</li>
                  <li>iniciar contato comercial via WhatsApp, e-mail ou outro canal informado;</li>
                  <li>entender se o serviço da Dácora faz sentido para o seu momento;</li>
                  <li>realizar diagnóstico comercial ou estratégico;</li>
                  <li>enviar propostas, informações ou orientações relacionadas ao serviço solicitado;</li>
                  <li>melhorar a experiência de navegação na página;</li>
                  <li>mensurar desempenho de campanhas de tráfego pago;</li>
                  <li>analisar eventos de conversão, origem dos acessos e comportamento geral da página;</li>
                  <li>cumprir obrigações legais, regulatórias ou solicitações de autoridades competentes.</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-dacora-dark mb-4">4. Bases legais para o tratamento</h2>
                <p className="mb-4">O tratamento dos dados poderá ocorrer com base em hipóteses previstas na legislação aplicável, incluindo:</p>
                <ul className="list-disc pl-5 space-y-2 marker:text-dacora-sage/50">
                  <li>consentimento, quando você fornece seus dados ou aceita cookies não essenciais;</li>
                  <li>execução de procedimentos preliminares relacionados a uma possível contratação;</li>
                  <li>legítimo interesse, para melhoria da página, mensuração de campanhas e comunicação com potenciais clientes;</li>
                  <li>cumprimento de obrigação legal ou regulatória, quando aplicável.</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-dacora-dark mb-4">5. Cookies, pixels e ferramentas de análise</h2>
                <p className="mb-4">Esta página pode utilizar cookies, pixels e tecnologias similares para melhorar a navegação, medir resultados e entender a origem dos acessos.</p>
                <p className="mb-4">Essas tecnologias podem ser usadas por ferramentas como:</p>
                <ul className="list-disc pl-5 space-y-2 mb-6 marker:text-dacora-sage/50">
                  <li>Google Analytics;</li>
                  <li>Google Ads;</li>
                  <li>Meta Ads/Facebook Pixel;</li>
                  <li>plataformas de hospedagem, monitoramento ou análise de desempenho;</li>
                  <li>ferramentas de formulário, CRM, planilhas ou automação, caso sejam integradas à página.</li>
                </ul>
                <p className="mb-4">Cookies necessários ajudam a página a funcionar corretamente. Cookies de análise e marketing ajudam a medir resultados e melhorar campanhas.</p>
                <p>Você pode bloquear ou excluir cookies diretamente nas configurações do seu navegador. Caso a página utilize banner de cookies, você poderá gerenciar suas preferências por meio dele.</p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-dacora-dark mb-4">6. Compartilhamento de dados</h2>
                <p className="mb-4">Os dados podem ser compartilhados apenas quando necessário para as finalidades descritas nesta Política, incluindo:</p>
                <ul className="list-disc pl-5 space-y-2 mb-6 marker:text-dacora-sage/50">
                  <li>ferramentas de atendimento, como WhatsApp ou e-mail;</li>
                  <li>plataformas de mídia e análise, como Google e Meta;</li>
                  <li>provedores de hospedagem e infraestrutura;</li>
                  <li>ferramentas de CRM, formulários, planilhas ou automação;</li>
                  <li>prestadores de serviço que auxiliem na operação, análise ou atendimento;</li>
                  <li>autoridades públicas, quando houver obrigação legal.</li>
                </ul>
                <p>Não vendemos seus dados pessoais.</p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-dacora-dark mb-4">7. Armazenamento e retenção dos dados</h2>
                <p className="mb-4">Os dados serão mantidos pelo tempo necessário para cumprir as finalidades descritas nesta Política, incluindo atendimento, negociação, histórico comercial, melhoria dos serviços e cumprimento de obrigações legais.</p>
                <p>Quando os dados deixarem de ser necessários, poderão ser excluídos, anonimizados ou mantidos apenas quando houver base legal para conservação.</p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-dacora-dark mb-4">8. Segurança dos dados</h2>
                <p className="mb-4">Adotamos medidas razoáveis de segurança para proteger os dados pessoais contra acesso não autorizado, uso indevido, perda, alteração ou divulgação indevida.</p>
                <p>Mesmo assim, nenhum sistema digital é totalmente imune a riscos. Por isso, recomendamos que você também adote boas práticas de segurança ao navegar na internet e compartilhar informações online.</p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-dacora-dark mb-4">9. Seus direitos como titular dos dados</h2>
                <p className="mb-4">Você pode solicitar, conforme a legislação aplicável:</p>
                <ul className="list-disc pl-5 space-y-2 mb-6 marker:text-dacora-sage/50">
                  <li>confirmação sobre a existência de tratamento dos seus dados;</li>
                  <li>acesso aos dados pessoais tratados;</li>
                  <li>correção de dados incompletos, inexatos ou desatualizados;</li>
                  <li>anonimização, bloqueio ou eliminação de dados desnecessários, excessivos ou tratados em desconformidade;</li>
                  <li>portabilidade dos dados, quando aplicável;</li>
                  <li>informação sobre compartilhamento de dados;</li>
                  <li>revogação do consentimento, quando o tratamento depender dele;</li>
                  <li>eliminação dos dados tratados com base no consentimento, respeitadas as hipóteses legais de conservação.</li>
                </ul>
                <p className="mb-2">Para exercer seus direitos, entre em contato pelo e-mail:</p>
                <p className="font-medium text-dacora-dark">contato@nandacora.com.br</p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-dacora-dark mb-4">10. Links para terceiros</h2>
                <p className="mb-4">Esta página pode conter links para canais ou serviços de terceiros, como WhatsApp, redes sociais, plataformas de pagamento, formulários externos ou páginas de parceiros.</p>
                <p>Ao acessar esses ambientes, você estará sujeito às políticas de privacidade e termos próprios dessas plataformas.</p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-dacora-dark mb-4">11. Alterações nesta Política</h2>
                <p className="mb-4">Esta Política de Privacidade poderá ser atualizada a qualquer momento para refletir mudanças na página, nas ferramentas utilizadas, nos serviços oferecidos ou em exigências legais.</p>
                <p>A data da última atualização será sempre indicada no início deste documento.</p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-dacora-dark mb-4">12. Contato</h2>
                <p className="mb-4">Em caso de dúvidas sobre esta Política de Privacidade ou sobre o tratamento dos seus dados pessoais, entre em contato:</p>
                <ul className="list-disc pl-5 space-y-2 marker:text-dacora-sage/50">
                  <li><strong>E-mail:</strong> contato@nandacora.com.br</li>
                  <li><strong>Site:</strong> dacora.com.br</li>
                </ul>
              </section>
            </div>
            
            <div className="mt-16 pt-10 border-t border-dacora-sage/10 text-center">
              <Link to="/" className="inline-flex items-center justify-center px-8 py-3 bg-dacora-offwhite border border-dacora-sage/30 text-dacora-primary font-medium text-base rounded-[4px] hover:bg-white transition-colors duration-300">
                &larr; Voltar para a página inicial
              </Link>
            </div>
          </motion.div>
        </motion.div>
      </main>

      {/* FOOTER */}
      <footer className="bg-dacora-primary py-8 px-6 border-t border-dacora-offwhite/10">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-dacora-offwhite/70 font-light text-sm tracking-wide text-center sm:text-left">
            Dácora Performance Digital
          </p>
          <span className="text-dacora-sage/50 text-[10px] sm:text-xs tracking-[0.1em] italic uppercase">
            Desenvolvido por Flávio Corá
          </span>
        </div>
      </footer>
    </div>
  );
}
