/**
 * Minimal locale layer for the public vitrine (Phase 2).
 *
 * French is the primary marketing locale; Arabic is RTL; English is LTR.
 * Canonical business enums (ProductType, statuses) are never translated —
 * only UI/content labels live here. Every locale file must satisfy
 * `VitrineDict`, so a missing key is a compile error, not a runtime gap.
 */

import type { ProductType } from "@/domain/orders/productTypes";

export const VITRINE_LOCALES = ["fr", "ar", "en"] as const;

export type VitrineLocale = (typeof VITRINE_LOCALES)[number];

export const DEFAULT_LOCALE: VitrineLocale = "fr";

export function isVitrineLocale(value: unknown): value is VitrineLocale {
  return typeof value === "string" && (VITRINE_LOCALES as readonly string[]).includes(value);
}

export type ProductCopy = {
  name: string;
  tagline: string;
  outcome: string;
  tapEffect: string;
  audienceTitle: string;
  audience: string[];
  benefitsTitle: string;
  benefits: string[];
  stepsTitle: string;
  steps: string[];
  pricing: string;
  faq: { q: string; a: string }[];
  /** Distinct customer problem this product solves (never boilerplate). */
  problem: string;
  useCases: string[];
  customization: string;
  included: string[];
};

export type SolutionKey = "professionals" | "students" | "businesses";

export type FaqItem = { q: string; a: string };

export type ContentSection = { heading: string; paragraphs: string[] };

export type OrderStepCopy = {
  card: string;
  details: string;
  delivery: string;
  review: string;
};

export type VitrineDict = {
  dir: "ltr" | "rtl";
  localeName: string;
  nav: {
    products: string;
    solutions: string;
    howItWorks: string;
    pricing: string;
    examples: string;
    resources: string;
    faq: string;
    contact: string;
    orderCta: string;
    menu: string;
    closeMenu: string;
    language: string;
    profileGroup: string;
    directGroup: string;
  };
  footer: {
    tagline: string;
    productsTitle: string;
    solutionsTitle: string;
    learnTitle: string;
    companyTitle: string;
    legalTitle: string;
    contactLink: string;
    orderLink: string;
    notice: string;
    rights: string;
    cookiePreferences: string;
  };
  consent: {
    title: string;
    message: string;
    accept: string;
    reject: string;
  };
  home: {
    heroTitle: string;
    heroSubtitle: string;
    orderCta: string;
    productsCta: string;
    goalTitle: string;
    goalSubtitle: string;
    howTitle: string;
    howSteps: { title: string; desc: string }[];
    pricingTitle: string;
    pricingDesc: string;
    pricingCta: string;
    faqTitle: string;
    faqItems: { q: string; a: string }[];
    finalTitle: string;
    finalSubtitle: string;
  };
  products: Record<ProductType, ProductCopy>;
  productPage: {
    whoTitle: string;
    benefitsTitle: string;
    howTitle: string;
    pricingTitle: string;
    faqTitle: string;
    relatedTitle: string;
    orderCta: string;
    profileNote: string;
    directNote: string;
    outcomeTitle: string;
    demoTitle: string;
    includedTitle: string;
    useCasesTitle: string;
    customizationTitle: string;
    examplesTitle: string;
    whyTitle: string;
    finalTitle: string;
    finalSubtitle: string;
  };
  order: {
    title: string;
    subtitle: string;
    steps: OrderStepCopy;
    stepOf: string;
    back: string;
    continue: string;
    selectProductTitle: string;
    selectProductHint: string;
    quantity: string;
    configTitle: string;
    quoteNote: string;
    fields: {
      fullName: string;
      professionalTitle: string;
      fieldOfStudyOrWork: string;
      hasCv: string;
      yes: string;
      no: string;
      businessName: string;
      businessCategory: string;
      hasLogo: string;
      reviewUrl: string;
      needsUrlHelp: string;
      needsUrlHelpOption: string;
      reviewHelpNote: string;
      whatsappNumber: string;
      predefinedMessage: string;
      predefinedMessageHint: string;
      instagram: string;
      instagramHint: string;
      company: string;
      phone: string;
      sameWhatsapp: string;
      whatsapp: string;
      email: string;
      preferredContact: string;
      contactWhatsapp: string;
      contactPhone: string;
      contactEmail: string;
      city: string;
      address: string;
      addressHint: string;
      instructions: string;
      destinationUrl: string;
      purpose: string;
    };
    deliveryNote: string;
    review: {
      title: string;
      product: string;
      quantity: string;
      configuration: string;
      customer: string;
      preferredContact: string;
      delivery: string;
      pricing: string;
      edit: string;
      sendRequest: string;
      quotePending: string;
      submitting: string;
    };
    errors: {
      checkHighlighted: string;
      submitFailed: string;
      tooFast: string;
    };
    validation: {
      required: string;
      invalidEmail: string;
      invalidPhone: string;
      invalidUrl: string;
      invalidInstagram: string;
      reviewUrlRequired: string;
      quantityMin: string;
    };
  };
  success: {
    title: string;
    orderLabel: string;
    productLabel: string;
    quantityLabel: string;
    nextSteps: string;
    whatsappCta: string;
    /** Template with {order}, {qty}, {product} placeholders. */
    whatsappMessage: string;
    backHome: string;
    invalidTitle: string;
    invalidMessage: string;
  };
  contact: {
    title: string;
    subtitle: string;
    name: string;
    phone: string;
    email: string;
    company: string;
    type: string;
    message: string;
    types: {
      GENERAL: string;
      BULK_ORDER: string;
      CORPORATE: string;
      PARTNERSHIP: string;
      CUSTOM_REQUEST: string;
      OTHER: string;
    };
    submit: string;
    submitting: string;
    confirmationTitle: string;
    confirmationMessage: string;
    newMessage: string;
  };
  common: {
    backToHome: string;
    unavailable: string;
    skipToContent: string;
    home: string;
    products: string;
    learnMore: string;
    orderNow: string;
    requestPrice: string;
    talkToUs: string;
    helpMeChoose: string;
    viewExamples: string;
    demoExample: string;
    stickyOrder: string;
    stickyRequest: string;
  };
  meta: {
    home: { title: string; description: string };
    solutionsProfessionals: { title: string; description: string };
    solutionsStudents: { title: string; description: string };
    solutionsBusinesses: { title: string; description: string };
    howItWorks: { title: string; description: string };
    pricing: { title: string; description: string };
    examples: { title: string; description: string };
    faq: { title: string; description: string };
    resources: { title: string; description: string };
    articleNfcVsQr: { title: string; description: string };
    articleReviewLink: { title: string; description: string };
    articleDestinationChange: { title: string; description: string };
    legalPrivacy: { title: string; description: string };
    legalTerms: { title: string; description: string };
    legalDelivery: { title: string; description: string };
  };
  marketingHome: {
    heroSupport: string;
    heroSecondary: string;
    trustItems: string[];
    goals: { product: ProductType; title: string; desc: string; audience: string; tap: string }[];
    goalCtaProduct: string;
    goalCtaOrder: string;
    demoTitle: string;
    demoSubtitle: string;
    demoTabs: { id: string; label: string; phoneTitle: string; phoneLines: string[] }[];
    audiencesTitle: string;
    audiencesSubtitle: string;
    audiences: { solution: SolutionKey; title: string; desc: string }[];
    whyTitle: string;
    whySubtitle: string;
    whyItems: { title: string; desc: string }[];
    redirectTitle: string;
    redirectSubtitle: string;
    redirectSteps: { title: string; desc: string }[];
    todayLabel: string;
    laterLabel: string;
    sameCardLabel: string;
    examplesTitle: string;
    examplesSubtitle: string;
    pricingTiers: { title: string; desc: string; cta: string }[];
    processTitle: string;
    processSteps: { title: string; desc: string }[];
    finalHelpTitle: string;
    finalHelpCta: string;
    finalTalkCta: string;
  };
  solutions: Record<
    SolutionKey,
    {
      name: string;
      tagline: string;
      outcome: string;
      problemsTitle: string;
      problems: string[];
      recommendTitle: string;
      recommend: { product: ProductType; why: string }[];
      faq: FaqItem[];
    }
  >;
  howItWorks: {
    title: string;
    subtitle: string;
    whatTitle: string;
    whatBody: string[];
    tapTitle: string;
    tapSteps: { title: string; desc: string }[];
    qrTitle: string;
    qrBody: string;
    redirectTitle: string;
    redirectBody: string[];
    compareTitle: string;
    compare: { title: string; desc: string }[];
    recipientTitle: string;
    recipientBody: string;
    operatorTitle: string;
    operatorBody: string;
    faqTitle: string;
    faq: FaqItem[];
  };
  pricingPage: {
    title: string;
    subtitle: string;
    tiersTitle: string;
    tiers: { title: string; desc: string; points: string[]; cta: string }[];
    includedTitle: string;
    included: string[];
    factorsTitle: string;
    factors: string[];
    processTitle: string;
    processSteps: { title: string; desc: string }[];
    faqTitle: string;
    faq: FaqItem[];
    ctaTitle: string;
    ctaSubtitle: string;
  };
  examplesPage: {
    title: string;
    subtitle: string;
    categories: { id: string; label: string }[];
    items: {
      name: string;
      category: string;
      product: ProductType;
      useCase: string;
      tapResult: string;
    }[];
    note: string;
  };
  faqHub: {
    title: string;
    subtitle: string;
    categories: { name: string; items: FaqItem[] }[];
  };
  resourcesPage: {
    title: string;
    subtitle: string;
    topicsTitle: string;
    topics: { title: string; desc: string; href: string }[];
    guidesTitle: string;
    comingTitle: string;
    comingDesc: string;
  };
  articles: Record<
    ArticleSlug,
    {
      title: string;
      description: string;
      intro: string;
      sections: ContentSection[];
      faq: FaqItem[];
    }
  >;
  legal: {
    updatedLabel: string;
    privacyTitle: string;
    termsTitle: string;
    deliveryTitle: string;
    privacy: ContentSection[];
    terms: ContentSection[];
    delivery: ContentSection[];
  };
};

export type ArticleSlug = "nfc-vs-qr" | "get-review-link" | "destination-change";

/**
 * Phase 5 split: base dicts (fr/en/ar.ts) carry the Phase 2 namespaces,
 * *-marketing files carry the new ones. getDict merges both halves into
 * a full VitrineDict, so a missing key in either half is still a
 * compile error.
 */
export type VitrineMarketingKeys =
  | "meta"
  | "marketingHome"
  | "solutions"
  | "howItWorks"
  | "pricingPage"
  | "examplesPage"
  | "faqHub"
  | "resourcesPage"
  | "articles"
  | "legal";

export type VitrineBaseDict = Omit<VitrineDict, VitrineMarketingKeys>;

export type VitrineMarketingDict = Pick<VitrineDict, VitrineMarketingKeys>;
