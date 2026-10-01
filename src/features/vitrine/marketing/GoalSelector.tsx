/**
 * Premium product advisor (client island). Desktop (lg+): large
 * selectable goal rows on the left, live product/result preview on the
 * right. Mobile: compact 2-column icon+title buttons with the selected
 * preview immediately below, so goal and result stay connected.
 * Rows read as product outcomes (icon + title), not form options.
 */
"use client";

import Link from "next/link";
import { LuBriefcase, LuBuilding2, LuLink2, LuPhone, LuUser } from "react-icons/lu";
import { SiGoogle, SiInstagram, SiWhatsapp } from "react-icons/si";
import { useState } from "react";
import type { ProductType } from "@/domain/orders";
import { trackEvent } from "../analytics";
import type { VitrineDict, VitrineLocale } from "../i18n/dict";
import { orderPath, productPath } from "../site";
import { productSlugFromType } from "../products";
import { CardMockup } from "./Mockups";

const GOAL_ICONS: Record<ProductType, typeof LuUser> = {
  PERSONAL_CARD: LuUser,
  CAREER_CARD: LuBriefcase,
  BUSINESS_CARD: LuBuilding2,
  GOOGLE_REVIEW_CARD: SiGoogle,
  WHATSAPP_CARD: SiWhatsapp,
  INSTAGRAM_CARD: SiInstagram,
  CONTACT_CARD: LuPhone,
  CUSTOM_LINK_CARD: LuLink2,
};

export function GoalSelector({ locale, dict }: { locale: VitrineLocale; dict: VitrineDict }) {
  const goals = dict.marketingHome.goals;
  const [selected, setSelected] = useState(0);
  const current = goals[selected] ?? goals[0];
  if (!current) return null;
  const slug = productSlugFromType(current.product);

  return (
    <div className="grid gap-4 lg:grid-cols-2 lg:gap-8">
      <div
        role="listbox"
        aria-label={dict.home.goalTitle}
        className="grid grid-cols-2 items-stretch gap-2 sm:gap-2.5 lg:flex lg:flex-col lg:gap-2.5"
      >
        {goals.map((goal, index) => {
          const active = selected === index;
          const Icon = GOAL_ICONS[goal.product];
          return (
            <button
              key={goal.product}
              type="button"
              role="option"
              aria-selected={active}
              onClick={() => {
                setSelected(index);
                trackEvent("goal_selected", { product: goal.product, locale });
              }}
              className={`flex w-full cursor-pointer flex-col items-start gap-1.5 rounded-2xl border-2 p-2.5 text-start transition-colors focus-visible:outline-2 sm:p-3 lg:flex-row lg:items-center lg:gap-3 ${
                active
                  ? "border-accent bg-accent/[0.07] shadow-card"
                  : "border-border bg-surface hover:border-muted hover:bg-surface-muted/50"
              }`}
            >
              <span
                aria-hidden="true"
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl lg:h-11 lg:w-11 ${
                  active ? "bg-accent text-accent-contrast" : "bg-surface-muted text-muted"
                }`}
              >
                <Icon className="h-4 w-4 lg:h-5 lg:w-5" />
              </span>
              <span className="min-w-0">
                <span className="block text-[13px] leading-snug font-bold text-text lg:truncate lg:text-base">
                  {goal.title}
                </span>
                <span className="mt-0.5 hidden truncate text-[13px] text-muted lg:block">
                  {goal.desc}
                </span>
              </span>
            </button>
          );
        })}
      </div>
      <div className="lg:sticky lg:top-24 lg:self-start">
        <div
          aria-live="polite"
          className="flex flex-col gap-4 rounded-[1.75rem] border-2 border-accent/30 bg-surface p-5 md:p-6"
        >
          <div className="flex justify-center">
            <CardMockup label={dict.products[current.product].name} sublabel={current.audience} />
          </div>
          <div>
            <p className="text-sm font-semibold text-accent">
              {dict.products[current.product].name}
            </p>
            <p className="mt-1 text-xl font-bold tracking-tight text-text md:text-2xl">
              {current.title}
            </p>
            <p className="mt-2 text-[15px] text-muted">{current.audience}</p>
            <p className="mt-4 rounded-xl bg-surface-muted px-4 py-3 text-base text-text">
              <span aria-hidden="true" className="font-bold text-accent">
                →{" "}
              </span>
              {current.tap}
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href={productPath(locale, slug)}
              className="inline-flex min-h-12 flex-1 items-center justify-center rounded-lg border border-border bg-surface px-6 text-base font-medium hover:border-muted"
            >
              {dict.marketingHome.goalCtaProduct}
            </Link>
            <Link
              href={orderPath(locale, slug)}
              className="inline-flex min-h-12 flex-1 items-center justify-center rounded-lg bg-accent px-6 text-base font-medium text-accent-contrast hover:bg-accent-strong"
            >
              {dict.marketingHome.goalCtaOrder}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
