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
};

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
    faq: string;
    contact: string;
    orderCta: string;
  };
  footer: {
    tagline: string;
    productsTitle: string;
    companyTitle: string;
    contactLink: string;
    orderLink: string;
    notice: string;
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
  };
};
