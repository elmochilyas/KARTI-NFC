import { cloneElement, isValidElement, type ReactNode } from "react";

export type FieldProps = {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
};

/**
 * Label + control + hint/error block. The control receives `id` and
 * `aria-describedby` so assistive tech announces hint/error text.
 */
export function Field({ id, label, hint, error, required = false, children }: FieldProps) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  const control = isValidElement<{
    id?: string;
    "aria-describedby"?: string;
    required?: boolean;
    "aria-required"?: boolean;
  }>(children)
    ? cloneElement(children, {
        id,
        "aria-describedby": describedBy,
        ...(required ? { "aria-required": true as const } : null),
      })
    : children;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-text">
        {label}
        {required ? (
          <span aria-hidden="true" className="ml-1 text-danger">
            *
          </span>
        ) : null}
      </label>
      {control}
      {hint && !error ? (
        <p id={hintId} className="text-sm text-muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} role="alert" className="text-sm font-medium text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
