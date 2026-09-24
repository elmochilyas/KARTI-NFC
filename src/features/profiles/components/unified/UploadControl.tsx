"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import { ImagePlus, Upload, User } from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  uploadAssetAction,
  type UploadFormState,
} from "@/app/dashboard/clients/[id]/profile/actions";
import { ImageCropEditor } from "../ImageCropEditor";

const UPLOAD_INITIAL: UploadFormState = { ok: false, message: "" };

/**
 * Phase 34: avatar/cover picker extracted verbatim from the legacy
 * ProfileEditor (crop → upload → draft path). Uploads stay immediate
 * (storage objects must exist before the row references them); the returned
 * path lands in the draft as dirty until the unified Save persists it.
 */
export function UploadControl({
  label,
  kind,
  clientId,
  profileId,
  currentUrl,
  hasImage,
  assetError,
  onUploaded,
  onRemove,
}: {
  label: string;
  kind: "avatar" | "cover";
  clientId: string;
  profileId: string | null;
  currentUrl: string | null;
  hasImage: boolean;
  assetError?: string;
  onUploaded: (path: string, url: string) => void;
  onRemove: () => void;
}) {
  const [message, setMessage] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [pending, startTransition] = useTransition();
  const [pickedName, setPickedName] = useState<string | null>(null);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  // Open adjustment editor after select; upload happens only on confirm.
  const [editor, setEditor] = useState<{ file: File; url: string; origKb: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const chooseRef = useRef<HTMLLabelElement>(null);
  const inputId = useId();

  // Revoke the instant preview URL when it is replaced or unmounted.
  useEffect(() => {
    return () => {
      if (localPreview) URL.revokeObjectURL(localPreview);
    };
  }, [localPreview]);

  function clearLocalPreview() {
    if (localPreview) URL.revokeObjectURL(localPreview);
    setLocalPreview(null);
  }

  function resetInput() {
    if (fileRef.current) fileRef.current.value = "";
  }

  // No <form> here: this control lives inside the editor save form and
  // nested forms are invalid HTML (hydration error). Call the action directly.
  function uploadFile(file: File) {
    const formData = new FormData();
    formData.set("file", file);
    setFailed(false);
    setMessage("Uploading…");
    startTransition(async () => {
      const result = await uploadAssetAction(
        clientId,
        profileId ?? "pending",
        kind,
        UPLOAD_INITIAL,
        formData,
      );
      if (result.ok && result.path) {
        clearLocalPreview();
        setPickedName(null);
        onUploaded(result.path, result.publicUrl ?? "");
        resetInput();
      } else {
        resetInput();
      }
      setFailed(!result.ok);
      setMessage(result.message);
    });
  }

  function closeEditor() {
    if (editor) URL.revokeObjectURL(editor.url);
    setEditor(null);
    // Return focus to the choose control when the dialog unmounts.
    chooseRef.current?.focus();
  }

  function onSelect() {
    const file = fileRef.current?.files?.[0];
    clearLocalPreview();
    if (!file) {
      setPickedName(null);
      return;
    }
    // Instant client-side checks mirror storage.ts (server revalidates anyway).
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setFailed(true);
      setMessage("Only JPEG, PNG, or WebP images are allowed.");
      setPickedName(null);
      resetInput();
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setFailed(true);
      setMessage("Images must be 5 MB or smaller.");
      setPickedName(null);
      resetInput();
      return;
    }
    // Open the adjustment editor. Nothing uploads until confirm — the
    // previous image stays in place if the user cancels.
    setFailed(false);
    setMessage(null);
    setEditor({ file, url: URL.createObjectURL(file), origKb: (file.size / 1024).toFixed(0) });
  }

  function onEditorCancel() {
    closeEditor();
    setPickedName(null);
    resetInput();
  }

  function onEditorConfirm(cropped: File) {
    const origKb = editor?.origKb ?? (cropped.size / 1024).toFixed(0);
    closeEditor();
    setPickedName(`${cropped.name} · ${origKb} KB → ${(cropped.size / 1024).toFixed(0)} KB`);
    setLocalPreview(URL.createObjectURL(cropped));
    uploadFile(cropped);
  }

  if (!profileId) {
    return (
      <div>
        <p className="text-sm font-medium text-text">{label}</p>
        <p className="mt-1 text-sm text-muted">Save the profile once to enable uploads.</p>
      </div>
    );
  }

  const previewUrl = localPreview ?? currentUrl;

  function handleRemove() {
    clearLocalPreview();
    if (fileRef.current) fileRef.current.value = "";
    setPickedName(null);
    onRemove();
  }

  const chooseLabel =
    hasImage || currentUrl
      ? label.includes("Logo")
        ? "Change logo"
        : "Change photo"
      : label.includes("Logo")
        ? "Choose logo"
        : "Choose photo";

  return (
    <div className="flex items-start gap-4">
      {editor ? (
        <ImageCropEditor
          file={editor.file}
          sourceUrl={editor.url}
          kind={kind}
          onConfirm={onEditorConfirm}
          onCancel={onEditorCancel}
        />
      ) : null}
      <div className="relative shrink-0">
        {previewUrl ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt={
                localPreview
                  ? `Selected ${label.toLowerCase()} uploading`
                  : `Current ${label.toLowerCase()}`
              }
              className={`object-cover ${
                kind === "avatar" ? "h-20 w-20 rounded-full" : "h-20 w-36 rounded-lg"
              }`}
            />
            {pending || localPreview ? (
              <span
                aria-hidden="true"
                className="absolute inset-0 flex items-center justify-center rounded-full bg-text/40"
              >
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              </span>
            ) : null}
          </>
        ) : kind === "avatar" ? (
          <span
            aria-hidden="true"
            className="flex h-20 w-20 items-center justify-center rounded-full border border-dashed border-border bg-surface-muted text-muted"
          >
            <User className="h-8 w-8" />
          </span>
        ) : (
          <span
            aria-hidden="true"
            className="flex h-20 w-36 items-center justify-center rounded-lg border border-dashed border-border bg-surface-muted text-muted"
          >
            <ImagePlus className="h-8 w-8" />
          </span>
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <p className="text-sm font-medium text-text">{label}</p>
        <p className="text-sm text-muted">
          JPEG, PNG, or WebP · max 5 MB · adjust the crop before upload.
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <label
            ref={chooseRef}
            htmlFor={inputId}
            tabIndex={-1}
            className={`inline-flex min-h-11 cursor-pointer items-center justify-center gap-1.5 rounded-md bg-surface-muted px-4 text-sm font-medium text-text transition-colors hover:bg-border ${
              pending ? "pointer-events-none opacity-60" : ""
            }`}
          >
            {pending ? (
              <span
                aria-hidden="true"
                className="h-4 w-4 animate-spin rounded-full border-2 border-border border-t-accent"
              />
            ) : (
              <Upload aria-hidden="true" className="h-4 w-4" />
            )}
            {pending ? "Uploading…" : chooseLabel}
          </label>
          <input
            ref={fileRef}
            id={inputId}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={onSelect}
            disabled={pending}
            className="sr-only"
          />
          {hasImage || localPreview ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={handleRemove}
              disabled={pending}
              className="text-danger hover:bg-danger-muted hover:text-danger"
            >
              Remove
            </Button>
          ) : null}
        </div>
        <div aria-live="polite">
          {pickedName && !failed ? (
            <p className="truncate text-sm text-muted">{pickedName}</p>
          ) : null}
          {message && !pending ? (
            <p
              role={failed ? "alert" : "status"}
              className={`text-sm ${failed ? "font-medium text-danger" : "text-muted"}`}
            >
              {message}
            </p>
          ) : null}
          {assetError ? (
            <p role="alert" className="text-sm font-medium text-danger">
              {assetError}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
