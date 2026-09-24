"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { ArrowDown, ArrowUp, FileText, ImagePlus, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { moveSectionId } from "@/features/profiles/sectionCatalog";
import { MAPS_DETECT_FAILURE_MESSAGE } from "@/features/profiles/mapLinks";
import { osmEmbedUrl, WEEKDAY_LABELS } from "@/features/profiles/sectionSettings";
import type { SectionSettingsProps } from "@/features/profiles/sectionCatalog";

function readBoolean(settings: Record<string, unknown>, key: string, fallback: boolean): boolean {
  return typeof settings[key] === "boolean" ? (settings[key] as boolean) : fallback;
}

function Toggle({
  id,
  label,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <label
      htmlFor={id}
      className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-border bg-white px-3.5"
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-5 w-5 shrink-0 accent-[var(--color-accent,#0e7c5b)]"
      />
      <span className="text-[15px] font-semibold">{label}</span>
    </label>
  );
}

/**
 * Phase 34.2 controlled editors: every editor reads its values from the
 * `settings` prop and commits each edit via `onChange` (draft-live, no
 * save button). The unified Sections step wires `onChange` to the shared
 * draft; `onSave` remains only for legacy service-mode callers.
 */
function commitDraft(
  settings: Record<string, unknown>,
  onChange: SectionSettingsProps["onChange"],
  patch: Record<string, unknown>,
) {
  onChange?.({ ...settings, ...patch });
}

export function HeroSettingsEditor({ settings, onChange }: SectionSettingsProps) {
  const showTagline = readBoolean(settings, "showTagline", true);
  const showCategory = readBoolean(settings, "showCategory", true);
  return (
    <div className="flex flex-col gap-2">
      <Toggle
        id="hero-show-tagline"
        label="Tagline"
        checked={showTagline}
        onChange={(v) => commitDraft(settings, onChange, { showTagline: v })}
      />
      <Toggle
        id="hero-show-category"
        label="Category pill"
        checked={showCategory}
        onChange={(v) => commitDraft(settings, onChange, { showCategory: v })}
      />
    </div>
  );
}

export function ActionsSettingsEditor({ settings, onChange }: SectionSettingsProps) {
  const showQuickTiles = readBoolean(settings, "showQuickTiles", true);
  const showAbout = readBoolean(settings, "showAbout", true);
  return (
    <div className="flex flex-col gap-2">
      <Toggle
        id="actions-show-tiles"
        label="Quick action tiles"
        checked={showQuickTiles}
        onChange={(v) => commitDraft(settings, onChange, { showQuickTiles: v })}
      />
      <Toggle
        id="actions-show-about"
        label="About block"
        checked={showAbout}
        onChange={(v) => commitDraft(settings, onChange, { showAbout: v })}
      />
    </div>
  );
}

export function LinksSettingsEditor({ settings, onChange }: SectionSettingsProps) {
  const showSubtitles = readBoolean(settings, "showSubtitles", true);
  return (
    <div className="flex flex-col gap-2">
      <Toggle
        id="links-show-subtitles"
        label="Link subtitles"
        checked={showSubtitles}
        onChange={(v) => commitDraft(settings, onChange, { showSubtitles: v })}
      />
    </div>
  );
}

function readText(value: unknown, fallback = ""): string {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return fallback;
}

/**
 * Phase 34.3 link-only Location editor: the operator pastes ONE maps link,
 * Karti resolves exact coordinates internally. No latitude/longitude/zoom
 * fields — coordinates stay an implementation detail in settings.
 */
export function LocationSettingsEditor({
  settings,
  onChange,
  autoFocus,
  context,
}: SectionSettingsProps) {
  const title = readText(settings.title);
  const address = readText(settings.address);
  const mapsUrl = readText(settings.mapsUrl);
  const showMap = readBoolean(settings, "showMap", true);
  const buttonLabel = readText(settings.buttonLabel);
  const commit = (patch: Record<string, unknown>) => commitDraft(settings, onChange, patch);
  // Latest settings for async detection callbacks (avoids stale merges
  // when the operator edits other fields while detection is in flight).
  const settingsRef = useRef(settings);
  useEffect(() => {
    settingsRef.current = settings;
  });
  const commitLatest = (patch: Record<string, unknown>) =>
    onChange?.({ ...settingsRef.current, ...patch });

  type DetectStatus =
    | { state: "idle" }
    | { state: "detecting" }
    | { state: "detected" }
    | { state: "error"; message: string };
  const [status, setStatus] = useState<DetectStatus>({ state: "idle" });
  const [detecting, startDetecting] = useTransition();
  const attemptedRef = useRef<string | null>(null);

  function runDetection(url: string) {
    const trimmed = url.trim();
    if (trimmed === "" || attemptedRef.current === trimmed) return;
    if (!context?.resolveMapsLink) {
      setStatus({ state: "error", message: "Location detection is unavailable here." });
      return;
    }
    const resolveMapsLink = context.resolveMapsLink;
    attemptedRef.current = trimmed;
    setStatus({ state: "detecting" });
    startDetecting(async () => {
      try {
        const result = await resolveMapsLink(trimmed);
        if (result.ok) {
          commitLatest({ latitude: result.latitude, longitude: result.longitude });
          setStatus({ state: "detected" });
        } else {
          commitLatest({ latitude: null, longitude: null });
          setStatus({ state: "error", message: result.message });
        }
      } catch {
        commitLatest({ latitude: null, longitude: null });
        setStatus({ state: "error", message: MAPS_DETECT_FAILURE_MESSAGE });
      }
    });
  }

  // Debounced auto-detect while typing; blur detects immediately. Clearing
  // the link clears a previously detected pin (the link determines it) but
  // never touches legacy coordinates on mount.
  useEffect(() => {
    const trimmed = mapsUrl.trim();
    if (trimmed === "") {
      if (attemptedRef.current !== null) {
        attemptedRef.current = null;
        commitLatest({ latitude: null, longitude: null });
        setStatus({ state: "idle" });
      }
      return;
    }
    const timer = window.setTimeout(() => runDetection(trimmed), 700);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapsUrl]);

  const coords =
    typeof settings.latitude === "number" && typeof settings.longitude === "number"
      ? { latitude: settings.latitude, longitude: settings.longitude }
      : null;
  const inlineMap = coords ? osmEmbedUrl(coords.latitude, coords.longitude, 15) : null;

  return (
    <div className="flex flex-col gap-3">
      <Field id="location-title" label="Title">
        <Input
          type="text"
          value={title}
          onChange={(e) => commit({ title: e.target.value })}
          placeholder="Visit us"
          maxLength={80}
          autoFocus={autoFocus}
        />
      </Field>
      <Field id="location-address" label="Address / label" hint="What visitors see below the map.">
        <Input
          type="text"
          value={address}
          onChange={(e) => commit({ address: e.target.value })}
          placeholder="Jet Sakan, Hay Salam, Agadir"
          maxLength={500}
        />
      </Field>
      <Field
        id="location-maps-url"
        label="Map link"
        hint="Paste a location link from Google Maps, Apple Maps or OpenStreetMap."
      >
        <Input
          type="url"
          inputMode="url"
          value={mapsUrl}
          onChange={(e) => commit({ mapsUrl: e.target.value })}
          onBlur={() => {
            if (mapsUrl.trim() !== "") runDetection(mapsUrl);
          }}
          placeholder="https://maps.app.goo.gl/…"
          maxLength={2048}
        />
      </Field>
      <div aria-live="polite">
        {status.state === "detecting" || detecting ? (
          <p className="text-sm text-muted">Detecting location…</p>
        ) : null}
        {status.state === "detected" ? (
          <p role="status" className="text-sm font-medium text-green-700">
            ✓ Location detected
          </p>
        ) : null}
        {status.state === "error" ? (
          <p role="alert" className="text-sm font-medium text-red-700">
            {status.message}
          </p>
        ) : null}
      </div>
      {inlineMap ? (
        <div className="overflow-hidden rounded-xl border border-black/5">
          <iframe
            src={inlineMap}
            title="Detected location preview"
            loading="lazy"
            className="h-32 w-full border-0"
          />
        </div>
      ) : null}
      <Toggle
        id="location-show-map"
        label="Show map"
        checked={showMap}
        onChange={(v) => commit({ showMap: v })}
      />
      <Field id="location-button" label="Directions button">
        <Input
          type="text"
          value={buttonLabel}
          onChange={(e) => commit({ buttonLabel: e.target.value })}
          placeholder="Get Directions"
          maxLength={40}
        />
      </Field>
    </div>
  );
}

type DayDraft = { day: number; closed: boolean; open: string; close: string };

function readDays(settings: Record<string, unknown>): DayDraft[] {
  const fallback: DayDraft[] = Array.from({ length: 7 }, (_, day) => ({
    day,
    closed: false,
    open: "",
    close: "",
  }));
  const raw = settings.days;
  if (!Array.isArray(raw)) return fallback;
  return fallback.map((base) => {
    const found = raw.find(
      (d): d is Record<string, unknown> =>
        typeof d === "object" && d !== null && (d as { day?: unknown }).day === base.day,
    );
    if (!found) return base;
    return {
      day: base.day,
      closed: typeof found.closed === "boolean" ? found.closed : false,
      open: typeof found.open === "string" ? found.open : "",
      close: typeof found.close === "string" ? found.close : "",
    };
  });
}

function serializeDays(days: DayDraft[]) {
  return days.map((d) => ({
    day: d.day,
    closed: d.closed,
    open: d.closed || d.open === "" ? null : d.open,
    close: d.closed || d.close === "" ? null : d.close,
  }));
}

export function OpeningHoursSettingsEditor({
  settings,
  onChange,
  autoFocus,
}: SectionSettingsProps) {
  const timezone = readText(settings.timezone) || "UTC";
  const days = readDays(settings);
  const commit = (patch: Record<string, unknown>) => commitDraft(settings, onChange, patch);

  function setDay(day: number, patch: Partial<DayDraft>) {
    commit({
      timezone,
      days: serializeDays(days.map((d) => (d.day === day ? { ...d, ...patch } : d))),
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <Field id="hours-timezone" label="Timezone" hint="IANA name, e.g. Africa/Casablanca.">
        <Input
          type="text"
          value={timezone}
          onChange={(e) => commit({ timezone: e.target.value, days: serializeDays(days) })}
          placeholder="UTC"
          maxLength={60}
          required
          autoFocus={autoFocus}
        />
      </Field>
      <div className="flex flex-col gap-2" role="group" aria-label="Weekly schedule">
        {days.map((d) => (
          <div
            key={d.day}
            className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-white px-3 py-2"
          >
            <span className="min-w-24 flex-1 text-sm font-semibold">{WEEKDAY_LABELS[d.day]}</span>
            <label className="inline-flex min-h-9 cursor-pointer items-center gap-1.5 text-[13px] font-medium text-muted">
              <input
                type="checkbox"
                checked={d.closed}
                onChange={(e) => setDay(d.day, { closed: e.target.checked })}
                className="h-4 w-4"
                aria-label={`Closed on ${WEEKDAY_LABELS[d.day]}`}
              />
              Closed
            </label>
            <input
              type="time"
              value={d.open}
              disabled={d.closed}
              onChange={(e) => setDay(d.day, { open: e.target.value })}
              className="min-h-9 rounded-md border border-border bg-surface px-2 text-sm disabled:opacity-50"
              aria-label={`Opens ${WEEKDAY_LABELS[d.day]}`}
            />
            <span aria-hidden="true" className="text-sm text-muted">
              –
            </span>
            <input
              type="time"
              value={d.close}
              disabled={d.closed}
              onChange={(e) => setDay(d.day, { close: e.target.value })}
              className="min-h-9 rounded-md border border-border bg-surface px-2 text-sm disabled:opacity-50"
              aria-label={`Closes ${WEEKDAY_LABELS[d.day]}`}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Personal sections (Phase 31)                                        */
/* ------------------------------------------------------------------ */

export function AboutSettingsEditor({ settings, onChange, autoFocus }: SectionSettingsProps) {
  const title = readText(settings.title);
  const content = readText(settings.content);
  const commit = (patch: Record<string, unknown>) => commitDraft(settings, onChange, patch);
  return (
    <div className="flex flex-col gap-3">
      <Field id="about-title" label="Title">
        <Input
          type="text"
          value={title}
          onChange={(e) => commit({ title: e.target.value })}
          placeholder="About"
          maxLength={80}
          autoFocus={autoFocus}
        />
      </Field>
      <Field id="about-content" label="Content" hint="Plain text, up to 2000 characters.">
        <Textarea
          value={content}
          onChange={(e) => commit({ content: e.target.value })}
          placeholder="A few lines about you…"
          maxLength={2000}
          rows={5}
        />
      </Field>
    </div>
  );
}

type JobDraft = {
  id: string;
  company: string;
  role: string;
  startDate: string;
  endDate: string;
  present: boolean;
  description: string;
};

function newJobId(): string {
  return `job-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

function readJobs(settings: Record<string, unknown>): JobDraft[] {
  const raw = settings.jobs;
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((j): j is Record<string, unknown> => typeof j === "object" && j !== null)
    .map((j) => ({
      id: readText(j.id, newJobId()),
      company: readText(j.company),
      role: readText(j.role),
      startDate: readText(j.startDate),
      endDate: readText(j.endDate),
      present: j.endDate === null || j.endDate === undefined || j.endDate === "",
      description: readText(j.description),
    }));
}

function serializeJobs(jobs: JobDraft[]) {
  return jobs.map((j) => ({
    id: j.id,
    company: j.company,
    role: j.role,
    startDate: j.startDate,
    endDate: j.present ? null : j.endDate === "" ? null : j.endDate,
    description: j.description,
  }));
}

export function ExperienceSettingsEditor({ settings, onChange, autoFocus }: SectionSettingsProps) {
  const title = readText(settings.title);
  const jobs = readJobs(settings);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  function commitJobs(nextJobs: JobDraft[], nextTitle: string = title) {
    commitDraft(settings, onChange, { title: nextTitle, jobs: serializeJobs(nextJobs) });
  }

  function patchJob(id: string, patch: Partial<JobDraft>) {
    commitJobs(jobs.map((j) => (j.id === id ? { ...j, ...patch } : j)));
  }

  function moveJob(id: string, direction: -1 | 1) {
    const ids = jobs.map((j) => j.id);
    const next = moveSectionId(ids, id, ids.indexOf(id) + direction);
    if (next.join() === ids.join()) return;
    const order = new Map(next.map((jid, i) => [jid, i]));
    commitJobs([...jobs].sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0)));
  }

  function removeJob(id: string) {
    if (confirmId !== id) {
      setConfirmId(id);
      return;
    }
    setConfirmId(null);
    commitJobs(jobs.filter((j) => j.id !== id));
  }

  return (
    <div className="flex flex-col gap-3">
      <Field id="experience-title" label="Title">
        <Input
          type="text"
          value={title}
          onChange={(e) => commitJobs(jobs, e.target.value)}
          placeholder="Experience"
          maxLength={80}
          autoFocus={autoFocus}
        />
      </Field>
      {jobs.map((job, ji) => (
        <div
          key={job.id}
          className="flex flex-col gap-2 rounded-xl border border-border bg-white p-3"
        >
          <div className="grid gap-2 sm:grid-cols-2">
            <Field id={`${job.id}-company`} label="Company">
              <Input
                type="text"
                value={job.company}
                onChange={(e) => patchJob(job.id, { company: e.target.value })}
                placeholder="Company"
                maxLength={80}
                required
              />
            </Field>
            <Field id={`${job.id}-role`} label="Role">
              <Input
                type="text"
                value={job.role}
                onChange={(e) => patchJob(job.id, { role: e.target.value })}
                placeholder="Role"
                maxLength={80}
                required
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Field id={`${job.id}-start`} label="Start">
              <Input
                type="month"
                value={job.startDate}
                onChange={(e) => patchJob(job.id, { startDate: e.target.value })}
                required
              />
            </Field>
            <Field id={`${job.id}-end`} label="End">
              <Input
                type="month"
                value={job.present ? "" : job.endDate}
                disabled={job.present}
                onChange={(e) => patchJob(job.id, { endDate: e.target.value })}
              />
            </Field>
          </div>
          <label className="inline-flex min-h-9 cursor-pointer items-center gap-1.5 text-[13px] font-medium">
            <input
              type="checkbox"
              checked={job.present}
              onChange={(e) => patchJob(job.id, { present: e.target.checked })}
              className="h-4 w-4"
            />
            I currently work here
          </label>
          <Field id={`${job.id}-desc`} label="Description">
            <Textarea
              value={job.description}
              onChange={(e) => patchJob(job.id, { description: e.target.value })}
              placeholder="What you did…"
              maxLength={500}
              rows={3}
            />
          </Field>
          <div className="flex flex-wrap items-center gap-1.5">
            <Button
              type="button"
              variant="secondary"
              disabled={ji === 0}
              onClick={() => moveJob(job.id, -1)}
              aria-label={`Move ${job.role} up`}
            >
              <ArrowUp aria-hidden="true" className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={ji === jobs.length - 1}
              onClick={() => moveJob(job.id, 1)}
              aria-label={`Move ${job.role} down`}
            >
              <ArrowDown aria-hidden="true" className="h-4 w-4" />
            </Button>
            <span className="flex-1" />
            {confirmId === job.id ? (
              <>
                <Button type="button" variant="secondary" onClick={() => setConfirmId(null)}>
                  Cancel
                </Button>
                <Button type="button" variant="primary" onClick={() => removeJob(job.id)}>
                  Confirm
                </Button>
              </>
            ) : (
              <Button
                type="button"
                variant="secondary"
                onClick={() => removeJob(job.id)}
                aria-label={`Remove ${job.role}`}
              >
                <Trash2 aria-hidden="true" className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      ))}
      <Button
        type="button"
        variant="secondary"
        onClick={() =>
          commitJobs([
            ...jobs,
            {
              id: newJobId(),
              company: "",
              role: "",
              startDate: "",
              endDate: "",
              present: false,
              description: "",
            },
          ])
        }
      >
        <Plus aria-hidden="true" className="h-4 w-4" />
        Add job
      </Button>
    </div>
  );
}

function fileNameOf(path: string): string {
  const parts = path.split("/");
  return parts[parts.length - 1] || path;
}

export function CvSettingsEditor({ settings, onChange, autoFocus, context }: SectionSettingsProps) {
  const title = readText(settings.title);
  const label = readText(settings.label);
  const file = readText(settings.file);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [starting, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);
  const commit = (patch: Record<string, unknown>) => commitDraft(settings, onChange, patch);

  function upload(selected: File) {
    if (!context?.uploadDocument) {
      setError("Document upload is unavailable here.");
      return;
    }
    setError(null);
    setUploading(true);
    const uploadDocument = context.uploadDocument;
    startTransition(async () => {
      try {
        const result = await uploadDocument(selected);
        if (result.ok && result.path) {
          // Immediate storage upload; the path joins the draft and the
          // unified Save persists the reference.
          commit({ file: result.path });
        } else {
          setError(result.message || "Upload failed. Please try again.");
        }
      } catch {
        setError("Upload failed. Please try again.");
      } finally {
        setUploading(false);
      }
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <Field id="cv-title" label="Title">
        <Input
          type="text"
          value={title}
          onChange={(e) => commit({ title: e.target.value })}
          placeholder="Curriculum Vitae"
          maxLength={80}
          autoFocus={autoFocus}
        />
      </Field>
      <Field id="cv-label" label="Button label">
        <Input
          type="text"
          value={label}
          onChange={(e) => commit({ label: e.target.value })}
          placeholder="Download CV"
          maxLength={40}
        />
      </Field>
      <div className="flex items-center gap-3 rounded-xl border border-border bg-white px-3.5 py-2.5">
        <span
          aria-hidden="true"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-muted text-text"
        >
          <FileText className="h-5 w-5" />
        </span>
        <span className="min-w-0 flex-1 text-left">
          <span className="block truncate text-[15px] font-bold">
            {file === "" ? "No PDF yet" : fileNameOf(file)}
          </span>
          <span className="block text-xs font-medium text-muted">PDF, 5 MB or smaller.</span>
        </span>
        <input
          ref={fileRef}
          type="file"
          accept="application/pdf"
          className="sr-only"
          aria-label="CV PDF file"
          disabled={uploading || starting || !context?.uploadDocument}
          onChange={(e) => {
            const selected = e.target.files?.[0];
            e.target.value = "";
            if (selected) upload(selected);
          }}
        />
        <Button
          type="button"
          variant="secondary"
          disabled={uploading || starting || !context?.uploadDocument}
          onClick={() => fileRef.current?.click()}
        >
          {uploading || starting ? "Uploading…" : file === "" ? "Upload PDF" : "Replace"}
        </Button>
        {file !== "" ? (
          <Button
            type="button"
            variant="secondary"
            disabled={uploading}
            onClick={() => commit({ file: "" })}
          >
            Remove
          </Button>
        ) : null}
      </div>
      {error ? (
        <p role="alert" className="text-[13px] font-medium text-red-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Gallery (Phase 32)                                                  */
/* ------------------------------------------------------------------ */

type GalleryImageDraft = {
  id: string;
  image: string;
  alt: string;
};

function newGalleryImageId(): string {
  return `gimg-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

function readGalleryImages(settings: Record<string, unknown>): GalleryImageDraft[] {
  const raw = settings.images;
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((g): g is Record<string, unknown> => typeof g === "object" && g !== null)
    .map((g, i) => ({
      id: typeof g.id === "string" && g.id !== "" ? g.id : `gimg-${i}`,
      image: readText(g.image),
      alt: readText(g.alt),
    }));
}

function GalleryPhoto({
  id,
  image,
  alt,
  context,
  onPhotos,
  onAlt,
  onRemove,
}: {
  id: string;
  image: string;
  alt: string;
  context: SectionSettingsProps["context"];
  onPhotos: (paths: string[]) => void;
  onAlt: (alt: string) => void;
  onRemove: () => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [starting, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);
  const hasPhoto = image !== "";

  function upload(files: FileList | null) {
    if (!files || files.length === 0) return;
    if (!context?.uploadImage) {
      setError("Image upload is unavailable here.");
      return;
    }
    const uploadImage = context.uploadImage;
    setError(null);
    setUploading(true);
    startTransition(async () => {
      try {
        const paths: string[] = [];
        for (const file of Array.from(files)) {
          const result = await uploadImage(file);
          if (result.ok && result.path) {
            paths.push(result.path);
          } else {
            setError(result.message || "Upload failed. Please try again.");
            break;
          }
        }
        if (paths.length > 0) onPhotos(paths);
      } catch {
        setError("Upload failed. Please try again.");
      } finally {
        setUploading(false);
      }
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-3">
        {hasPhoto ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={sectionPreviewUrl(image)}
            alt=""
            aria-hidden="true"
            className="h-20 w-20 shrink-0 rounded-xl object-cover"
          />
        ) : (
          <span
            aria-hidden="true"
            className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-surface-muted text-muted"
          >
            <ImagePlus className="h-6 w-6" />
          </span>
        )}
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="sr-only"
            aria-label={alt === "" ? "Gallery photo" : `Replace photo: ${alt}`}
            disabled={uploading || starting || !context?.uploadImage}
            onChange={(e) => {
              const files = e.target.files;
              e.target.value = "";
              upload(files);
            }}
          />
          <div className="flex flex-wrap gap-1.5">
            <Button
              type="button"
              variant="secondary"
              disabled={uploading || starting || !context?.uploadImage}
              onClick={() => fileRef.current?.click()}
            >
              {uploading || starting ? "Uploading…" : hasPhoto ? "Add more" : "Add photos"}
            </Button>
            {hasPhoto ? (
              <Button type="button" variant="secondary" disabled={uploading} onClick={onRemove}>
                Remove
              </Button>
            ) : null}
          </div>
          {error ? (
            <p role="alert" className="text-[13px] font-medium text-red-700">
              {error}
            </p>
          ) : null}
        </div>
      </div>
      {hasPhoto ? (
        <Field id={`${id}-alt`} label="Alt text">
          <Input
            type="text"
            value={alt}
            onChange={(e) => onAlt(e.target.value)}
            placeholder="Describe the photo"
            maxLength={120}
          />
        </Field>
      ) : null}
    </div>
  );
}

/** Client-side preview URL (mirrors publicAssetPathUrl, zero-client safe). */
function sectionPreviewUrl(path: string): string {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!raw) return "";
  return `${raw.replace(/\/+$/, "")}/storage/v1/object/public/profile-assets/${path}`;
}

function serializeGalleryImages(images: GalleryImageDraft[]) {
  return images
    .filter((g) => g.image !== "")
    .map((g) => ({ id: g.id, image: g.image, alt: g.alt }));
}

export function GallerySettingsEditor({
  settings,
  onChange,
  autoFocus,
  context,
}: SectionSettingsProps) {
  const title = readText(settings.title);
  const layout = settings.layout === "masonry" ? "masonry" : "grid";
  const images = readGalleryImages(settings);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  function commitGallery(next: { title?: string; layout?: string; images?: GalleryImageDraft[] }) {
    commitDraft(settings, onChange, {
      title: next.title ?? title,
      layout: next.layout ?? layout,
      images: serializeGalleryImages(next.images ?? images),
    });
  }

  function patchImage(id: string, patch: Partial<GalleryImageDraft>) {
    commitGallery({ images: images.map((g) => (g.id === id ? { ...g, ...patch } : g)) });
  }

  function moveImage(id: string, direction: -1 | 1) {
    const ids = images.map((g) => g.id);
    const next = moveSectionId(ids, id, ids.indexOf(id) + direction);
    if (next.join() === ids.join()) return;
    const order = new Map(next.map((gid, i) => [gid, i]));
    commitGallery({
      images: [...images].sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0)),
    });
  }

  function removeImage(id: string) {
    if (confirmId !== id) {
      setConfirmId(id);
      return;
    }
    setConfirmId(null);
    commitGallery({ images: images.filter((g) => g.id !== id) });
  }

  function addBlank() {
    // Blank slots are transient upload targets: committed raw (not through
    // the blank-stripping serializer) so the row survives until a photo
    // fills it. The save path never persists empties.
    commitDraft(settings, onChange, {
      title,
      layout,
      images: [...images, { id: newGalleryImageId(), image: "", alt: "" }],
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <Field id="gallery-title" label="Title">
        <Input
          type="text"
          value={title}
          onChange={(e) => commitGallery({ title: e.target.value })}
          placeholder="Gallery"
          maxLength={80}
          autoFocus={autoFocus}
        />
      </Field>
      <div>
        <p id="gallery-layout-label" className="text-sm font-medium text-text">
          Layout
        </p>
        <div role="radiogroup" aria-labelledby="gallery-layout-label" className="mt-2 flex gap-2">
          {(
            [
              { id: "grid", label: "Grid" },
              { id: "masonry", label: "Masonry" },
            ] as const
          ).map((option) => (
            <label
              key={option.id}
              className={`radio-card inline-flex min-h-11 flex-1 cursor-pointer items-center justify-center rounded-md border px-4 text-sm font-medium ${
                layout === option.id
                  ? "border-accent bg-surface text-text"
                  : "border-border text-muted"
              }`}
            >
              <input
                type="radio"
                name="gallery-layout"
                value={option.id}
                checked={layout === option.id}
                onChange={() => commitGallery({ layout: option.id })}
                className="sr-only"
              />
              {option.label}
            </label>
          ))}
        </div>
      </div>

      {images.map((g, gi) => (
        <div
          key={g.id}
          className="flex flex-col gap-2 rounded-xl border border-border bg-white p-3"
        >
          <GalleryPhoto
            id={g.id}
            image={g.image}
            alt={g.alt}
            context={context}
            onPhotos={(paths) => {
              // First upload fills a blank row; the rest append as new rows.
              const next = images.map((row) => ({ ...row }));
              const target = next.find((row) => row.id === g.id);
              const extras: GalleryImageDraft[] = [];
              paths.forEach((path, i) => {
                if (i === 0 && target && target.image === "") {
                  target.image = path;
                } else {
                  extras.push({ id: newGalleryImageId(), image: path, alt: "" });
                }
              });
              if (!target) {
                commitGallery({ images: [...next, ...extras] });
                return;
              }
              const at = next.findIndex((row) => row.id === g.id);
              next.splice(at + 1, 0, ...extras);
              commitGallery({ images: next });
            }}
            onAlt={(nextAlt) => patchImage(g.id, { alt: nextAlt })}
            onRemove={() => removeImage(g.id)}
          />
          <div className="flex flex-wrap items-center gap-1.5">
            <Button
              type="button"
              variant="secondary"
              disabled={gi === 0}
              onClick={() => moveImage(g.id, -1)}
              aria-label={`Move photo ${gi + 1} up`}
            >
              <ArrowUp aria-hidden="true" className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={gi === images.length - 1}
              onClick={() => moveImage(g.id, 1)}
              aria-label={`Move photo ${gi + 1} down`}
            >
              <ArrowDown aria-hidden="true" className="h-4 w-4" />
            </Button>
            <span className="flex-1" />
            {confirmId === g.id ? (
              <>
                <Button type="button" variant="secondary" onClick={() => setConfirmId(null)}>
                  Cancel
                </Button>
                <Button type="button" variant="primary" onClick={() => removeImage(g.id)}>
                  Confirm
                </Button>
              </>
            ) : (
              <Button
                type="button"
                variant="secondary"
                onClick={() => removeImage(g.id)}
                aria-label={`Remove photo ${gi + 1}`}
              >
                <Trash2 aria-hidden="true" className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      ))}

      <Button type="button" variant="secondary" onClick={addBlank}>
        <Plus aria-hidden="true" className="h-4 w-4" />
        Add photo slot
      </Button>
    </div>
  );
}
