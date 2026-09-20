import type { TextareaHTMLAttributes } from "react";

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  invalid?: boolean;
};

export function Textarea({ invalid = false, className = "", ...props }: TextareaProps) {
  return (
    <textarea
      aria-invalid={invalid || undefined}
      className={`min-h-24 w-full rounded-md border bg-surface px-3 py-2 text-base text-text placeholder:text-muted disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-muted ${
        invalid ? "border-danger" : "border-border"
      } ${className}`}
      {...props}
    />
  );
}
