/**
 * Metadados de SEO por rota. Consumido por scripts/prerender.mjs
 * e por scripts/gen-sitemap.mjs.
 */

export const SITE = 'https://www.dacora.com.br';

const ORG_REF = { '@id': `${SITE}/#organization` };

/** Perguntas visíveis na seção "Dúvidas frequentes" de /proposta-landing-page. */
const FAQ_LANDING_PAGES = [
  [
    'A landing page funciona no celular?',
    'Sim. A estrutura é desenvolvida e testada para celular e computador, com atenção especial à experiência mobile.',
  ],
  [
    'O domínio está incluído?',
    'A configuração pode estar incluída, mas a compra ou renovação do domínio é feita diretamente pela empresa contratante.',
  ],
  [
    'Existe mensalidade obrigatória?',
    'Não. Alterações futuras e manutenção podem ser solicitadas e orçadas conforme a necessidade.',
  ],
  [
    'A hospedagem é gratuita?',
    'O projeto pode ser publicado em uma plataforma com plano gratuito, desde que permaneça dentro dos limites desse plano. Caso seja necessário migrar para um plano pago, a contratação será feita diretamente pela empresa.',
  ],
  [
    'O código fica com quem?',
    'O código será publicado no GitHub da própria empresa, que continuará com acesso ao projeto.',
  ],
  [
    'A página já inclui os textos?',
    'Sim. A organização e a copy das seções fazem parte da entrega, com base nas informações fornecidas durante o briefing.',
  ],
  [
    'Vocês fazem as fotos e os vídeos?',
    'A produção de fotos e vídeos não está incluída, salvo quando descrita expressamente na proposta. A empresa deverá fornecer os materiais necessários ou contratar a produção separadamente.',
  ],
  [
    'Qual é o prazo?',
    'O prazo será definido após o briefing e dependerá da complexidade da página, do envio dos materiais e das integrações necessárias.',
  ],
  [
    'A opção Completa substitui um CRM?',
    'Não. A planilha e o filtro ajudam a organizar e qualificar os contatos, mas não substituem necessariamente um CRM completo.',
  ],
  [
    'É possível integrar com outras ferramentas?',
    'Sim, dependendo da ferramenta e da viabilidade técnica. Integrações não previstas serão avaliadas e orçadas separadamente.',
  ],
];

const faqPage = (url, items) => ({
  '@type': 'FAQPage',
  '@id': `${url}#faq`,
  mainEntity: items.map(([question, answer]) => ({
    '@type': 'Question',
    name: question,
    acceptedAnswer: { '@type': 'Answer', text: answer },
  })),
});

const breadcrumb = (url, name) => ({
  '@type': 'BreadcrumbList',
  '@id': `${url}#breadcrumb`,
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Início', item: `${SITE}/` },
    { '@type': 'ListItem', position: 2, name, item: url },
  ],
});

export const ROUTES = [
  {
    path: '/',
    out: 'index.html',
    // A home já vem escrita direto no index.html (é o template base),
    // então o prerender só injeta o markup — sem sobrescrever head.
    keepTemplateHead: true,
    sitemap: { priority: '1.0', changefreq: 'monthly' },
  },

  {
    path: '/negocios-servicos',
    out: 'negocios-servicos.html',
    title: 'Tráfego Pago para Negócios de Serviços | Dácora',
    description:
      'Tráfego pago com estratégia para negócios de serviços, conectando mídia paga, presença digital e processo comercial para gerar oportunidades mais qualificadas.',
    ogImage: `${SITE}/og-image.jpg`,
    robots: 'index, follow, max-image-preview:large, max-snippet:-1',
    removeHeroPreload: true,
    sitemap: { priority: '0.9', changefreq: 'monthly' },
    jsonld: (url) => [
      {
        '@type': 'WebPage',
        '@id': `${url}#webpage`,
        url,
        name: 'Tráfego Pago para Negócios de Serviços | Dácora',
        description:
          'Tráfego pago com estratégia para negócios de serviços, conectando mídia paga, presença digital e processo comercial.',
        inLanguage: 'pt-BR',
        isPartOf: { '@id': `${SITE}/#website` },
      },
      {
        '@type': 'Service',
        '@id': `${url}#servico-negocios-servicos`,
        name: 'Tráfego pago para negócios de serviços',
        serviceType: 'Gestão de tráfego pago',
        provider: ORG_REF,
        areaServed: { '@type': 'Country', name: 'Brasil' },
        description:
          'Estratégia de aquisição para negócios de serviços conectando gestão de tráfego, presença digital e estrutura comercial.',
        hasOfferCatalog: {
          '@type': 'OfferCatalog',
          name: 'Serviços',
          itemListElement: [
            { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Gestão de Tráfego' } },
            { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Presença Digital' } },
            { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Estrutura Comercial' } },
          ],
        },
      },
      breadcrumb(url, 'Negócios de serviços'),
    ],
  },

  {
    path: '/proposta-landing-page',
    out: 'proposta-landing-page.html',
    title: 'Criação de Landing Pages que Convertem | Dácora',
    description:
      'Landing pages personalizadas com estratégia, copy, design, WhatsApp, mensuração e qualificação de leads. Conheça as opções da Dácora.',
    ogImage: `${SITE}/og-image.jpg`,
    robots: 'index, follow, max-image-preview:large, max-snippet:-1',
    sitemap: { priority: '0.8', changefreq: 'monthly' },
    jsonld: (url) => [
      {
        '@type': 'WebPage',
        '@id': `${url}#webpage`,
        url,
        name: 'Criação de Landing Pages que Convertem | Dácora',
        description:
          'Landing pages personalizadas com estratégia, copy, design, WhatsApp, mensuração e qualificação de leads.',
        inLanguage: 'pt-BR',
        isPartOf: { '@id': `${SITE}/#website` },
      },
      {
        '@type': 'Service',
        '@id': `${url}#servico-landing-pages`,
        name: 'Criação de landing pages',
        serviceType: 'Criação de landing pages',
        provider: ORG_REF,
        areaServed: { '@type': 'Country', name: 'Brasil' },
        description:
          'Criação de landing pages com estratégia, copy, design, integração com WhatsApp, mensuração e qualificação de leads.',
      },
      faqPage(url, FAQ_LANDING_PAGES),
      breadcrumb(url, 'Criação de landing pages'),
    ],
  },

  {
    path: '/politica-de-privacidade',
    out: 'politica-de-privacidade.html',
    title: 'Política de Privacidade | Dácora',
    description:
      'Como a Dácora Performance Digital coleta, usa e protege os dados pessoais dos visitantes do site.',
    robots: 'index, follow',
    sitemap: { priority: '0.3', changefreq: 'yearly' },
    jsonld: (url) => [
      {
        '@type': 'WebPage',
        '@id': `${url}#webpage`,
        url,
        name: 'Política de Privacidade | Dácora',
        inLanguage: 'pt-BR',
        isPartOf: { '@id': `${SITE}/#website` },
      },
      breadcrumb(url, 'Política de Privacidade'),
    ],
  },
];

export { FAQ_LANDING_PAGES };
