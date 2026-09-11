"use client";

import { useState } from "react";

export default function PromptActions({ prompt }: { prompt: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button id="copy" onClick={copy}>
      {copied ? "✓ Copied" : "Copy Prompt"}
    </button>
  );
}
