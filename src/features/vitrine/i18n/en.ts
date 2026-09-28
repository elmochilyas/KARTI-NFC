/**
 * English vitrine copy. Same structure as French; factual only.
 */

import type { VitrineDict } from "./dict";

export const enDict: VitrineDict = {
  dir: "ltr",
  localeName: "English",
  nav: {
    products: "Products",
    solutions: "Solutions",
    howItWorks: "How it works",
    pricing: "Pricing",
    examples: "Examples",
    faq: "FAQ",
    contact: "Contact",
    orderCta: "Order your card",
  },
  footer: {
    tagline: "The smart contact card, always up to date.",
    productsTitle: "Products",
    companyTitle: "Karti",
    contactLink: "Contact us",
    orderLink: "Order",
    notice: "Prices and timelines are confirmed after reviewing your request.",
  },
  home: {
    heroTitle: "One card, one gesture. Your contact is shared.",
    heroSubtitle:
      "Karti turns a physical card into a digital experience: one tap on a phone is enough to share your profile, Google reviews, WhatsApp or Instagram.",
    orderCta: "Order your card",
    productsCta: "Explore products",
    goalTitle: "What do you want to share?",
    goalSubtitle: "Pick your goal and we will suggest the right product.",
    howTitle: "How it works",
    howSteps: [
      {
        title: "1. You order",
        desc: "Pick a product, describe your need and send your request in minutes.",
      },
      {
        title: "2. We prepare",
        desc: "We contact you to confirm the details before producing your card.",
      },
      {
        title: "3. You share",
        desc: "Tap your card on a phone to open your destination. No app to install.",
      },
    ],
    pricingTitle: "How much does it cost?",
    pricingDesc:
      "Every request is reviewed individually: describe your need and get a confirmed price before production. Nothing is charged online.",
    pricingCta: "Request a price",
    faqTitle: "Frequently asked questions",
    faqItems: [
      {
        q: "Do I need to install an app?",
        a: "No, neither to order nor to receive a card. Everything works in the browser.",
      },
      {
        q: "How are price and delivery confirmed?",
        a: "After your request, Karti contacts you to confirm details, price and delivery before production.",
      },
      {
        q: "Can I change my card after receiving it?",
        a: "Yes. The destination behind your card stays editable without replacing the physical object.",
      },
    ],
    finalTitle: "Ready to share in one gesture?",
    finalSubtitle: "Order your Karti card in minutes, with no account needed.",
  },
  products: {
    PERSONAL_CARD: {
      name: "Personal Card",
      tagline: "Share your professional identity in one gesture.",
      outcome:
        "The Personal Card opens your digital profile: name, title, contact details and links. Made for professional meetings where every second counts.",
      tapEffect: "The visitor's phone opens your Karti profile directly.",
      audienceTitle: "Who is it for?",
      audience: [
        "Freelancers and consultants",
        "Salespeople and managers",
        "Anyone who networks regularly",
      ],
      benefitsTitle: "What you get",
      benefits: [
        "One object to present instead of a paper card",
        "Your details stay editable without reprinting",
        "One-click contact saving",
        "All your links in one place",
      ],
      stepsTitle: "How it works",
      steps: [
        "Order your Personal Card",
        "We create your profile with your details",
        "Present the card: your profile opens",
      ],
      pricing: "Price confirmed after reviewing your request.",
      faq: [
        {
          q: "Does the visitor need an app to see my profile?",
          a: "No. The profile opens in the visitor's phone browser.",
        },
        {
          q: "Can I update my details after receiving the card?",
          a: "Yes. Your profile stays editable and the card always points to the latest version.",
        },
        {
          q: "What if I change jobs?",
          a: "Your profile is updated without changing the physical card.",
        },
      ],
    },
    CAREER_CARD: {
      name: "Career Card",
      tagline: "Share your CV and professional identity.",
      outcome:
        "The Career Card presents your background to recruiters and professional contacts: identity, target title, CV, portfolio links and contact details.",
      tapEffect: "The visitor's phone opens your career profile.",
      audienceTitle: "Who is it for?",
      audience: ["Students and graduates", "Job seekers", "Career networkers"],
      benefitsTitle: "What you get",
      benefits: [
        "Your CV available in one gesture at events",
        "A richer presentation than a paper card",
        "Your professional links brought together",
        "No final CV required at checkout",
      ],
      stepsTitle: "How it works",
      steps: [
        "Order your Career Card",
        "We create your profile with your details",
        "Present the card: your career profile opens",
      ],
      pricing: "Price confirmed after reviewing your request.",
      faq: [
        {
          q: "Must I provide my final CV when ordering?",
          a: "No. Just tell us whether you have a CV; content is finalized with you afterwards.",
        },
        {
          q: "Is the card suitable for students?",
          a: "Yes, it is designed for students and graduates as much as experienced profiles.",
        },
        {
          q: "Can I add my portfolio or GitHub?",
          a: "Yes, your professional links are part of your profile.",
        },
      ],
    },
    BUSINESS_CARD: {
      name: "Business Card",
      tagline: "Present your business with one place to act.",
      outcome:
        "The Business Card opens your company profile: call, WhatsApp, directions, website and socials. Your customers act in one click.",
      tapEffect: "The visitor's phone opens your business profile.",
      audienceTitle: "Who is it for?",
      audience: ["Shops and restaurants", "Agencies and services", "Local businesses"],
      benefitsTitle: "What you get",
      benefits: [
        "One entry point to your business",
        "Call, WhatsApp and directions in one click",
        "Editable presentation without reprinting",
        "Suited for counters and reception areas",
      ],
      stepsTitle: "How it works",
      steps: [
        "Order your Business Card",
        "We create your business profile",
        "Present the card: your customers act",
      ],
      pricing: "Price confirmed after reviewing your request.",
      faq: [
        {
          q: "What can my customers do?",
          a: "Call, open WhatsApp, get directions, visit your website and socials.",
        },
        {
          q: "Do I need a logo to order?",
          a: "No. Tell us whether you have one; we finalize the presentation with you.",
        },
        {
          q: "Where should I place the card?",
          a: "Counter, checkout, waiting room: anywhere you meet customers.",
        },
      ],
    },
    GOOGLE_REVIEW_CARD: {
      name: "Google Review Card",
      tagline: "Shorten the path to your Google review page.",
      outcome:
        "The Google Review Card opens your Google review destination directly. Fewer steps for your customers, more reviews with no effort.",
      tapEffect: "The visitor's phone opens your Google review page.",
      audienceTitle: "Who is it for?",
      audience: [
        "Restaurants and cafés",
        "Salons and clinics",
        "Any business that lives on customer reviews",
      ],
      benefitsTitle: "What you get",
      benefits: [
        "Customers reach the review page in one gesture",
        "No manual search for your business",
        "Reusable card: the destination stays editable",
        "Help available if you cannot find your link",
      ],
      stepsTitle: "How it works",
      steps: [
        "Order with your review link, or ask for help",
        "We configure the card to your review page",
        "Present the card to happy customers",
      ],
      pricing: "Price confirmed after reviewing your request.",
      faq: [
        {
          q: "I cannot find my Google review link. Can I still order?",
          a: "Yes. Check “I need help” and we will find the link together.",
        },
        {
          q: "Does the card guarantee more reviews?",
          a: "No. It reduces the number of steps; leaving a review stays the customer's choice.",
        },
        {
          q: "Can I change the link later?",
          a: "Yes, the card destination stays editable without replacing it.",
        },
      ],
    },
    WHATSAPP_CARD: {
      name: "WhatsApp Card",
      tagline: "Start a conversation without typing a number.",
      outcome:
        "The WhatsApp Card opens a conversation with your number, with a pre-filled message if you want. Your customers type nothing.",
      tapEffect: "The visitor's phone opens WhatsApp to your number.",
      audienceTitle: "Who is it for?",
      audience: ["Shops with customer service", "Craftspeople and providers", "Sales teams"],
      benefitsTitle: "What you get",
      benefits: [
        "Zero typing: the conversation opens directly",
        "Optional pre-filled welcome message",
        "Number editable without changing the card",
        "Great at points of sale and on packaging",
      ],
      stepsTitle: "How it works",
      steps: [
        "Order with your WhatsApp number",
        "We configure the card to your conversation",
        "Your customers scan and chat",
      ],
      pricing: "Price confirmed after reviewing your request.",
      faq: [
        {
          q: "Can I add a pre-filled message?",
          a: "Yes, include it in your order; it will accompany the conversation opening.",
        },
        {
          q: "Are international numbers accepted?",
          a: "Yes, valid Moroccan and international numbers are accepted.",
        },
        {
          q: "Can I change numbers later?",
          a: "Yes, the destination stays editable without replacing the card.",
        },
      ],
    },
    INSTAGRAM_CARD: {
      name: "Instagram Card",
      tagline: "Open your Instagram profile from a physical touchpoint.",
      outcome:
        "The Instagram Card opens your profile directly. Perfect on a counter, packaging or at events.",
      tapEffect: "The visitor's phone opens your Instagram profile.",
      audienceTitle: "Who is it for?",
      audience: ["Creators", "Brands and shops", "Restaurants and venues"],
      benefitsTitle: "What you get",
      benefits: [
        "Your profile opens with no manual search",
        "Username or link accepted at checkout",
        "Profile editable without changing the card",
        "Useful in store, at events and on packaging",
      ],
      stepsTitle: "How it works",
      steps: [
        "Order with your username or link",
        "We configure the card to your profile",
        "Your visitors scan and follow you",
      ],
      pricing: "Price confirmed after reviewing your request.",
      faq: [
        {
          q: "What should I provide: handle or link?",
          a: "Both work: handle, @handle or Instagram profile link.",
        },
        {
          q: "Does the card guarantee more followers?",
          a: "No. It removes the steps to reach your profile.",
        },
        {
          q: "Can I change accounts later?",
          a: "Yes, the destination stays editable without replacing the card.",
        },
      ],
    },
    CONTACT_CARD: {
      name: "Contact Card",
      tagline: "A focused contact experience, easy saving.",
      outcome:
        "The Contact Card opens a minimal profile focused on the essentials: name, phone, email and contact saving.",
      tapEffect: "The visitor's phone opens your contact sheet.",
      audienceTitle: "Who is it for?",
      audience: ["Field professionals", "Event teams", "Anyone who often shares their number"],
      benefitsTitle: "What you get",
      benefits: [
        "Only the essentials: no distraction",
        "One-click contact saving",
        "Details editable without reprinting",
        "Perfect for high-volume meetings",
      ],
      stepsTitle: "How it works",
      steps: [
        "Order with your contact details",
        "We create your contact sheet",
        "Present the card: people save you",
      ],
      pricing: "Price confirmed after reviewing your request.",
      faq: [
        {
          q: "How is it different from the Personal Card?",
          a: "The Contact Card is deliberately minimal: details and saving, no extended links.",
        },
        {
          q: "Is email required?",
          a: "No. Only name and phone are required.",
        },
        {
          q: "Can I change my number later?",
          a: "Yes, your sheet stays editable without changing the card.",
        },
      ],
    },
    CUSTOM_LINK_CARD: {
      name: "Custom Link Card",
      tagline: "Open any approved destination.",
      outcome:
        "The Custom Link Card opens the HTTPS page of your choice: menu, booking, catalog or special page. The card stays reusable.",
      tapEffect: "The visitor's phone opens your link.",
      audienceTitle: "Who is it for?",
      audience: ["Temporary campaigns", "Menus and catalogs", "Booking pages"],
      benefitsTitle: "What you get",
      benefits: [
        "Any validated HTTPS page",
        "Destination editable for each campaign",
        "One reusable card",
        "Made for changing content",
      ],
      stepsTitle: "How it works",
      steps: [
        "Order with your link and its purpose",
        "We validate and configure the destination",
        "Present the card: your page opens",
      ],
      pricing: "Price confirmed after reviewing your request.",
      faq: [
        {
          q: "Which links are accepted?",
          a: "Valid HTTPS pages. Non-web protocols are refused.",
        },
        {
          q: "Can I reuse the card for another campaign?",
          a: "Yes, that is its purpose: the destination reconfigures without replacing the card.",
        },
        {
          q: "Is my link verified?",
          a: "Yes, every destination is validated before configuration.",
        },
      ],
    },
  },
  productPage: {
    whoTitle: "Who is it for?",
    benefitsTitle: "Benefits",
    howTitle: "How it works",
    pricingTitle: "Pricing",
    faqTitle: "Frequently asked questions",
    relatedTitle: "Related products",
    orderCta: "Order this product",
    profileNote: "This product uses your Karti profile, editable at any time.",
    directNote: "This product opens your destination directly, with no profile.",
  },
  order: {
    title: "Order",
    subtitle: "Describe your need in 4 steps. No account, no online payment.",
    steps: {
      card: "Your card",
      details: "Your details",
      delivery: "Delivery",
      review: "Review",
    },
    stepOf: "Step",
    back: "Back",
    continue: "Continue",
    selectProductTitle: "Choose your product",
    selectProductHint: "Select the card that matches your need.",
    quantity: "Quantity",
    configTitle: "Your configuration",
    quoteNote: "Price confirmed after reviewing your request.",
    fields: {
      fullName: "Full name",
      professionalTitle: "Professional title",
      fieldOfStudyOrWork: "Field of study or work",
      hasCv: "Do you have a CV?",
      yes: "Yes",
      no: "No",
      businessName: "Business name",
      businessCategory: "Business category",
      hasLogo: "I have a logo",
      reviewUrl: "Google review link",
      needsUrlHelp: "Review link",
      needsUrlHelpOption: "I need help finding my Google review link",
      reviewHelpNote: "No problem: we will find the link together after your request.",
      whatsappNumber: "WhatsApp number",
      predefinedMessage: "Pre-filled message (optional)",
      predefinedMessageHint: "This message will accompany the conversation opening.",
      instagram: "Instagram",
      instagramHint: "Handle, @handle or Instagram profile link.",
      company: "Company",
      phone: "Phone",
      sameWhatsapp: "Use this number for WhatsApp",
      whatsapp: "WhatsApp",
      email: "Email",
      preferredContact: "Preferred contact",
      contactWhatsapp: "WhatsApp",
      contactPhone: "Phone",
      contactEmail: "Email",
      city: "City",
      address: "Delivery address",
      addressHint: "Street, number, district, landmark…",
      instructions: "Delivery instructions (optional)",
      destinationUrl: "Destination link",
      purpose: "Intended use (optional)",
    },
    deliveryNote:
      "Delivery and final price will be confirmed by Karti after reviewing your request.",
    review: {
      title: "Review your request",
      product: "Product",
      quantity: "Quantity",
      configuration: "Configuration",
      customer: "Customer",
      preferredContact: "Preferred contact",
      delivery: "Delivery",
      pricing: "Pricing",
      edit: "Edit",
      sendRequest: "Send request",
      quotePending: "Quote to confirm",
      submitting: "Sending…",
    },
    errors: {
      checkHighlighted: "Please check the highlighted information.",
      submitFailed:
        "We couldn't submit your request. Your information is still on this page. Please try again.",
      tooFast: "Please take a few seconds to fill in the form.",
    },
    validation: {
      required: "This field is required.",
      invalidEmail: "Enter a valid email address.",
      invalidPhone: "Enter a valid phone number.",
      invalidUrl: "Enter a valid https link.",
      invalidInstagram: "Enter an Instagram handle or profile link.",
      reviewUrlRequired: "The review link is required unless you ask for help.",
      quantityMin: "Quantity must be at least 1.",
    },
  },
  success: {
    title: "Order received",
    orderLabel: "Order number",
    productLabel: "Product",
    quantityLabel: "Quantity",
    nextSteps:
      "We will contact you to confirm the details before production. No payment is requested at this stage.",
    whatsappCta: "Continue on WhatsApp",
    whatsappMessage: "Hello, I just placed order {order} for {qty} × {product}.",
    backHome: "Back to home",
    invalidTitle: "Receipt unavailable",
    invalidMessage:
      "This confirmation link is invalid or expired. If you just ordered, your details are safely recorded: contact us to verify.",
  },
  contact: {
    title: "Contact",
    subtitle: "A question, a bulk order, a partnership? Write to us.",
    name: "Name",
    phone: "Phone",
    email: "Email",
    company: "Company",
    type: "Request type",
    message: "Message",
    types: {
      GENERAL: "General question",
      BULK_ORDER: "Bulk order",
      CORPORATE: "Business",
      PARTNERSHIP: "Partnership",
      CUSTOM_REQUEST: "Custom request",
      OTHER: "Other",
    },
    submit: "Send message",
    submitting: "Sending…",
    confirmationTitle: "Message received",
    confirmationMessage: "Thank you! We will get back to you very soon.",
    newMessage: "Send another message",
  },
  common: {
    backToHome: "Back to home",
    unavailable: "This page is unavailable.",
  },
};
