/**
 * French marketing content (Phase 5): homepage depth, solutions,
 * informational pages, guides, legal baselines.
 *
 * Same factual discipline as fr.ts: no invented prices, timelines,
 * testimonials, ratings, or delivery promises. Legal pages describe
 * only implemented behavior.
 */

import type { VitrineMarketingDict } from "./dict";

export const frMarketing: VitrineMarketingDict = {
  meta: {
    home: {
      title: "Karti — Cartes NFC intelligentes : partagez en un geste",
      description:
        "Karti crée des cartes NFC pour profils professionnels, entreprises, CV, avis Google, WhatsApp et plus. Un passage devant un téléphone suffit, sans application.",
    },
    solutionsProfessionals: {
      title: "Karti pour les professionnels — Carte Personnelle & Contact",
      description:
        "Indépendants, commerciaux, consultants : partagez profil, coordonnées et liens en un geste avec la Carte Personnelle ou la Carte Contact Karti.",
    },
    solutionsStudents: {
      title: "Karti pour étudiants & chercheurs d'emploi — Carte Carrière",
      description:
        "CV, LinkedIn et identité professionnelle en un geste : la Carte Carrière Karti pour forums emploi, entretiens et stages.",
    },
    solutionsBusinesses: {
      title: "Karti pour les entreprises — Business, Avis Google, WhatsApp",
      description:
        "Profil d'entreprise, avis Google, WhatsApp et Instagram en un geste : les cartes Karti pensées pour commerces et entreprises.",
    },
    howItWorks: {
      title: "Comment ça marche — NFC, QR et redirection permanente Karti",
      description:
        "Tap NFC, QR de secours, redirection permanente : comprenez comment une carte Karti partage votre profil ou votre lien, sans application.",
    },
    pricing: {
      title: "Tarifs Karti — Demande de prix par produit",
      description:
        "Les cartes Karti sont chiffrées sur demande selon produit, quantité et personnalisation. Décrivez votre besoin et recevez un prix confirmé.",
    },
    examples: {
      title: "Exemples de cartes Karti — Cas d'usage par produit",
      description:
        "Découvrez ce que chaque carte Karti ouvre après le passage : profils, avis Google, WhatsApp, Instagram. Exemples de démonstration.",
    },
    faq: {
      title: "FAQ Karti — Questions fréquentes sur les cartes NFC",
      description:
        "Application, NFC, QR, modifications, commande, design, livraison : les réponses aux questions fréquentes sur les cartes Karti.",
    },
    resources: {
      title: "Ressources Karti — Guides NFC, avis Google et destinations",
      description:
        "Guides pratiques : NFC contre QR, retrouver son lien d'avis Google, changer de destination sans changer de carte.",
    },
    articleNfcVsQr: {
      title: "Carte de visite NFC ou QR code : que choisir ? — Guide Karti",
      description:
        "NFC et QR se complètent : le passage pour la vitesse, le QR en secours. Comment Karti combine les deux sur une seule carte.",
    },
    articleReviewLink: {
      title: "Comment retrouver son lien d'avis Google ? — Guide Karti",
      description:
        "Où trouver le lien d'avis de votre fiche Google, et que faire si vous ne le connaissez pas : Karti le retrouve avec vous.",
    },
    articleDestinationChange: {
      title: "Changer de destination sans changer de carte — Guide Karti",
      description:
        "La redirection permanente Karti : votre carte physique reste la même pendant que profil et destinations évoluent.",
    },
    legalPrivacy: {
      title: "Confidentialité — Karti",
      description:
        "Quelles données Karti collecte lors d'une commande ou d'un message, et comment elles sont utilisées.",
    },
    legalTerms: {
      title: "Conditions de commande — Karti",
      description:
        "Demande de devis, confirmation, production : comment fonctionnent les commandes de cartes Karti.",
    },
    legalDelivery: {
      title: "Livraison — Karti",
      description:
        "Commande, confirmation et remise de votre carte Karti : le processus actuel, sans promesse inventée.",
    },
  },
  marketingHome: {
    heroSupport: "NFC · QR de secours · Destination modifiable",
    heroSecondary: "Voir comment ça marche",
    trustItems: [
      "Un seul passage",
      "Aucune application pour le destinataire",
      "NFC + QR",
      "Destination modifiable",
    ],
    goals: [
      {
        product: "PERSONAL_CARD",
        title: "Partager mon profil professionnel",
        desc: "Nom, fonction, coordonnées et liens réunis sur une page.",
        audience: "Indépendants, commerciaux, consultants",
        tap: "Votre profil Karti s'ouvre.",
      },
      {
        product: "CAREER_CARD",
        title: "Partager mon CV et ma carrière",
        desc: "Identité, titre visé, CV et liens professionnels.",
        audience: "Étudiants, diplômés, chercheurs d'emploi",
        tap: "Votre profil carrière s'ouvre.",
      },
      {
        product: "BUSINESS_CARD",
        title: "Présenter mon entreprise",
        desc: "Appel, WhatsApp, itinéraire, site et réseaux.",
        audience: "Commerces, agences, entreprises locales",
        tap: "Le profil de votre entreprise s'ouvre.",
      },
      {
        product: "GOOGLE_REVIEW_CARD",
        title: "Obtenir des avis Google",
        desc: "Un passage vers votre page d'avis, sans recherche.",
        audience: "Restaurants, commerces, services",
        tap: "Votre destination d'avis s'ouvre.",
      },
      {
        product: "WHATSAPP_CARD",
        title: "Ouvrir WhatsApp",
        desc: "Conversation immédiate, sans saisir de numéro.",
        audience: "SAV, artisans, commerciaux",
        tap: "La conversation WhatsApp s'ouvre.",
      },
      {
        product: "INSTAGRAM_CARD",
        title: "Ouvrir Instagram",
        desc: "Du visiteur physique au visiteur de profil.",
        audience: "Boutiques, créateurs, lieux",
        tap: "Votre profil Instagram s'ouvre.",
      },
      {
        product: "CONTACT_CARD",
        title: "Partager mon contact",
        desc: "L'essentiel et l'enregistrement en un clic.",
        audience: "Terrain, événementiel, grand volume",
        tap: "Votre fiche contact s'ouvre.",
      },
      {
        product: "CUSTOM_LINK_CARD",
        title: "Ouvrir un autre lien",
        desc: "Menu, réservation, catalogue : n'importe quelle page approuvée.",
        audience: "Campagnes, menus, événements",
        tap: "Votre lien s'ouvre.",
      },
    ],
    goalCtaProduct: "Voir le produit",
    goalCtaOrder: "Commander",
    demoTitle: "Voyez ce qui se passe après le passage",
    demoSubtitle: "La carte reste la même. Le téléphone affiche la destination.",
    demoTabs: [
      {
        id: "personal",
        label: "Personnel",
        phoneTitle: "Profil de Sara Bennani",
        phoneLines: [
          "Designer indépendante",
          "Appeler · WhatsApp · E-mail",
          "Portfolio · LinkedIn · Site",
        ],
      },
      {
        id: "career",
        label: "Carrière",
        phoneTitle: "Profil carrière de Yassine",
        phoneLines: ["Développeur junior", "CV · LinkedIn · GitHub", "Contact direct"],
      },
      {
        id: "business",
        label: "Business",
        phoneTitle: "Café Atlas",
        phoneLines: ["Appeler · WhatsApp · Itinéraire", "Menu · Instagram · Avis"],
      },
      {
        id: "reviews",
        label: "Avis",
        phoneTitle: "Donner un avis",
        phoneLines: ["Café Atlas sur Google", "Votre avis s'ouvre directement"],
      },
      {
        id: "whatsapp",
        label: "WhatsApp",
        phoneTitle: "Discussion WhatsApp",
        phoneLines: ["Bonjour, je souhaite un renseignement…", "Conversation déjà adressée"],
      },
    ],
    audiencesTitle: "Pensé pour votre façon de travailler",
    audiencesSubtitle: "Trois points de départ, un même geste.",
    audiences: [
      {
        solution: "professionals",
        title: "Professionnels",
        desc: "Réseautage, rendez-vous clients, premier contact : votre identité en un geste.",
      },
      {
        solution: "students",
        title: "Étudiants & chercheurs d'emploi",
        desc: "CV, LinkedIn et portfolio partagés en forum emploi comme en entretien.",
      },
      {
        solution: "businesses",
        title: "Entreprises",
        desc: "Profil, avis, WhatsApp et réseaux : vos clients agissent depuis le comptoir.",
      },
    ],
    whyTitle: "Pourquoi Karti, concrètement",
    whySubtitle: "Des comportements vérifiables, pas des adjectifs.",
    whyItems: [
      {
        title: "Une carte réutilisable",
        desc: "Un seul objet physique qui sert à chaque rencontre, au lieu de piles de papier.",
      },
      {
        title: "Modifiable après réception",
        desc: "Profil et destinations se mettent à jour sans remplacer la carte.",
      },
      {
        title: "NFC + QR",
        desc: "Le passage pour la vitesse, le QR quand le NFC est indisponible.",
      },
      {
        title: "Des expériences ciblées",
        desc: "Chaque produit ouvre exactement ce que le visiteur attend : profil, avis, discussion.",
      },
      {
        title: "Présentation professionnelle",
        desc: "Une page claire au nom de votre activité, pas un lien brut.",
      },
      {
        title: "Redirection permanente",
        desc: "L'adresse de la carte ne change jamais ; seule la destination évolue.",
      },
    ],
    redirectTitle: "La même carte, même quand tout change",
    redirectSubtitle: "Le différenciateur Karti, expliqué simplement.",
    todayLabel: "Aujourd'hui",
    laterLabel: "Plus tard",
    sameCardLabel: "Même carte physique",
    redirectSteps: [
      {
        title: "Aujourd'hui",
        desc: "Votre carte ouvre votre Instagram : un passage, votre profil.",
      },
      {
        title: "Plus tard",
        desc: "Vous changez de destination : la même carte ouvre votre site. Rien à réimprimer.",
      },
      {
        title: "Pour les profils",
        desc: "Nouveau poste, nouveau numéro : votre profil se met à jour, la carte suit.",
      },
    ],
    examplesTitle: "À quoi ça ressemble",
    examplesSubtitle: "Des exemples de démonstration, pas des clients.",
    pricingTiers: [
      {
        title: "Cartes de profil",
        desc: "Personnelle, Carrière, Business : profil numérique inclus.",
        cta: "Demander un prix",
      },
      {
        title: "Cartes d'action",
        desc: "Avis Google, WhatsApp, Instagram, Contact, Lien : une destination, un geste.",
        cta: "Demander un prix",
      },
      {
        title: "Volume et entreprises",
        desc: "Plusieurs cartes ou besoin spécifique : devis dédié.",
        cta: "Demander un devis",
      },
    ],
    processTitle: "Commander, simplement",
    processSteps: [
      {
        title: "Vous décrivez",
        desc: "Produit, configuration et livraison en quatre étapes, sans compte.",
      },
      {
        title: "Nous confirmons",
        desc: "Karti vous contacte pour valider détails et prix avant production.",
      },
      {
        title: "Nous préparons",
        desc: "Votre carte est configurée vers votre profil ou destination.",
      },
      {
        title: "Vous partagez",
        desc: "Un passage ou un scan, et votre destination s'ouvre.",
      },
    ],
    finalHelpTitle: "Vous hésitez entre plusieurs cartes ?",
    finalHelpCta: "Aidez-moi à choisir",
    finalTalkCta: "Parlons-nous",
  },
  solutions: {
    professionals: {
      name: "Professionnels",
      tagline: "Votre identité en un geste, à chaque rencontre.",
      outcome:
        "Indépendants, commerciaux et consultants partagent profil, coordonnées et liens sans dictée ni carte papier.",
      problemsTitle: "Les frictions du quotidien",
      problems: [
        "Répéter numéro et réseaux à chaque rencontre",
        "Cartes papier perdues ou périmées",
        "Première impression brouillonne en networking",
      ],
      recommendTitle: "Les cartes adaptées",
      recommend: [
        {
          product: "PERSONAL_CARD",
          why: "Votre profil complet : identité, coordonnées, liens.",
        },
        {
          product: "CONTACT_CARD",
          why: "L'essentiel et l'enregistrement quand le volume prime.",
        },
      ],
      faq: [
        {
          q: "Quelle différence entre Carte Personnelle et Carte Contact ?",
          a: "La Personnelle présente un profil riche avec liens ; la Contact va à l'essentiel : coordonnées et enregistrement.",
        },
        {
          q: "Puis-je faire évoluer mon profil ?",
          a: "Oui. Nouveau poste ou nouveau numéro : le profil se met à jour, la carte reste la même.",
        },
      ],
    },
    students: {
      name: "Étudiants & chercheurs d'emploi",
      tagline: "Votre candidature en un geste.",
      outcome:
        "CV, LinkedIn, portfolio et contact partagés en forum emploi comme en entretien, sans pile de papier.",
      problemsTitle: "Les frictions du quotidien",
      problems: [
        "CV papier perdu dans la pile des recruteurs",
        "LinkedIn épelé à l'oral, jamais retrouvé",
        "Portfolio et GitHub dispersés",
      ],
      recommendTitle: "Les cartes adaptées",
      recommend: [
        {
          product: "CAREER_CARD",
          why: "CV, LinkedIn et identité : la carte pensée pour candidater.",
        },
        {
          product: "PERSONAL_CARD",
          why: "Un profil complet quand le réseau compte autant que le CV.",
        },
        {
          product: "CONTACT_CARD",
          why: "Coordonnées seules pour les grands forums.",
        },
      ],
      faq: [
        {
          q: "Faut-il un CV final pour commander ?",
          a: "Non. Indiquez si vous en avez un ; le profil se complète ensuite avec vous.",
        },
        {
          q: "Et après le forum emploi ?",
          a: "Votre profil reste en ligne et modifiable : nouveaux projets, nouveau titre, mêmes cartes.",
        },
      ],
    },
    businesses: {
      name: "Entreprises",
      tagline: "Vos clients agissent depuis le comptoir.",
      outcome:
        "Profil d'entreprise, avis Google, WhatsApp et Instagram : chaque point de contact devient une action.",
      problemsTitle: "Les frictions du quotidien",
      problems: [
        "Clients qui cherchent vos infos à plusieurs endroits",
        "Avis Google qui n'arrivent jamais faute de simplicité",
        "Numéros recopiés avec des erreurs",
      ],
      recommendTitle: "Les cartes adaptées",
      recommend: [
        {
          product: "BUSINESS_CARD",
          why: "Le profil complet : appel, WhatsApp, itinéraire, site.",
        },
        {
          product: "GOOGLE_REVIEW_CARD",
          why: "Un passage vers la page d'avis, au bon moment.",
        },
        {
          product: "WHATSAPP_CARD",
          why: "La conversation sans saisie pour le SAV et la commande.",
        },
        {
          product: "INSTAGRAM_CARD",
          why: "Du visiteur physique au visiteur de profil.",
        },
      ],
      faq: [
        {
          q: "Faut-il une carte par usage ?",
          a: "Souvent oui : une carte Business au comptoir, une carte Avis en caisse, par exemple. Chaque carte a sa destination.",
        },
        {
          q: "Puis-je commander plusieurs cartes ?",
          a: "Oui, la quantité se choisit à la commande et le prix se confirme par devis.",
        },
      ],
    },
  },
  howItWorks: {
    title: "Comment ça marche",
    subtitle: "NFC, QR et redirection permanente, expliqués sans jargon.",
    whatTitle: "C'est quoi, le NFC ?",
    whatBody: [
      "Le NFC est la technologie sans contact déjà utilisée pour payer avec un téléphone : il suffit d'approcher deux objets pour échanger une petite information.",
      "Sur une carte Karti, cette information est une adresse web. Le téléphone l'ouvre comme n'importe quel lien, dans le navigateur.",
    ],
    tapTitle: "Le passage, en trois temps",
    tapSteps: [
      {
        title: "Présentez la carte",
        desc: "Approchez la carte du haut du téléphone du visiteur, NFC activé.",
      },
      {
        title: "Le téléphone propose le lien",
        desc: "Une notification ou une ouverture propose l'adresse Karti.",
      },
      {
        title: "La destination s'ouvre",
        desc: "Profil, avis, conversation ou page : selon la carte présentée.",
      },
    ],
    qrTitle: "Et si le NFC est désactivé ?",
    qrBody:
      "Chaque carte porte aussi un QR qui mène à la même adresse. Le visiteur scanne, et arrive exactement au même endroit qu'avec le passage.",
    redirectTitle: "L'adresse ne change jamais",
    redirectBody: [
      "La carte et son QR contiennent une adresse Karti permanente. C'est Karti qui décide ensuite où elle mène.",
      "Quand vous changez de profil, de numéro ou de lien, seule cette décision change : l'objet physique reste valable.",
    ],
    compareTitle: "Profil ou action directe ?",
    compare: [
      {
        title: "Cartes de profil",
        desc: "Personnelle, Carrière, Business, Contact : elles ouvrent votre page Karti, modifiable à tout moment.",
      },
      {
        title: "Cartes d'action",
        desc: "Avis Google, WhatsApp, Instagram, Lien : elles ouvrent directement la destination, sans page intermédiaire.",
      },
    ],
    recipientTitle: "Et pour la personne en face ?",
    recipientBody:
      "Rien à installer, aucun compte à créer. Tout s'ouvre dans son navigateur, qu'elle ait un téléphone récent ou non.",
    operatorTitle: "Et côté préparation ?",
    operatorBody:
      "Vous commandez, Karti vous contacte pour confirmer les détails, puis votre carte est configurée vers votre profil ou votre destination.",
    faqTitle: "Questions fréquentes",
    faq: [
      {
        q: "Faut-il une application pour utiliser une carte Karti ?",
        a: "Non, ni pour commander ni pour recevoir. Le navigateur du téléphone suffit.",
      },
      {
        q: "Que se passe-t-il si je change d'avis sur la destination ?",
        a: "Rien à réimprimer : la destination se reconfigure et la même carte continue de fonctionner.",
      },
    ],
  },
  pricingPage: {
    title: "Tarifs",
    subtitle: "Chaque besoin est chiffré sur demande. Voici comment ça fonctionne.",
    tiersTitle: "Par type de carte",
    tiers: [
      {
        title: "Cartes de profil",
        desc: "Personnelle, Carrière, Business : profil numérique inclus et modifiable.",
        points: ["Profil créé avec vous", "Destination modifiable", "QR de secours inclus"],
        cta: "Demander un prix",
      },
      {
        title: "Cartes d'action",
        desc: "Avis Google, WhatsApp, Instagram, Contact, Lien : une destination, un geste.",
        points: ["Destination configurée", "Modifiable sans réimprimer", "QR de secours inclus"],
        cta: "Demander un prix",
      },
      {
        title: "Volume et entreprises",
        desc: "Plusieurs cartes, lieux multiples, besoin spécifique.",
        points: ["Quantité au choix", "Devis dédié", "Accompagnement à la commande"],
        cta: "Demander un devis",
      },
    ],
    includedTitle: "Ce qui est toujours inclus",
    included: [
      "Carte physique configurée",
      "QR de secours vers la même destination",
      "Confirmation des détails avec vous avant production",
      "Destination modifiable après réception",
    ],
    factorsTitle: "Ce qui fait varier le prix",
    factors: [
      "Le produit choisi",
      "La quantité commandée",
      "La personnalisation demandée",
      "La livraison",
    ],
    processTitle: "Comment obtenir votre prix",
    processSteps: [
      {
        title: "Décrivez",
        desc: "Produit, configuration et livraison en quatre étapes.",
      },
      {
        title: "Recevez",
        desc: "Karti vous contacte avec un prix confirmé.",
      },
      {
        title: "Validez",
        desc: "Rien n'est produit ni débité avant votre accord.",
      },
    ],
    faqTitle: "Questions fréquentes",
    faq: [
      {
        q: "Pourquoi n'y a-t-il pas de prix affichés ?",
        a: "Chaque carte combine produit, quantité et personnalisation : le prix se confirme par devis, sans surprise.",
      },
      {
        q: "Le paiement se fait-il en ligne ?",
        a: "Non. Aucun montant n'est débité sur le site : tout se confirme avec vous avant production.",
      },
      {
        q: "Puis-je commander plusieurs cartes ?",
        a: "Oui, la quantité se choisit à la commande et le devis en tient compte.",
      },
    ],
    ctaTitle: "Décrivez votre besoin",
    ctaSubtitle: "Quatre étapes, sans compte, sans paiement en ligne.",
  },
  examplesPage: {
    title: "Exemples",
    subtitle: "Ce que chaque carte ouvre après le passage. Exemples de démonstration.",
    categories: [
      { id: "personal", label: "Personnel" },
      { id: "career", label: "Carrière" },
      { id: "business", label: "Business" },
      { id: "reviews", label: "Avis" },
      { id: "whatsapp", label: "WhatsApp" },
    ],
    items: [
      {
        name: "Consultante en comptoir",
        category: "personal",
        product: "PERSONAL_CARD",
        useCase: "Partager identité et coordonnées en rendez-vous client.",
        tapResult: "Profil : nom, fonction, appel, WhatsApp, LinkedIn.",
      },
      {
        name: "Jeune diplômé en forum",
        category: "career",
        product: "CAREER_CARD",
        useCase: "Candidater sans CV papier en forum emploi.",
        tapResult: "Profil carrière : titre visé, CV, LinkedIn, contact.",
      },
      {
        name: "Café de quartier",
        category: "business",
        product: "BUSINESS_CARD",
        useCase: "Centraliser appel, WhatsApp, itinéraire et menu.",
        tapResult: "Profil entreprise avec actions en un clic.",
      },
      {
        name: "Caisse de restaurant",
        category: "reviews",
        product: "GOOGLE_REVIEW_CARD",
        useCase: "Proposer l'avis au moment de payer.",
        tapResult: "Destination d'avis Google directe.",
      },
      {
        name: "SAV en point de vente",
        category: "whatsapp",
        product: "WHATSAPP_CARD",
        useCase: "Ouvrir la discussion SAV sans saisir de numéro.",
        tapResult: "Conversation WhatsApp déjà adressée.",
      },
    ],
    note: "Ces exemples sont des concepts de démonstration construits avec l'interface Karti, pas des clients réels.",
  },
  faqHub: {
    title: "Questions fréquentes",
    subtitle: "Tout ce qu'il faut savoir avant de commander.",
    categories: [
      {
        name: "Pour commencer",
        items: [
          {
            q: "Qu'est-ce qu'une carte Karti NFC ?",
            a: "Une carte physique qui ouvre une destination numérique — profil, avis, conversation ou lien — quand on la présente à un téléphone.",
          },
          {
            q: "Comment commander ?",
            a: "Choisissez un produit, décrivez votre besoin en quatre étapes, envoyez votre demande. Karti vous contacte pour confirmer avant production.",
          },
          {
            q: "Faut-il créer un compte ?",
            a: "Non. Ni pour commander, ni pour recevoir une carte.",
          },
        ],
      },
      {
        name: "NFC et QR",
        items: [
          {
            q: "Le destinataire a-t-il besoin d'une application ?",
            a: "Non. Tout s'ouvre dans le navigateur de son téléphone.",
          },
          {
            q: "Et si le NFC est désactivé ?",
            a: "Chaque carte porte un QR qui mène exactement à la même destination.",
          },
        ],
      },
      {
        name: "Profils",
        items: [
          {
            q: "Puis-je modifier mon profil après réception ?",
            a: "Oui. Nom, coordonnées et liens se mettent à jour sans changer la carte.",
          },
          {
            q: "Que se passe-t-il si je change de poste ?",
            a: "Votre profil est mis à jour et la carte pointe vers la version à jour.",
          },
        ],
      },
      {
        name: "Cartes d'action",
        items: [
          {
            q: "Puis-je changer de destination plus tard ?",
            a: "Oui pour les destinations directes : la carte se reconfigure sans être remplacée.",
          },
          {
            q: "La carte Avis Google garantit-elle plus d'avis ?",
            a: "Non. Elle supprime les étapes pour atteindre la page d'avis ; l'avis reste au client.",
          },
        ],
      },
      {
        name: "Commande et design",
        items: [
          {
            q: "Comment le prix est-il fixé ?",
            a: "Par devis, selon produit, quantité, personnalisation et livraison. Rien n'est débité en ligne.",
          },
          {
            q: "Puis-je commander plusieurs cartes ?",
            a: "Oui, la quantité se choisit à la commande.",
          },
        ],
      },
      {
        name: "Livraison et contact",
        items: [
          {
            q: "Comment se passe la livraison ?",
            a: "Ville et adresse sont collectées à la commande ; les modalités se confirment avec vous avant production.",
          },
          {
            q: "Comment vous contacter ?",
            a: "Via la page contact pour toute question, commande en volume ou partenariat.",
          },
        ],
      },
    ],
  },
  resourcesPage: {
    title: "Ressources",
    subtitle: "Guides pratiques et notions utiles avant de commander.",
    topicsTitle: "Parcourir par sujet",
    topics: [
      {
        title: "Bases du NFC",
        desc: "Passage, QR de secours et redirection permanente expliqués simplement.",
        href: "/how-it-works",
      },
      {
        title: "Avis Google",
        desc: "Retrouver son lien d'avis et le transformer en carte de comptoir.",
        href: "/resources/get-review-link",
      },
      {
        title: "Destinations",
        desc: "Changer de lien ou de profil sans remplacer la carte physique.",
        href: "/resources/destination-change",
      },
      {
        title: "Cartes de visite numériques",
        desc: "NFC contre QR : que choisir et pourquoi les combiner.",
        href: "/resources/nfc-vs-qr",
      },
    ],
    guidesTitle: "Guides",
    comingTitle: "D'autres guides arrivent",
    comingDesc:
      "Réseautage, présence d'entreprise, WhatsApp professionnel : les prochains guides suivront les mêmes exigences de fond.",
  },
  articles: {
    "nfc-vs-qr": {
      title: "Carte de visite NFC ou QR code : que choisir ?",
      description:
        "Vitesse du passage, universalité du QR : pourquoi Karti combine les deux sur une seule carte réutilisable.",
      intro:
        "Le passage NFC et le QR code répondent au même besoin — ouvrir une destination depuis un objet physique — avec des forces différentes. Voici comment choisir, et pourquoi vous n'avez pas à trancher.",
      sections: [
        {
          heading: "Le passage NFC : la vitesse",
          paragraphs: [
            "Approcher une carte d'un téléphone ouvre le lien sans viser, sans application dédiée, en une seconde. C'est l'expérience la plus fluide en face-à-face.",
            "La limite : le NFC doit être activé sur le téléphone du visiteur, et certains appareils anciens ne le gèrent pas.",
          ],
        },
        {
          heading: "Le QR code : l'universalité",
          paragraphs: [
            "Tout smartphone avec un appareil photo lit un QR, sans réglage. C'est le filet de sécurité de chaque carte Karti.",
            "La limite : il faut viser le code et ouvrir l'appareil photo, donc une étape de plus qu'un passage.",
          ],
        },
        {
          heading: "Pourquoi combiner les deux",
          paragraphs: [
            "Chaque carte Karti porte les deux : le passage pour la vitesse au quotidien, le QR quand le NFC est indisponible. Les deux mènent exactement à la même adresse.",
            "Le choix n'est donc pas technologique mais d'usage : où et devant qui présentez-vous votre carte ?",
          ],
        },
      ],
      faq: [
        {
          q: "Le QR mène-t-il ailleurs que le passage ?",
          a: "Non. Les deux contiennent la même adresse Karti permanente et arrivent à la même destination.",
        },
        {
          q: "Faut-il une application pour scanner ?",
          a: "Non, l'appareil photo du téléphone suffit dans la quasi-totalité des cas.",
        },
      ],
    },
    "get-review-link": {
      title: "Comment retrouver son lien d'avis Google ?",
      description:
        "Fiche Google, lien partageable et solution Karti quand le lien est introuvable : le guide complet.",
      intro:
        "Une carte Avis Google n'est utile que si elle mène directement à votre page d'avis. Voici où trouver ce lien — et ce que Karti fait quand vous ne l'avez pas.",
      sections: [
        {
          heading: "Le bon lien : la page d'avis, pas la fiche",
          paragraphs: [
            "Votre fiche d'établissement Google présente votre entreprise ; la page d'avis est l'écran où le client écrit. C'est vers cette page que la carte doit mener.",
            "Le plus court chemin : depuis votre fiche Google (recherche de votre nom), le bouton d'avis propose une adresse partageable.",
          ],
        },
        {
          heading: "Si vous ne retrouvez pas le lien",
          paragraphs: [
            "C'est fréquent : accès multiples à la fiche, ancienne URL, établissement récent. À la commande, cochez simplement l'aide : Karti retrouve le lien avec vous après votre demande.",
            "La commande n'est jamais bloquée par un lien manquant.",
          ],
        },
        {
          heading: "Placer la carte au bon moment",
          paragraphs: [
            "Comptoir, caisse, table, réception : la carte doit être visible au moment où le client est satisfait, pas à la sortie.",
            "Un seul passage suffit : la destination d'avis s'ouvre directement, sans recherche.",
          ],
        },
      ],
      faq: [
        {
          q: "La carte garantit-elle plus d'avis ?",
          a: "Non. Elle supprime les étapes ; écrire l'avis reste la décision du client.",
        },
        {
          q: "Puis-je changer de lien d'avis plus tard ?",
          a: "Oui, la destination se reconfigure sans remplacer la carte.",
        },
      ],
    },
    "destination-change": {
      title: "Changer de destination sans changer de carte",
      description:
        "Redirection permanente : comment profils et liens évoluent pendant que votre carte physique reste la même.",
      intro:
        "Imprimés et objets connectés vieillissent mal dès que l'information change. La redirection permanente Karti résout ce problème à la racine.",
      sections: [
        {
          heading: "Une adresse qui ne change jamais",
          paragraphs: [
            "Chaque carte et son QR contiennent une adresse Karti permanente. C'est Karti qui décide ensuite où elle mène : profil, avis, conversation ou lien.",
            "Changer d'avis sur la destination ne touche jamais l'objet : seule la décision change, côté Karti.",
          ],
        },
        {
          heading: "Profils : l'information suit votre vie",
          paragraphs: [
            "Nouveau poste, nouveau numéro, nouveaux liens : votre profil se met à jour et toutes vos cartes distribuées pointent vers la version à jour.",
            "C'est l'inverse de la carte papier, figée le jour de l'impression.",
          ],
        },
        {
          heading: "Destinations : une carte, plusieurs vies",
          paragraphs: [
            "Une carte Lien peut ouvrir un menu cette saison et une page de réservation la suivante. Une carte Instagram peut suivre un changement de compte.",
            "La reconfiguration se fait sans réimprimer, sans réécrire, sans redistribuer.",
          ],
        },
      ],
      faq: [
        {
          q: "Faut-il réécrire la puce NFC après un changement ?",
          a: "Non. La puce contient l'adresse permanente ; le changement a lieu côté Karti.",
        },
        {
          q: "Et le QR imprimé ?",
          a: "Lui non plus : il contient la même adresse permanente.",
        },
      ],
    },
  },
  legal: {
    updatedLabel: "Dernière mise à jour",
    privacyTitle: "Confidentialité",
    termsTitle: "Conditions de commande",
    deliveryTitle: "Livraison",
    privacy: [
      {
        heading: "Données collectées",
        paragraphs: [
          "Pour traiter une demande, Karti collecte les informations que vous saisissez : produit et configuration choisis, nom, téléphone, WhatsApp et e-mail éventuels, ville et adresse de livraison, ainsi que le contexte d'acquisition (page d'arrivée, source, paramètres de campagne).",
          "Un message via le formulaire de contact collecte nom, coordonnées indiquées, entreprise éventuelle et contenu du message.",
          "Aucun compte n'est créé et aucun paiement n'est collecté sur le site.",
        ],
      },
      {
        heading: "Utilisation",
        paragraphs: [
          "Vos informations servent uniquement à préparer votre demande, vous contacter pour la confirmer, et répondre à vos messages.",
          "Les mesures d'audience, quand elles sont activées, ne contiennent jamais vos coordonnées, adresse ou messages.",
        ],
      },
      {
        heading: "Conservation et contact",
        paragraphs: [
          "Les demandes sont conservées comme dossiers commerciaux pour le suivi de votre commande. Pour toute question sur vos données, écrivez via la page contact.",
        ],
      },
    ],
    terms: [
      {
        heading: "Demande de devis",
        paragraphs: [
          "Passer commande sur le site envoie une demande de devis, pas un achat : aucun montant n'est débité en ligne et rien n'est produit automatiquement.",
          "Chaque demande est étudiée selon le produit, la quantité, la personnalisation et la livraison.",
        ],
      },
      {
        heading: "Confirmation avant production",
        paragraphs: [
          "Karti vous contacte pour confirmer les détails et le prix avant toute production. La production ne démarre qu'après votre accord explicite.",
        ],
      },
      {
        heading: "Cartes et destinations",
        paragraphs: [
          "Chaque carte contient une adresse Karti permanente et un QR de secours menant à la même destination. Profils et destinations directes restent modifiables sans remplacer la carte, dans les limites de chaque produit.",
        ],
      },
    ],
    delivery: [
      {
        heading: "Processus actuel",
        paragraphs: [
          "Après votre demande, Karti confirme avec vous les détails, le prix et les modalités de remise avant production. Ville et adresse sont collectées dès la commande pour préparer cette étape.",
        ],
      },
      {
        heading: "Délais",
        paragraphs: [
          "Aucun délai standard n'est affiché : les délais dépendent du produit, de la quantité et de votre validation des détails. Ils sont confirmés avec vous avant production.",
        ],
      },
      {
        heading: "Suivi",
        paragraphs: [
          "Votre numéro de commande (KARTI-...) sert de référence dans tous les échanges. Pour toute question, utilisez la page contact en le rappelant.",
        ],
      },
    ],
  },
};
