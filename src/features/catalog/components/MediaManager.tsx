"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import type { CatalogFormState } from "@/app/dashboard/catalog/actions";
import { catalogAssetUrl } from "../storagePaths";
import type { CatalogMediaRow } from "../types";

const INITIAL_STATE: CatalogFormState = {
  ok: false,
  error: { code: "", message: "" },
};

function DeleteMediaButton({
  onDelete,
  fileName,
}: {
  onDelete: () => Promise<void>;
  fileName: string;
}) {
  const [armed, setArmed] = useState(false);
  const [busy, setBusy] = useState(false);
  if (!armed) {
    return (
      <Button
        type="button"
        variant="danger"
        size="sm"
        onClick={() => setArmed(true)}
        aria-label={`Delete ${fileName}`}
      >
        Delete
      </Button>
    );
  }
  return (
    <span className="flex flex-wrap items-center gap-2">
      <Button
        type="button"
        variant="secondary"
        size="sm"
        disabled={busy}
        onClick={() => setArmed(false)}
      >
        Cancel
      </Button>
      <Button
        type="button"
        variant="danger"
        size="sm"
        disabled={busy}
        aria-label={`Confirm deletion of ${fileName}`}
        onClick={() => {
          setBusy(true);
          void onDelete().finally(() => setBusy(false));
        }}
      >
        {busy ? "Deleting…" : "Confirm delete"}
      </Button>
    </span>
  );
}

function AltForm({
  media,
  action,
}: {
  media: CatalogMediaRow;
  action: (prevState: CatalogFormState, formData: FormData) => Promise<CatalogFormState>;
}) {
  const [state, formAction, pending] = useActionState(action, INITIAL_STATE);
  const message = state.ok === false && state.error.message !== "" ? state.error.message : null;
  return (
    <form action={formAction} className="mt-3 flex flex-col gap-2" noValidate>
      {message ? (
        <p role="alert" className="text-sm font-medium text-danger">
          {message}
        </p>
      ) : null}
      <div className="grid gap-2 md:grid-cols-3">
        <Field id={`alt-fr-${media.id}`} label="Alt FR">
          <Input name="altFr" type="text" defaultValue={media.alt_fr ?? ""} />
        </Field>
        <Field id={`alt-en-${media.id}`} label="Alt EN">
          <Input name="altEn" type="text" defaultValue={media.alt_en ?? ""} />
        </Field>
        <Field id={`alt-ar-${media.id}`} label="Alt AR">
          <Input name="altAr" type="text" defaultValue={media.alt_ar ?? ""} />
        </Field>
      </div>
      <div>
        <Button type="submit" variant="secondary" size="sm" loading={pending}>
          Save alt text
        </Button>
      </div>
    </form>
  );
}

/**
 * MEDIA section: upload (JPEG/PNG/WebP, ≤5 MB), primary + OG selection,
 * gallery ordering, localized alt text, removal. All mutations are
 * admin-gated server actions.
 */
export function MediaManager({
  uploadAction,
  updateAltAction,
  setPrimaryAction,
  setOgAction,
  moveAction,
  deleteAction,
  media,
  primaryImagePath,
  ogImagePath,
}: {
  uploadAction: (prevState: CatalogFormState, formData: FormData) => Promise<CatalogFormState>;
  /**
   * Pre-bound Server Action (`productType` already bound in the Server
   * Component). The item id is bound here in the client — the same
   * supported pattern as `configureNfcAction.bind(null, clientId)`.
   * Never pass a `(mediaId) => ...` closure from the server: plain
   * functions cannot cross the Server → Client boundary (RSC error).
   */
  updateAltAction: (
    mediaId: string,
    prevState: CatalogFormState,
    formData: FormData,
  ) => Promise<CatalogFormState>;
  setPrimaryAction: (mediaId: string) => Promise<void>;
  setOgAction: (mediaId: string) => Promise<void>;
  /** Pre-bound Server Action (`productType` already bound in the Server Component). */
  moveAction: (mediaId: string, direction: "up" | "down") => Promise<void>;
  deleteAction: (mediaId: string) => Promise<void>;
  media: CatalogMediaRow[];
  primaryImagePath: string | null;
  ogImagePath: string | null;
}) {
  const [uploadState, uploadFormAction, uploadPending] = useActionState(
    uploadAction,
    INITIAL_STATE,
  );
  const uploadMessage =
    uploadState.ok === false && uploadState.error.message !== "" ? uploadState.error.message : null;
  const ordered = [...media].sort((a, b) => a.sort_order - b.sort_order);

  return (
    <div className="flex flex-col gap-6">
      <form action={uploadFormAction} className="flex flex-col gap-3" noValidate>
        {uploadMessage ? (
          <p
            role="alert"
            className="rounded-md border border-danger px-3 py-2 text-sm font-medium text-danger"
          >
            {uploadMessage}
          </p>
        ) : null}
        <Field
          id="catalog-image-file"
          label="Upload image"
          hint="JPEG, PNG, or WebP, max 5 MB. PRIMARY uploads also become the product image."
        >
          <Input name="image" type="file" accept="image/jpeg,image/png,image/webp" required />
        </Field>
        <Field id="catalog-image-role" label="Image role">
          <Select name="role" defaultValue="GALLERY">
            <option value="PRIMARY">PRIMARY — main product image</option>
            <option value="GALLERY">GALLERY — gallery image</option>
            <option value="CARD_PREVIEW">CARD_PREVIEW — card mockup</option>
            <option value="OG">OG — social share override</option>
          </Select>
        </Field>
        <div>
          <Button type="submit" loading={uploadPending}>
            Upload image
          </Button>
        </div>
      </form>

      {ordered.length === 0 ? (
        <p className="text-sm text-muted">No images yet. Upload the first product image above.</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {ordered.map((item, index) => {
            const isPrimary = primaryImagePath === item.storage_path;
            const isOg = ogImagePath === item.storage_path;
            return (
              <li key={item.id} className="rounded-xl border border-border bg-background p-4">
                <div className="flex flex-wrap items-start gap-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={catalogAssetUrl(item.storage_path)}
                    alt=""
                    className="h-20 w-20 shrink-0 rounded-lg border border-border object-cover"
                    loading="lazy"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-text">{item.media_role}</p>
                    <p className="mt-0.5 flex flex-wrap gap-2 text-xs text-muted">
                      {isPrimary ? (
                        <span className="font-semibold text-text">Primary ✓</span>
                      ) : null}
                      {isOg ? <span className="font-semibold text-text">OG ✓</span> : null}
                      <span>Order {index + 1}</span>
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {isPrimary ? null : (
                        <form action={setPrimaryAction.bind(null, item.id)}>
                          <Button type="submit" variant="secondary" size="sm">
                            Set as primary
                          </Button>
                        </form>
                      )}
                      {isOg ? null : (
                        <form action={setOgAction.bind(null, item.id)}>
                          <Button type="submit" variant="secondary" size="sm">
                            Set as OG
                          </Button>
                        </form>
                      )}
                      <form action={moveAction.bind(null, item.id, "up")}>
                        <Button
                          type="submit"
                          variant="secondary"
                          size="sm"
                          disabled={index === 0}
                          aria-label={`Move ${item.media_role} image up`}
                        >
                          ↑
                        </Button>
                      </form>
                      <form action={moveAction.bind(null, item.id, "down")}>
                        <Button
                          type="submit"
                          variant="secondary"
                          size="sm"
                          disabled={index === ordered.length - 1}
                          aria-label={`Move ${item.media_role} image down`}
                        >
                          ↓
                        </Button>
                      </form>
                      <DeleteMediaButton
                        onDelete={() => deleteAction(item.id)}
                        fileName={`${item.media_role} image ${index + 1}`}
                      />
                    </div>
                  </div>
                </div>
                <AltForm media={item} action={updateAltAction.bind(null, item.id)} />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
