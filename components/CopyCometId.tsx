"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

export function CopyCometId({ cometId }: { cometId: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(cometId);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard blocked (permissions, insecure context): the ID is on
      // screen to copy by hand, so there's nothing useful to add.
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={copied ? "Comet ID copied" : "Copy Comet ID"}
      className="flex size-9 items-center justify-center rounded-sm bg-ink-raised text-on-ink hover:bg-ink-hover"
    >
      {copied ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
    </button>
  );
}
