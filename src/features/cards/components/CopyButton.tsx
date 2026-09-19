"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

/** Copy-to-clipboard with fallback; tiny, no dependencies. */
export function CopyButton({
  value,
  label,
  size = "sm",
  className = "",
}: {
  value: string;
  label: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      const area = document.createElement("textarea");
      area.value = value;
      document.body.appendChild(area);
      area.select();
      document.execCommand("copy");
      document.body.removeChild(area);
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Button
      type="button"
      variant="secondary"
      size={size}
      onClick={copy}
      aria-live="polite"
      className={className}
    >
      {copied ? "Copied ✓" : label}
    </Button>
  );
}
