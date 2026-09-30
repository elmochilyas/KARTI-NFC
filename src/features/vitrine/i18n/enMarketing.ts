/**
 * English marketing content (Phase 5). Mirrors frMarketing keys exactly;
 * copy is reviewed English, not machine output.
 */

import type { VitrineMarketingDict } from "./dict";

export const enMarketing: VitrineMarketingDict = {
  meta: {
    home: {
      title: "Karti — Smart NFC cards: share with one tap",
      description:
        "Karti builds NFC cards for professional profiles, businesses, CVs, Google reviews, WhatsApp and more. One tap on a phone is enough, no app needed.",
    },
    solutionsProfessionals: {
      title: "Karti for professionals — Personal & Contact Cards",
      description:
        "Freelancers, salespeople, consultants: share your profile, contact details and links with one tap using the Karti Personal or Contact Card.",
    },
    solutionsStudents: {
      title: "Karti for students & job seekers — Career Card",
      description:
        "CV, LinkedIn and professional identity with one tap: the Karti Career Card for career fairs, interviews and internships.",
    },
    solutionsBusinesses: {
      title: "Karti for businesses — Business, Google Review, WhatsApp",
      description:
        "Business profile, Google reviews, WhatsApp and Instagram with one tap: Karti cards built for shops and companies.",
    },
    howItWorks: {
      title: "How it works — NFC, QR and Karti permanent redirect",
      description:
        "Tap NFC, backup QR, permanent redirect: understand how a Karti card shares your profile or link, with no app.",
    },
    pricing: {
      title: "Karti pricing — Request a price per product",
      description:
        "Karti cards are quoted on request based on product, quantity and customization. Describe your need and receive a confirmed price.",
    },
    examples: {
      title: "Karti card examples — Use cases per product",
      description:
        "See what each Karti card opens after the tap: profiles, Google reviews, WhatsApp, Instagram. Demo examples.",
    },
    faq: {
      title: "Karti FAQ — Frequently asked questions about NFC cards",
      description:
        "App, NFC, QR, updates, ordering, design, delivery: answers to frequently asked questions about Karti cards.",
    },
    resources: {
      title: "Karti resources — NFC, review and destination guides",
      description:
        "Practical guides: NFC vs QR, finding your Google review link, changing destination without changing card.",
    },
    articleNfcVsQr: {
      title: "NFC business card or QR code: which to choose? — Karti guide",
      description: "Tap speed, QR universality: how Karti combines both on a single reusable card.",
    },
    articleReviewLink: {
      title: "How to find your Google review link? — Karti guide",
      description:
        "Where your Google review link lives, and what happens when you cannot find it: Karti finds it with you.",
    },
    articleDestinationChange: {
      title: "Change destination without changing card — Karti guide",
      description:
        "The Karti permanent redirect: your physical card stays the same while profiles and destinations evolve.",
    },
    legalPrivacy: {
      title: "Privacy — Karti",
      description: "What data Karti collects with an order or message, and how it is used.",
    },
    legalTerms: {
      title: "Order terms — Karti",
      description: "Quote request, confirmation, production: how Karti card orders work.",
    },
    legalDelivery: {
      title: "Delivery — Karti",
      description:
        "Ordering, confirmation and handover of your Karti card: the current process, nothing invented.",
    },
  },
  marketingHome: {
    heroSupport: "NFC · Backup QR · Editable destination",
    heroSecondary: "See how it works",
    trustItems: [
      "One single tap",
      "No app needed for recipients",
      "NFC + QR",
      "Editable destination",
    ],
    goals: [
      {
        product: "PERSONAL_CARD",
        title: "Share my professional profile",
        desc: "Name, title, contact details and links on one page.",
        audience: "Freelancers, salespeople, consultants",
        tap: "Your Karti profile opens.",
      },
      {
        product: "CAREER_CARD",
        title: "Share my CV and career",
        desc: "Identity, target title, CV and professional links.",
        audience: "Students, graduates, job seekers",
        tap: "Your career profile opens.",
      },
      {
        product: "BUSINESS_CARD",
        title: "Present my business",
        desc: "Call, WhatsApp, directions, website and networks.",
        audience: "Shops, agencies, local businesses",
        tap: "Your business profile opens.",
      },
      {
        product: "GOOGLE_REVIEW_CARD",
        title: "Get Google reviews",
        desc: "One tap to your review page, no searching.",
        audience: "Restaurants, shops, services",
        tap: "Your review destination opens.",
      },
      {
        product: "WHATSAPP_CARD",
        title: "Open WhatsApp",
        desc: "Instant conversation, no number typing.",
        audience: "Support, craftspeople, sales",
        tap: "The WhatsApp chat opens.",
      },
      {
        product: "INSTAGRAM_CARD",
        title: "Open Instagram",
        desc: "From physical visitor to profile visitor.",
        audience: "Shops, creators, venues",
        tap: "Your Instagram profile opens.",
      },
      {
        product: "CONTACT_CARD",
        title: "Share my contact",
        desc: "The essentials plus one-click save.",
        audience: "Field work, events, high volume",
        tap: "Your contact card opens.",
      },
      {
        product: "CUSTOM_LINK_CARD",
        title: "Open another link",
        desc: "Menu, booking, catalog: any approved page.",
        audience: "Campaigns, menus, events",
        tap: "Your link opens.",
      },
    ],
    goalCtaProduct: "View product",
    goalCtaOrder: "Order",
    demoTitle: "See what happens after the tap",
    demoSubtitle: "The card stays the same. The phone shows the destination.",
    demoTabs: [
      {
        id: "personal",
        label: "Personal",
        phoneTitle: "Sara Bennani's profile",
        phoneLines: [
          "Freelance designer",
          "Call · WhatsApp · Email",
          "Portfolio · LinkedIn · Website",
        ],
      },
      {
        id: "career",
        label: "Career",
        phoneTitle: "Yassine's career profile",
        phoneLines: ["Junior developer", "CV · LinkedIn · GitHub", "Direct contact"],
      },
      {
        id: "business",
        label: "Business",
        phoneTitle: "Café Atlas",
        phoneLines: ["Call · WhatsApp · Directions", "Menu · Instagram · Reviews"],
      },
      {
        id: "reviews",
        label: "Reviews",
        phoneTitle: "Leave a review",
        phoneLines: ["Café Atlas on Google", "Your review opens directly"],
      },
      {
        id: "whatsapp",
        label: "WhatsApp",
        phoneTitle: "WhatsApp chat",
        phoneLines: ["Hello, I have a question…", "Conversation pre-addressed"],
      },
    ],
    audiencesTitle: "Built around how you work",
    audiencesSubtitle: "Three starting points, one tap.",
    audiences: [
      {
        solution: "professionals",
        title: "Professionals",
        desc: "Networking, client meetings, first contact: your identity in one tap.",
      },
      {
        solution: "students",
        title: "Students & job seekers",
        desc: "CV, LinkedIn and portfolio shared at fairs and interviews.",
      },
      {
        solution: "businesses",
        title: "Businesses",
        desc: "Profile, reviews, WhatsApp and networks: your customers act from the counter.",
      },
    ],
    whyTitle: "Why Karti, concretely",
    whySubtitle: "Verifiable behavior, not adjectives.",
    whyItems: [
      {
        title: "One reusable card",
        desc: "A single physical object for every meeting, instead of paper stacks.",
      },
      {
        title: "Editable after delivery",
        desc: "Profiles and destinations update without replacing the card.",
      },
      {
        title: "NFC + QR",
        desc: "Tap for speed, QR when NFC is unavailable.",
      },
      {
        title: "Purpose-built experiences",
        desc: "Each product opens exactly what the visitor expects: profile, review, chat.",
      },
      {
        title: "Professional presentation",
        desc: "A clean page in your business's name, not a raw link.",
      },
      {
        title: "Permanent redirect",
        desc: "The card address never changes; only the destination evolves.",
      },
    ],
    redirectTitle: "The same card, even when everything changes",
    redirectSubtitle: "The Karti differentiator, explained simply.",
    todayLabel: "Today",
    laterLabel: "Later",
    sameCardLabel: "Same physical card",
    redirectSteps: [
      {
        title: "Today",
        desc: "Your card opens your Instagram: one tap, your profile.",
      },
      {
        title: "Later",
        desc: "You change destination: the same card opens your website. Nothing to reprint.",
      },
      {
        title: "For profiles",
        desc: "New job, new number: your profile updates, the card follows.",
      },
    ],
    examplesTitle: "What it looks like",
    examplesSubtitle: "Demo examples, not customers.",
    pricingTiers: [
      {
        title: "Profile cards",
        desc: "Personal, Career, Business: digital profile included.",
        cta: "Request a price",
      },
      {
        title: "Action cards",
        desc: "Google Review, WhatsApp, Instagram, Contact, Link: one destination, one tap.",
        cta: "Request a price",
      },
      {
        title: "Bulk & business",
        desc: "Multiple cards or specific needs: dedicated quote.",
        cta: "Request a quote",
      },
    ],
    processTitle: "Ordering, simply",
    processSteps: [
      {
        title: "You describe",
        desc: "Product, configuration and delivery in four steps, no account.",
      },
      {
        title: "We confirm",
        desc: "Karti contacts you to validate details and price before production.",
      },
      {
        title: "We prepare",
        desc: "Your card is configured to your profile or destination.",
      },
      {
        title: "You share",
        desc: "One tap or scan, and your destination opens.",
      },
    ],
    finalHelpTitle: "Not sure which card you need?",
    finalHelpCta: "Help me choose",
    finalTalkCta: "Talk to us",
  },
  solutions: {
    professionals: {
      name: "Professionals",
      tagline: "Your identity in one tap, at every meeting.",
      outcome:
        "Freelancers, salespeople and consultants share profile, contact details and links with no dictation and no paper card.",
      problemsTitle: "Everyday friction",
      problems: [
        "Repeating your number and networks at every meeting",
        "Lost or outdated paper cards",
        "Sloppy first impression when networking",
      ],
      recommendTitle: "Matching cards",
      recommend: [
        {
          product: "PERSONAL_CARD",
          why: "Your complete profile: identity, contact details, links.",
        },
        {
          product: "CONTACT_CARD",
          why: "The essentials plus save when volume matters.",
        },
      ],
      faq: [
        {
          q: "Personal Card vs Contact Card?",
          a: "Personal shows a rich profile with links; Contact keeps to essentials: contact details and save.",
        },
        {
          q: "Can my profile evolve?",
          a: "Yes. New job or new number: the profile updates, the card stays the same.",
        },
      ],
    },
    students: {
      name: "Students & job seekers",
      tagline: "Your application in one tap.",
      outcome:
        "CV, LinkedIn, portfolio and contact shared at career fairs and interviews, with no paper stack.",
      problemsTitle: "Everyday friction",
      problems: [
        "Paper CVs lost in recruiter piles",
        "LinkedIn spelled out loud, never found",
        "Portfolio and GitHub scattered around",
      ],
      recommendTitle: "Matching cards",
      recommend: [
        {
          product: "CAREER_CARD",
          why: "CV, LinkedIn and identity: the card built for applying.",
        },
        {
          product: "PERSONAL_CARD",
          why: "A complete profile when network matters as much as the CV.",
        },
        {
          product: "CONTACT_CARD",
          why: "Contact details alone for large fairs.",
        },
      ],
      faq: [
        {
          q: "Do I need a finished CV to order?",
          a: "No. Say whether you have one; the profile is completed with you afterwards.",
        },
        {
          q: "And after the career fair?",
          a: "Your profile stays online and editable: new projects, new title, same cards.",
        },
      ],
    },
    businesses: {
      name: "Businesses",
      tagline: "Your customers act from the counter.",
      outcome:
        "Business profile, Google reviews, WhatsApp and Instagram: every touchpoint becomes an action.",
      problemsTitle: "Everyday friction",
      problems: [
        "Customers looking for your details in several places",
        "Google reviews that never arrive for lack of simplicity",
        "Numbers copied with typos",
      ],
      recommendTitle: "Matching cards",
      recommend: [
        {
          product: "BUSINESS_CARD",
          why: "The complete profile: call, WhatsApp, directions, website.",
        },
        {
          product: "GOOGLE_REVIEW_CARD",
          why: "One tap to the review page, at the right moment.",
        },
        {
          product: "WHATSAPP_CARD",
          why: "The conversation with no typing for support and orders.",
        },
        {
          product: "INSTAGRAM_CARD",
          why: "From physical visitor to profile visitor.",
        },
      ],
      faq: [
        {
          q: "One card per use?",
          a: "Often yes: a Business card at the counter, a Review card at checkout, for example. Each card has its destination.",
        },
        {
          q: "Can I order several cards?",
          a: "Yes, quantity is chosen at order time and the quote accounts for it.",
        },
      ],
    },
  },
  howItWorks: {
    title: "How it works",
    subtitle: "NFC, QR and permanent redirect, explained without jargon.",
    whatTitle: "What is NFC, practically?",
    whatBody: [
      "NFC is the contactless technology already used to pay by phone: bringing two objects close exchanges a small piece of information.",
      "On a Karti card, that information is a web address. The phone opens it like any link, in the browser.",
    ],
    tapTitle: "The tap, in three steps",
    tapSteps: [
      {
        title: "Present the card",
        desc: "Hold the card near the top of the visitor's phone, NFC enabled.",
      },
      {
        title: "The phone offers the link",
        desc: "A notification or prompt offers the Karti address.",
      },
      {
        title: "The destination opens",
        desc: "Profile, review, chat or page: depending on the card presented.",
      },
    ],
    qrTitle: "What if NFC is off?",
    qrBody:
      "Each card also carries a QR leading to the same address. The visitor scans it and lands exactly where a tap would take them.",
    redirectTitle: "The address never changes",
    redirectBody: [
      "The card and its QR hold a permanent Karti address. Karti then decides where it leads.",
      "When you change profile, number or link, only that decision changes: the physical object stays valid.",
    ],
    compareTitle: "Profile or direct action?",
    compare: [
      {
        title: "Profile cards",
        desc: "Personal, Career, Business, Contact: they open your Karti page, editable at any time.",
      },
      {
        title: "Direct-action cards",
        desc: "Google Review, WhatsApp, Instagram, Link: they open the destination directly, with no intermediate page.",
      },
    ],
    recipientTitle: "And for the person across from you?",
    recipientBody:
      "Nothing to install, no account to create. Everything opens in their browser, on recent phones and older ones alike.",
    operatorTitle: "And on the preparation side?",
    operatorBody:
      "You order, Karti contacts you to confirm details, then your card is configured to your profile or destination.",
    faqTitle: "Frequently asked questions",
    faq: [
      {
        q: "Do I need an app to use a Karti card?",
        a: "No, neither to order nor to receive. The visitor's phone browser is enough.",
      },
      {
        q: "What if I change my mind about the destination?",
        a: "Nothing to reprint: the destination reconfigures and the same card keeps working.",
      },
    ],
  },
  pricingPage: {
    title: "Pricing",
    subtitle: "Every need is quoted on request. Here is how it works.",
    tiersTitle: "By card type",
    tiers: [
      {
        title: "Profile cards",
        desc: "Personal, Career, Business: digital profile included and editable.",
        points: ["Profile created with you", "Editable destination", "Backup QR included"],
        cta: "Request a price",
      },
      {
        title: "Action cards",
        desc: "Google Review, WhatsApp, Instagram, Contact, Link: one destination, one tap.",
        points: ["Configured destination", "Editable without reprinting", "Backup QR included"],
        cta: "Request a price",
      },
      {
        title: "Bulk & business",
        desc: "Multiple cards, multiple locations, specific needs.",
        points: ["Quantity of your choice", "Dedicated quote", "Guided ordering"],
        cta: "Request a quote",
      },
    ],
    includedTitle: "Always included",
    included: [
      "Physically configured card",
      "Backup QR to the same destination",
      "Detail confirmation with you before production",
      "Editable destination after delivery",
    ],
    factorsTitle: "What affects the price",
    factors: [
      "The chosen product",
      "The ordered quantity",
      "The requested customization",
      "Delivery",
    ],
    processTitle: "How to get your price",
    processSteps: [
      {
        title: "Describe",
        desc: "Product, configuration and delivery in four steps.",
      },
      {
        title: "Receive",
        desc: "Karti contacts you with a confirmed price.",
      },
      {
        title: "Approve",
        desc: "Nothing is produced or charged before your approval.",
      },
    ],
    faqTitle: "Frequently asked questions",
    faq: [
      {
        q: "Why are no prices displayed?",
        a: "Each card combines product, quantity and customization: the price is confirmed by quote, with no surprises.",
      },
      {
        q: "Is payment taken online?",
        a: "No. Nothing is charged on the website: everything is confirmed with you before production.",
      },
      {
        q: "Can I order several cards?",
        a: "Yes, quantity is chosen at order time and the quote reflects it.",
      },
    ],
    ctaTitle: "Describe your need",
    ctaSubtitle: "Four steps, no account, no online payment.",
  },
  examplesPage: {
    title: "Examples",
    subtitle: "What each card opens after the tap. Demo examples.",
    categories: [
      { id: "personal", label: "Personal" },
      { id: "career", label: "Career" },
      { id: "business", label: "Business" },
      { id: "reviews", label: "Reviews" },
      { id: "whatsapp", label: "WhatsApp" },
    ],
    items: [
      {
        name: "Consultant at a meeting",
        category: "personal",
        product: "PERSONAL_CARD",
        useCase: "Sharing identity and contact details in a client meeting.",
        tapResult: "Profile: name, title, call, WhatsApp, LinkedIn.",
      },
      {
        name: "Graduate at a fair",
        category: "career",
        product: "CAREER_CARD",
        useCase: "Applying without a paper CV at a career fair.",
        tapResult: "Career profile: target title, CV, LinkedIn, contact.",
      },
      {
        name: "Neighborhood café",
        category: "business",
        product: "BUSINESS_CARD",
        useCase: "Centralizing call, WhatsApp, directions and menu.",
        tapResult: "Business profile with one-click actions.",
      },
      {
        name: "Restaurant checkout",
        category: "reviews",
        product: "GOOGLE_REVIEW_CARD",
        useCase: "Asking for the review while paying.",
        tapResult: "Direct Google review destination.",
      },
      {
        name: "Shop support desk",
        category: "whatsapp",
        product: "WHATSAPP_CARD",
        useCase: "Opening the support chat with no number typing.",
        tapResult: "Pre-addressed WhatsApp conversation.",
      },
    ],
    note: "These examples are demo concepts built with the Karti interface, not real customers.",
  },
  faqHub: {
    title: "Frequently asked questions",
    subtitle: "Everything to know before ordering.",
    categories: [
      {
        name: "Getting started",
        items: [
          {
            q: "What is a Karti NFC card?",
            a: "A physical card that opens a digital destination — profile, review, chat or link — when presented to a phone.",
          },
          {
            q: "How do I order?",
            a: "Pick a product, describe your need in four steps, send your request. Karti contacts you to confirm before production.",
          },
          {
            q: "Do I need an account?",
            a: "No. Neither to order nor to receive a card.",
          },
        ],
      },
      {
        name: "NFC & QR",
        items: [
          {
            q: "Does the recipient need an app?",
            a: "No. Everything opens in their phone browser.",
          },
          {
            q: "What if NFC is off?",
            a: "Each card carries a QR leading to exactly the same destination.",
          },
        ],
      },
      {
        name: "Profiles",
        items: [
          {
            q: "Can I edit my profile after delivery?",
            a: "Yes. Name, contact details and links update without changing the card.",
          },
          {
            q: "What if I change jobs?",
            a: "Your profile is updated and the card points to the current version.",
          },
        ],
      },
      {
        name: "Direct-action cards",
        items: [
          {
            q: "Can I change destination later?",
            a: "Yes for direct destinations: the card reconfigures without being replaced.",
          },
          {
            q: "Does the Review card guarantee more reviews?",
            a: "No. It removes the steps to reach the review page; writing the review stays the customer's choice.",
          },
        ],
      },
      {
        name: "Ordering & design",
        items: [
          {
            q: "How is the price set?",
            a: "By quote, based on product, quantity, customization and delivery. Nothing is charged online.",
          },
          {
            q: "Can I order several cards?",
            a: "Yes, quantity is chosen at order time.",
          },
        ],
      },
      {
        name: "Delivery & contact",
        items: [
          {
            q: "How does delivery work?",
            a: "City and address are collected at order time; arrangements are confirmed with you before production.",
          },
          {
            q: "How do I contact you?",
            a: "Through the contact page for any question, bulk order or partnership.",
          },
        ],
      },
    ],
  },
  resourcesPage: {
    title: "Resources",
    subtitle: "Practical guides and useful concepts before ordering.",
    topicsTitle: "Browse by topic",
    topics: [
      {
        title: "NFC basics",
        desc: "Tap, backup QR and permanent redirect explained simply.",
        href: "/how-it-works",
      },
      {
        title: "Google reviews",
        desc: "Find your review link and turn it into a counter card.",
        href: "/resources/get-review-link",
      },
      {
        title: "Destinations",
        desc: "Change link or profile without replacing the physical card.",
        href: "/resources/destination-change",
      },
      {
        title: "Digital business cards",
        desc: "NFC vs QR: what to choose and why to combine them.",
        href: "/resources/nfc-vs-qr",
      },
    ],
    guidesTitle: "Guides",
    comingTitle: "More guides coming",
    comingDesc:
      "Networking, business presence, professional WhatsApp: upcoming guides follow the same substance requirements.",
  },
  articles: {
    "nfc-vs-qr": {
      title: "NFC business card or QR code: which to choose?",
      description: "Tap speed, QR universality: why Karti combines both on a single reusable card.",
      intro:
        "NFC tap and QR code answer the same need — opening a destination from a physical object — with different strengths. Here is how to choose, and why you don't have to.",
      sections: [
        {
          heading: "The NFC tap: speed",
          paragraphs: [
            "Holding a card near a phone opens the link with no aiming and no dedicated app, in one second. It is the smoothest face-to-face experience.",
            "The limit: NFC must be enabled on the visitor's phone, and some older devices don't support it.",
          ],
        },
        {
          heading: "The QR code: universality",
          paragraphs: [
            "Any smartphone with a camera reads a QR, with no settings. It is every Karti card's safety net.",
            "The limit: aiming the code and opening the camera app adds one step versus a tap.",
          ],
        },
        {
          heading: "Why combine both",
          paragraphs: [
            "Every Karti card carries both: tap for everyday speed, QR when NFC is unavailable. Both lead to exactly the same address.",
            "The choice is therefore not technical but situational: where, and in front of whom, do you present your card?",
          ],
        },
      ],
      faq: [
        {
          q: "Does the QR lead somewhere different than the tap?",
          a: "No. Both hold the same permanent Karti address and land on the same destination.",
        },
        {
          q: "Do I need an app to scan?",
          a: "No, the phone camera is enough in almost all cases.",
        },
      ],
    },
    "get-review-link": {
      title: "How to find your Google review link?",
      description:
        "Google listing, shareable link and the Karti fallback when the link is missing: the complete guide.",
      intro:
        "A Review card is only useful if it leads straight to your review page. Here is where that link lives — and what Karti does when you don't have it.",
      sections: [
        {
          heading: "The right link: the review page, not the listing",
          paragraphs: [
            "Your Google business listing presents your company; the review page is the screen where the customer writes. The card must lead to that page.",
            "The shortest path: from your Google listing (search your name), the review button offers a shareable address.",
          ],
        },
        {
          heading: "When you can't find the link",
          paragraphs: [
            "It's common: multiple listing accesses, old URL, recent business. At order time, simply tick the help option: Karti finds the link with you after your request.",
            "Ordering is never blocked by a missing link.",
          ],
        },
        {
          heading: "Placing the card at the right moment",
          paragraphs: [
            "Counter, checkout, table, reception: the card must be visible when the customer is satisfied, not on the way out.",
            "One tap is enough: the review destination opens directly, with no search.",
          ],
        },
      ],
      faq: [
        {
          q: "Does the card guarantee more reviews?",
          a: "No. It removes the steps; writing the review stays the customer's decision.",
        },
        {
          q: "Can I change review link later?",
          a: "Yes, the destination reconfigures without replacing the card.",
        },
      ],
    },
    "destination-change": {
      title: "Change destination without changing card",
      description:
        "Permanent redirect: how profiles and links evolve while your physical card stays the same.",
      intro:
        "Printed materials and connected objects age badly as soon as information changes. The Karti permanent redirect solves this at the root.",
      sections: [
        {
          heading: "An address that never changes",
          paragraphs: [
            "Each card and its QR hold a permanent Karti address. Karti then decides where it leads: profile, review, chat or link.",
            "Changing your mind about the destination never touches the object: only the decision changes, on Karti's side.",
          ],
        },
        {
          heading: "Profiles: information follows your life",
          paragraphs: [
            "New job, new number, new links: your profile updates and every card you handed out points to the current version.",
            "The opposite of the paper card, frozen on print day.",
          ],
        },
        {
          heading: "Destinations: one card, several lives",
          paragraphs: [
            "A Link card can open a menu this season and a booking page the next. An Instagram card can follow an account change.",
            "Reconfiguration happens with no reprint, no rewrite, no redistribution.",
          ],
        },
      ],
      faq: [
        {
          q: "Must the NFC chip be rewritten after a change?",
          a: "No. The chip holds the permanent address; the change happens on Karti's side.",
        },
        {
          q: "And the printed QR?",
          a: "Neither: it holds the same permanent address.",
        },
      ],
    },
  },
  legal: {
    updatedLabel: "Last updated",
    privacyTitle: "Privacy",
    termsTitle: "Order terms",
    deliveryTitle: "Delivery",
    privacy: [
      {
        heading: "Data collected",
        paragraphs: [
          "To process a request, Karti collects what you type: chosen product and configuration, name, phone, optional WhatsApp and email, city and delivery address, plus acquisition context (landing page, source, campaign parameters).",
          "A message through the contact form collects name, stated contact details, company if any, and message content.",
          "No account is created and no payment is collected on the website.",
        ],
      },
      {
        heading: "Use",
        paragraphs: [
          "Your information is used only to prepare your request, contact you to confirm it, and answer your messages.",
          "Audience measurement, when enabled, never contains your contact details, address or messages.",
        ],
      },
      {
        heading: "Retention and contact",
        paragraphs: [
          "Requests are kept as business records to follow up on your order. For any question about your data, write via the contact page.",
        ],
      },
    ],
    terms: [
      {
        heading: "Quote request",
        paragraphs: [
          "Ordering on the website sends a quote request, not a purchase: nothing is charged online and nothing is produced automatically.",
          "Each request is reviewed by product, quantity, customization and delivery.",
        ],
      },
      {
        heading: "Confirmation before production",
        paragraphs: [
          "Karti contacts you to confirm details and price before any production. Production only starts after your explicit approval.",
        ],
      },
      {
        heading: "Cards and destinations",
        paragraphs: [
          "Each card holds a permanent Karti address and a backup QR leading to the same destination. Profiles and direct destinations stay editable without replacing the card, within each product's limits.",
        ],
      },
    ],
    delivery: [
      {
        heading: "Current process",
        paragraphs: [
          "After your request, Karti confirms details, price and handover arrangements with you before production. City and address are collected at order time to prepare this step.",
        ],
      },
      {
        heading: "Timelines",
        paragraphs: [
          "No standard timeline is displayed: timing depends on product, quantity and your validation of details. Timelines are confirmed with you before production.",
        ],
      },
      {
        heading: "Follow-up",
        paragraphs: [
          "Your order number (KARTI-...) is the reference for every exchange. For any question, use the contact page and quote it.",
        ],
      },
    ],
  },
};
