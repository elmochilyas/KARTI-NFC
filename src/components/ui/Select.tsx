import type { SelectHTMLAttributes } from "react";

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  invalid?: boolean;
};

export function Select({ invalid = false, className = "", children, ...props }: SelectProps) {
  return (
    <select
      aria-invalid={invalid || undefined}
      className={`min-h-11 w-full rounded-md border bg-surface px-3 text-base text-text disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-muted ${
        invalid ? "border-danger" : "border-border"
      } ${className}`}
      {...props}
    >
      {children}
    </select>
  );
}
