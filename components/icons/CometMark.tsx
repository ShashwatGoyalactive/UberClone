/**
 * The comet mark: an orange head with three tapered tail strokes.
 * Pass `tone="ink"` on an orange background (the app icon), per
 * docs/DESIGN_SYSTEM.md §2.
 */
export function CometMark({
  size = 28,
  tone = "brand",
  className,
}: {
  size?: number;
  tone?: "brand" | "ink";
  className?: string;
}) {
  const colour = tone === "ink" ? "var(--ink)" : "var(--primary)";
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" className={className}>
      <path d="M30 34 L8 56" stroke={colour} strokeWidth="7" strokeLinecap="round" />
      <path
        d="M37 40 L22 58"
        stroke={colour}
        strokeWidth="4"
        strokeLinecap="round"
        opacity="0.55"
      />
      <path d="M25 28 L6 40" stroke={colour} strokeWidth="4" strokeLinecap="round" opacity="0.55" />
      <circle cx="40" cy="24" r="14" fill={colour} />
    </svg>
  );
}

/** Mark plus the lowercase "comet" wordmark, with an optional product suffix. */
export function CometLogo({ suffix, size = 28 }: { suffix?: "pilot" | "ops"; size?: number }) {
  return (
    <span className="inline-flex items-center gap-2">
      <CometMark size={size} />
      <span className="font-heading text-lg font-bold tracking-tight">
        comet
        {suffix && (
          <span className={suffix === "pilot" ? " text-brand-text" : " text-muted-foreground"}>
            {" "}
            {suffix}
          </span>
        )}
      </span>
    </span>
  );
}
