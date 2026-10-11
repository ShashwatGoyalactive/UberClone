import type { RideTier } from "@/lib/fares";

/** The vehicle illustrations from the canvas ("4 · Choose ride"). */
export function VehicleIcon({ tier, className }: { tier: RideTier; className?: string }) {
  if (tier === "bike") {
    return (
      <svg viewBox="0 0 56 40" className={className} aria-hidden="true">
        <circle cx="12" cy="28" r="8" fill="none" stroke="currentColor" strokeWidth="3" />
        <circle cx="44" cy="28" r="8" fill="none" stroke="currentColor" strokeWidth="3" />
        <path
          d="M12 28l10-14h12l10 14M26 14l-4-6h-6"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (tier === "auto") {
    return (
      <svg viewBox="0 0 56 40" className={className} aria-hidden="true">
        <path d="M8 30V16a8 8 0 0 1 8-8h16l12 10h4v12z" fill="var(--primary)" />
        <circle cx="16" cy="31" r="5" fill="currentColor" />
        <circle cx="42" cy="31" r="5" fill="currentColor" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 56 40" className={className} aria-hidden="true">
      <path
        d="M6 28l5-10a5 5 0 0 1 4.5-3h23a5 5 0 0 1 4.3 2.5L48 26h2a2 2 0 0 1 2 2v4H4v-2a2 2 0 0 1 2-2z"
        fill={tier === "prime" ? "var(--primary)" : "currentColor"}
      />
      <circle cx="15" cy="32" r="5" fill="var(--card)" stroke="currentColor" strokeWidth="3" />
      <circle cx="41" cy="32" r="5" fill="var(--card)" stroke="currentColor" strokeWidth="3" />
    </svg>
  );
}
