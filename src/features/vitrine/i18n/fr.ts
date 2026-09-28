/**
 * French vitrine copy (primary marketing locale).
 *
 * Factual only: no invented prices, testimonials, ratings, customer
 * counts, or delivery promises. Quote-state wording reflects the
 * QUOTE-only catalog (Phase 1).
 */

import type { VitrineDict } from "./dict";

export const frDict: VitrineDict = {
  dir: "ltr",
  localeName: "Français",
  nav: {
    products: "Produits",
    solutions: "Solutions",
    howItWorks: "Comment ça marche",
    pricing: "Tarifs",
    examples: "Exemples",
    faq: "FAQ",
    contact: "Contact",
    orderCta: "Commander votre carte",
  },
  footer: {
    tagline: "La carte de visite intelligente, toujours à jour.",
    productsTitle: "Produits",
    companyTitle: "Karti",
    contactLink: "Nous contacter",
    orderLink: "Commander",
    notice: "Les prix et délais sont confirmés après étude de votre demande.",
  },
  home: {
    heroTitle: "Une carte, un geste. Votre contact est partagé.",
    heroSubtitle:
      "Karti transforme une carte physique en expérience numérique : un passage devant un téléphone suffit pour partager votre profil, vos avis Google, votre WhatsApp ou votre Instagram.",
    orderCta: "Commander votre carte",
    productsCta: "Découvrir les produits",
    goalTitle: "Que voulez-vous partager ?",
    goalSubtitle: "Choisissez votre objectif, nous proposons le produit adapté.",
    howTitle: "Comment ça marche",
    howSteps: [
      {
        title: "1. Vous commandez",
        desc: "Choisissez un produit, décrivez votre besoin et envoyez votre demande en quelques minutes.",
      },
      {
        title: "2. Nous préparons",
        desc: "Nous vous contactons pour confirmer les détails avant la production de votre carte.",
      },
      {
        title: "3. Vous partagez",
        desc: "Un passage de votre carte devant un téléphone ouvre votre destination. Sans application à installer.",
      },
    ],
    pricingTitle: "Combien ça coûte ?",
    pricingDesc:
      "Chaque demande est étudiée individuellement : décrivez votre besoin et recevez un prix confirmé avant production. Aucun montant n'est débité en ligne.",
    pricingCta: "Demander un prix",
    faqTitle: "Questions fréquentes",
    faqItems: [
      {
        q: "Faut-il installer une application ?",
        a: "Non, ni pour commander, ni pour recevoir une carte. Tout fonctionne dans le navigateur.",
      },
      {
        q: "Comment sont confirmés le prix et la livraison ?",
        a: "Après votre demande, Karti vous contacte pour confirmer les détails, le prix et la livraison avant production.",
      },
      {
        q: "Puis-je modifier ma carte après réception ?",
        a: "Oui. La destination derrière votre carte reste modifiable sans remplacer l'objet physique.",
      },
    ],
    finalTitle: "Prêt à partager en un geste ?",
    finalSubtitle: "Commandez votre carte Karti en quelques minutes, sans créer de compte.",
  },
  products: {
    PERSONAL_CARD: {
      name: "Carte Personnelle",
      tagline: "Partagez votre identité professionnelle en un geste.",
      outcome:
        "La Carte Personnelle ouvre votre profil numérique : nom, fonction, coordonnées et liens. Idéale pour les rencontres professionnelles où chaque seconde compte.",
      tapEffect: "Le téléphone du visiteur ouvre directement votre profil Karti.",
      audienceTitle: "Pour qui ?",
      audience: [
        "Indépendants et consultants",
        "Commerciaux et cadres",
        "Toute personne qui réseautent régulièrement",
      ],
      benefitsTitle: "Ce que vous y gagnez",
      benefits: [
        "Un seul objet à présenter au lieu d'une carte papier",
        "Vos informations restent modifiables sans réimprimer",
        "Enregistrement du contact en un clic",
        "Tous vos liens réunis au même endroit",
      ],
      stepsTitle: "Comment ça marche",
      steps: [
        "Commandez votre Carte Personnelle",
        "Nous créons votre profil avec vos informations",
        "Présentez la carte : votre profil s'ouvre",
      ],
      pricing: "Prix confirmé après étude de votre demande.",
      faq: [
        {
          q: "Faut-il une application pour recevoir mon profil ?",
          a: "Non. Le profil s'ouvre dans le navigateur du téléphone du visiteur.",
        },
        {
          q: "Puis-je modifier mes informations après réception ?",
          a: "Oui. Votre profil est modifiable et la carte pointe toujours vers la version à jour.",
        },
        {
          q: "Que se passe-t-il si je change de poste ?",
          a: "Votre profil est mis à jour sans changer la carte physique.",
        },
      ],
    },
    CAREER_CARD: {
      name: "Carte Carrière",
      tagline: "Partagez votre CV et votre identité professionnelle.",
      outcome:
        "La Carte Carrière présente votre parcours aux recruteurs et contacts professionnels : identité, titre visé, CV, liens portfolio et coordonnées.",
      tapEffect: "Le téléphone du visiteur ouvre votre profil carrière.",
      audienceTitle: "Pour qui ?",
      audience: [
        "Étudiants et jeunes diplômés",
        "Personnes en recherche d'emploi",
        "Professionnels du networking carrière",
      ],
      benefitsTitle: "Ce que vous y gagnez",
      benefits: [
        "Votre CV accessible en un geste lors d'événements",
        "Une présentation plus complète qu'une carte papier",
        "Vos liens professionnels réunis",
        "Aucun CV final exigé à la commande",
      ],
      stepsTitle: "Comment ça marche",
      steps: [
        "Commandez votre Carte Carrière",
        "Nous créons votre profil avec vos informations",
        "Présentez la carte : votre profil carrière s'ouvre",
      ],
      pricing: "Prix confirmé après étude de votre demande.",
      faq: [
        {
          q: "Dois-je fournir mon CV définitif à la commande ?",
          a: "Non. Indiquez simplement si vous avez un CV ; le contenu est finalisé avec vous ensuite.",
        },
        {
          q: "La carte convient-elle aux étudiants ?",
          a: "Oui, elle est pensée pour les étudiants et jeunes diplômés autant que pour les profils expérimentés.",
        },
        {
          q: "Puis-je ajouter mon portfolio ou GitHub ?",
          a: "Oui, vos liens professionnels sont intégrés à votre profil.",
        },
      ],
    },
    BUSINESS_CARD: {
      name: "Carte Business",
      tagline: "Présentez votre entreprise et donnez un lieu unique d'action.",
      outcome:
        "La Carte Business ouvre le profil de votre entreprise : appel, WhatsApp, itinéraire, site web et réseaux. Vos clients agissent en un clic.",
      tapEffect: "Le téléphone du visiteur ouvre le profil de votre entreprise.",
      audienceTitle: "Pour qui ?",
      audience: ["Commerces et restaurants", "Agences et prestataires", "Entreprises locales"],
      benefitsTitle: "Ce que vous y gagnez",
      benefits: [
        "Un point d'entrée unique vers votre entreprise",
        "Appel, WhatsApp et itinéraire en un clic",
        "Présentation modifiable sans réimprimer",
        "Adaptée aux comptoirs et lieux d'accueil",
      ],
      stepsTitle: "Comment ça marche",
      steps: [
        "Commandez votre Carte Business",
        "Nous créons le profil de votre entreprise",
        "Présentez la carte : vos clients agissent",
      ],
      pricing: "Prix confirmé après étude de votre demande.",
      faq: [
        {
          q: "Quelles actions mes clients peuvent-ils faire ?",
          a: "Appeler, ouvrir WhatsApp, suivre l'itinéraire, visiter votre site et vos réseaux.",
        },
        {
          q: "Faut-il un logo pour commander ?",
          a: "Non. Indiquez si vous avez un logo ; nous finalisons la présentation avec vous.",
        },
        {
          q: "Où placer la carte ?",
          a: "Comptoir, caisse, salle d'attente : partout où vos clients vous rencontrent.",
        },
      ],
    },
    GOOGLE_REVIEW_CARD: {
      name: "Carte Avis Google",
      tagline: "Réduisez les étapes vers votre page d'avis Google.",
      outcome:
        "La Carte Avis Google ouvre directement votre destination d'avis Google. Moins d'étapes pour vos clients, plus d'avis sans effort.",
      tapEffect: "Le téléphone du visiteur ouvre votre page d'avis Google.",
      audienceTitle: "Pour qui ?",
      audience: [
        "Restaurants et cafés",
        "Salons et cliniques",
        "Tout commerce qui vit des avis clients",
      ],
      benefitsTitle: "Ce que vous y gagnez",
      benefits: [
        "Vos clients atteignent la page d'avis en un geste",
        "Aucune recherche manuelle de votre établissement",
        "Carte réutilisable : la destination reste modifiable",
        "Aide disponible si vous ne trouvez pas votre lien",
      ],
      stepsTitle: "Comment ça marche",
      steps: [
        "Commandez en indiquant votre lien d'avis, ou demandez de l'aide",
        "Nous configurons la carte vers votre page d'avis",
        "Présentez la carte à vos clients satisfaits",
      ],
      pricing: "Prix confirmé après étude de votre demande.",
      faq: [
        {
          q: "Je ne trouve pas mon lien d'avis Google. Puis-je commander ?",
          a: "Oui. Cochez « J'ai besoin d'aide » et nous retrouvons le lien avec vous.",
        },
        {
          q: "La carte garantit-elle plus d'avis ?",
          a: "Non. Elle réduit le nombre d'étapes ; le choix de laisser un avis reste au client.",
        },
        {
          q: "Puis-je changer de lien plus tard ?",
          a: "Oui, la destination de la carte reste modifiable sans la remplacer.",
        },
      ],
    },
    WHATSAPP_CARD: {
      name: "Carte WhatsApp",
      tagline: "Démarrez une conversation sans saisir de numéro.",
      outcome:
        "La Carte WhatsApp ouvre une conversation avec votre numéro, avec un message pré-rempli si vous le souhaitez. Vos clients n'ont rien à saisir.",
      tapEffect: "Le téléphone du visiteur ouvre WhatsApp vers votre numéro.",
      audienceTitle: "Pour qui ?",
      audience: [
        "Commerces avec service client",
        "Artisans et prestataires",
        "Équipes commerciales",
      ],
      benefitsTitle: "Ce que vous y gagnez",
      benefits: [
        "Zéro saisie : la conversation s'ouvre directement",
        "Message d'accueil pré-rempli possible",
        "Numéro modifiable sans changer la carte",
        "Idéal en point de vente et sur les emballages",
      ],
      stepsTitle: "Comment ça marche",
      steps: [
        "Commandez avec votre numéro WhatsApp",
        "Nous configurons la carte vers votre conversation",
        "Vos clients scannent et discutent",
      ],
      pricing: "Prix confirmé après étude de votre demande.",
      faq: [
        {
          q: "Puis-je ajouter un message pré-rempli ?",
          a: "Oui, indiquez-le à la commande ; il accompagnera l'ouverture de la conversation.",
        },
        {
          q: "Les numéros internationaux sont-ils acceptés ?",
          a: "Oui, les numéros marocains et internationaux valides sont acceptés.",
        },
        {
          q: "Puis-je changer de numéro plus tard ?",
          a: "Oui, la destination reste modifiable sans remplacer la carte.",
        },
      ],
    },
    INSTAGRAM_CARD: {
      name: "Carte Instagram",
      tagline: "Ouvrez votre profil Instagram depuis un point physique.",
      outcome:
        "La Carte Instagram ouvre directement votre profil. Parfaite sur un comptoir, un packaging ou lors d'événements.",
      tapEffect: "Le téléphone du visiteur ouvre votre profil Instagram.",
      audienceTitle: "Pour qui ?",
      audience: ["Créateurs et influenceurs", "Marques et boutiques", "Restaurants et lieux"],
      benefitsTitle: "Ce que vous y gagnez",
      benefits: [
        "Votre profil s'ouvre sans recherche manuelle",
        "Nom d'utilisateur ou lien acceptés à la commande",
        "Profil modifiable sans changer la carte",
        "Utile en boutique, événement et packaging",
      ],
      stepsTitle: "Comment ça marche",
      steps: [
        "Commandez avec votre nom d'utilisateur ou lien",
        "Nous configurons la carte vers votre profil",
        "Vos visiteurs scannent et vous suivent",
      ],
      pricing: "Prix confirmé après étude de votre demande.",
      faq: [
        {
          q: "Que dois-je fournir : pseudo ou lien ?",
          a: "Les deux sont acceptés : pseudo, @pseudo ou lien de profil Instagram.",
        },
        {
          q: "La carte garantit-elle plus d'abonnés ?",
          a: "Non. Elle supprime les étapes pour atteindre votre profil.",
        },
        {
          q: "Puis-je changer de compte plus tard ?",
          a: "Oui, la destination reste modifiable sans remplacer la carte.",
        },
      ],
    },
    CONTACT_CARD: {
      name: "Carte Contact",
      tagline: "Une expérience contact ciblée, enregistrement facile.",
      outcome:
        "La Carte Contact ouvre un profil minimal centré sur l'essentiel : nom, téléphone, e-mail et enregistrement du contact.",
      tapEffect: "Le téléphone du visiteur ouvre votre fiche contact.",
      audienceTitle: "Pour qui ?",
      audience: [
        "Professions de terrain",
        "Équipes événementielles",
        "Toute personne qui partage souvent son numéro",
      ],
      benefitsTitle: "Ce que vous y gagnez",
      benefits: [
        "L'essentiel uniquement : pas de distraction",
        "Enregistrement du contact en un clic",
        "Coordonnées modifiables sans réimprimer",
        "Parfaite en grand volume de rencontres",
      ],
      stepsTitle: "Comment ça marche",
      steps: [
        "Commandez avec vos coordonnées",
        "Nous créons votre fiche contact",
        "Présentez la carte : on vous enregistre",
      ],
      pricing: "Prix confirmé après étude de votre demande.",
      faq: [
        {
          q: "Quelle différence avec la Carte Personnelle ?",
          a: "La Carte Contact est volontairement minimale : coordonnées et enregistrement, sans liens étendus.",
        },
        {
          q: "L'e-mail est-il obligatoire ?",
          a: "Non. Seuls le nom et le téléphone sont requis.",
        },
        {
          q: "Puis-je modifier mon numéro plus tard ?",
          a: "Oui, votre fiche reste modifiable sans changer la carte.",
        },
      ],
    },
    CUSTOM_LINK_CARD: {
      name: "Carte Lien Personnalisé",
      tagline: "Ouvrez n'importe quelle destination approuvée.",
      outcome:
        "La Carte Lien Personnalisé ouvre la page HTTPS de votre choix : menu, réservation, catalogue ou page spéciale. La carte reste réutilisable.",
      tapEffect: "Le téléphone du visiteur ouvre votre lien.",
      audienceTitle: "Pour qui ?",
      audience: ["Campagnes temporaires", "Menus et catalogues", "Pages de réservation"],
      benefitsTitle: "Ce que vous y gagnez",
      benefits: [
        "N'importe quelle page HTTPS validée",
        "Destination modifiable pour chaque campagne",
        "Une seule carte réutilisable",
        "Idéale pour les contenus qui changent",
      ],
      stepsTitle: "Comment ça marche",
      steps: [
        "Commandez avec votre lien et son usage",
        "Nous validons et configurons la destination",
        "Présentez la carte : votre page s'ouvre",
      ],
      pricing: "Prix confirmé après étude de votre demande.",
      faq: [
        {
          q: "Quels liens sont acceptés ?",
          a: "Les pages HTTPS valides. Les protocoles non web sont refusés.",
        },
        {
          q: "Puis-je réutiliser la carte pour une autre campagne ?",
          a: "Oui, c'est son principe : la destination se reconfigure sans remplacer la carte.",
        },
        {
          q: "Mon lien est-il vérifié ?",
          a: "Oui, chaque destination est validée avant configuration.",
        },
      ],
    },
  },
  productPage: {
    whoTitle: "Pour qui ?",
    benefitsTitle: "Avantages",
    howTitle: "Comment ça marche",
    pricingTitle: "Tarif",
    faqTitle: "Questions fréquentes",
    relatedTitle: "Produits liés",
    orderCta: "Commander ce produit",
    profileNote: "Ce produit utilise votre profil Karti, modifiable à tout moment.",
    directNote: "Ce produit ouvre directement votre destination, sans profil.",
  },
  order: {
    title: "Commander",
    subtitle: "Décrivez votre besoin en 4 étapes. Sans compte, sans paiement en ligne.",
    steps: {
      card: "Votre carte",
      details: "Vos coordonnées",
      delivery: "Livraison",
      review: "Vérification",
    },
    stepOf: "Étape",
    back: "Retour",
    continue: "Continuer",
    selectProductTitle: "Choisissez votre produit",
    selectProductHint: "Sélectionnez la carte qui correspond à votre besoin.",
    quantity: "Quantité",
    configTitle: "Votre configuration",
    quoteNote: "Prix confirmé après étude de votre demande.",
    fields: {
      fullName: "Nom complet",
      professionalTitle: "Titre professionnel",
      fieldOfStudyOrWork: "Domaine d'études ou de travail",
      hasCv: "Avez-vous un CV ?",
      yes: "Oui",
      no: "Non",
      businessName: "Nom de l'entreprise",
      businessCategory: "Catégorie d'activité",
      hasLogo: "J'ai un logo",
      reviewUrl: "Lien d'avis Google",
      needsUrlHelp: "Lien d'avis",
      needsUrlHelpOption: "J'ai besoin d'aide pour trouver mon lien d'avis Google",
      reviewHelpNote: "Pas de souci : nous retrouverons le lien ensemble après votre demande.",
      whatsappNumber: "Numéro WhatsApp",
      predefinedMessage: "Message pré-rempli (optionnel)",
      predefinedMessageHint: "Ce message accompagnera l'ouverture de la conversation.",
      instagram: "Instagram",
      instagramHint: "Pseudo, @pseudo ou lien de profil Instagram.",
      company: "Entreprise",
      phone: "Téléphone",
      sameWhatsapp: "Utiliser ce numéro pour WhatsApp",
      whatsapp: "WhatsApp",
      email: "E-mail",
      preferredContact: "Contact préféré",
      contactWhatsapp: "WhatsApp",
      contactPhone: "Téléphone",
      contactEmail: "E-mail",
      city: "Ville",
      address: "Adresse de livraison",
      addressHint: "Rue, numéro, quartier, repère…",
      instructions: "Instructions de livraison (optionnel)",
      destinationUrl: "Lien de destination",
      purpose: "Usage prévu (optionnel)",
    },
    deliveryNote:
      "La livraison et le prix final seront confirmés par Karti après étude de votre demande.",
    review: {
      title: "Vérifiez votre demande",
      product: "Produit",
      quantity: "Quantité",
      configuration: "Configuration",
      customer: "Client",
      preferredContact: "Contact préféré",
      delivery: "Livraison",
      pricing: "Tarification",
      edit: "Modifier",
      sendRequest: "Envoyer la demande",
      quotePending: "Devis à confirmer",
      submitting: "Envoi en cours…",
    },
    errors: {
      checkHighlighted: "Veuillez vérifier les informations surlignées.",
      submitFailed:
        "Nous n'avons pas pu envoyer votre demande. Vos informations sont conservées sur cette page. Veuillez réessayer.",
      tooFast: "Veuillez prendre quelques secondes pour remplir le formulaire.",
    },
    validation: {
      required: "Ce champ est requis.",
      invalidEmail: "Entrez une adresse e-mail valide.",
      invalidPhone: "Entrez un numéro de téléphone valide.",
      invalidUrl: "Entrez un lien https valide.",
      invalidInstagram: "Entrez un pseudo ou un lien de profil Instagram.",
      reviewUrlRequired: "Le lien d'avis est requis, sauf si vous demandez de l'aide.",
      quantityMin: "La quantité doit être d'au moins 1.",
    },
  },
  success: {
    title: "Commande reçue",
    orderLabel: "Numéro de commande",
    productLabel: "Produit",
    quantityLabel: "Quantité",
    nextSteps:
      "Nous allons vous contacter pour confirmer les détails avant production. Aucun paiement n'est demandé à cette étape.",
    whatsappCta: "Continuer sur WhatsApp",
    whatsappMessage: "Bonjour, je viens de passer la commande {order} pour {qty} × {product}.",
    backHome: "Retour à l'accueil",
    invalidTitle: "Reçu indisponible",
    invalidMessage:
      "Ce lien de confirmation est invalide ou a expiré. Si vous venez de commander, vos informations sont bien enregistrées : contactez-nous pour vérifier.",
  },
  contact: {
    title: "Contact",
    subtitle: "Une question, une commande en volume, un partenariat ? Écrivez-nous.",
    name: "Nom",
    phone: "Téléphone",
    email: "E-mail",
    company: "Entreprise",
    type: "Type de demande",
    message: "Message",
    types: {
      GENERAL: "Question générale",
      BULK_ORDER: "Commande en volume",
      CORPORATE: "Entreprise",
      PARTNERSHIP: "Partenariat",
      CUSTOM_REQUEST: "Demande personnalisée",
      OTHER: "Autre",
    },
    submit: "Envoyer le message",
    submitting: "Envoi en cours…",
    confirmationTitle: "Message reçu",
    confirmationMessage: "Merci ! Nous reviendrons vers vous très vite.",
    newMessage: "Envoyer un autre message",
  },
  common: {
    backToHome: "Retour à l'accueil",
    unavailable: "Cette page est indisponible.",
  },
};
