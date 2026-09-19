import type { InputHTMLAttributes } from "react";

export type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  invalid?: boolean;
};

export function Input({ invalid = false, className = "", ...props }: InputProps) {
  return (
    <input
      aria-invalid={invalid || undefined}
      className={`min-h-11 w-full rounded-md border bg-surface px-3 text-base text-text placeholder:text-muted disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-muted ${
        invalid ? "border-danger" : "border-border"
      } ${className}`}
      {...props}
    />
  );
}
