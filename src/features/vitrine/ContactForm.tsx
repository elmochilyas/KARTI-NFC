/**
 * Public contact/inquiry form (client).
 *
 * Creates `inquiries` rows only — never orders. Server action validates
 * authoritatively; the browser shows friendly localized messages.
 */
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import type { VitrineDict, VitrineLocale } from "./i18n";
import { trackEvent } from "./analytics";
import { createPublicInquiryAction } from "./order/actions";

const INQUIRY_TYPES = [
  "GENERAL",
  "BULK_ORDER",
  "CORPORATE",
  "PARTNERSHIP",
  "CUSTOM_REQUEST",
  "OTHER",
] as const;

export function ContactForm({ locale, dict }: { locale: VitrineLocale; dict: VitrineDict }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [inquiryType, setInquiryType] = useState<(typeof INQUIRY_TYPES)[number]>("GENERAL");
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<{ name?: string; message?: string }>({});
  const [failed, setFailed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [startedAt] = useState<number>(() => Date.now());
  const [honeypot, setHoneypot] = useState("");

  async function submit(): Promise<void> {
    if (submitting) return;
    const next: { name?: string; message?: string } = {};
    if (name.trim() === "") next.name = dict.order.validation.required;
    if (message.trim() === "") next.message = dict.order.validation.required;
    setErrors(next);
    setFailed(false);
    if (Object.keys(next).length > 0) return;

    setSubmitting(true);
    try {
      const result = await createPublicInquiryAction({
        locale,
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim(),
        company: company.trim(),
        inquiryType,
        message: message.trim(),
        website: honeypot,
        startedAt: startedAt,
      });
      if (result.ok) {
        trackEvent("contact_inquiry_submitted", { inquiryType, locale });
        setSent(true);
        return;
      }
      setFailed(true);
    } catch {
      setFailed(true);
    } finally {
      setSubmitting(false);
    }
  }

  if (sent) {
    return (
      <div className="rounded-xl border border-border bg-surface p-6">
        <h1 className="text-xl font-bold">{dict.contact.confirmationTitle}</h1>
        <p className="mt-2 text-muted">{dict.contact.confirmationMessage}</p>
        <Button type="button" variant="secondary" size="md" onClick={() => setSent(false)}>
          {dict.contact.newMessage}
        </Button>
      </div>
    );
  }

  const c = dict.contact;
  return (
    <div className="space-y-4">
      <div aria-live="polite">
        {failed ? (
          <p role="alert" className="rounded-xl bg-danger-muted p-4 text-sm text-danger">
            {dict.order.errors.submitFailed}
          </p>
        ) : null}
      </div>
      <Field id="contact-name" label={c.name} required error={errors.name}>
        <Input
          id="contact-name"
          value={name}
          invalid={!!errors.name}
          autoComplete="name"
          onChange={(e) => setName(e.target.value)}
        />
      </Field>
      <Field id="contact-phone" label={c.phone}>
        <Input
          id="contact-phone"
          value={phone}
          inputMode="tel"
          autoComplete="tel"
          onChange={(e) => setPhone(e.target.value)}
        />
      </Field>
      <Field id="contact-email" label={c.email}>
        <Input
          id="contact-email"
          value={email}
          inputMode="email"
          autoComplete="email"
          onChange={(e) => setEmail(e.target.value)}
        />
      </Field>
      <Field id="contact-company" label={c.company}>
        <Input
          id="contact-company"
          value={company}
          autoComplete="organization"
          onChange={(e) => setCompany(e.target.value)}
        />
      </Field>
      <Field id="contact-type" label={c.type} required>
        <Select
          id="contact-type"
          value={inquiryType}
          onChange={(e) => setInquiryType(e.target.value as (typeof INQUIRY_TYPES)[number])}
        >
          {INQUIRY_TYPES.map((type) => (
            <option key={type} value={type}>
              {c.types[type]}
            </option>
          ))}
        </Select>
      </Field>
      <Field id="contact-message" label={c.message} required error={errors.message}>
        <Textarea
          id="contact-message"
          value={message}
          invalid={!!errors.message}
          onChange={(e) => setMessage(e.target.value)}
        />
      </Field>
      <div aria-hidden="true" className="absolute h-px w-px overflow-hidden">
        <label>
          Website
          <input
            type="text"
            name="website"
            tabIndex={-1}
            autoComplete="off"
            value={honeypot}
            onChange={(e) => setHoneypot(e.target.value)}
          />
        </label>
      </div>
      <Button type="button" size="lg" loading={submitting} onClick={() => void submit()}>
        {submitting ? c.submitting : c.submit}
      </Button>
    </div>
  );
}
