import { APP_ENV_LABEL, type AppEnv } from "@/lib/app-env";

/**
 * A small chip naming the environment, shown everywhere except prod.
 * Fixed to the top-right corner so it appears on every surface (landing,
 * rider, Pilot, ops) without each layout remembering to include it.
 */
export function EnvBadge({ env }: { env: AppEnv }) {
  const label = APP_ENV_LABEL[env];
  if (!label) return null;
  return (
    <span
      className="pointer-events-none fixed top-2 right-2 z-50 md:top-auto md:bottom-3 rounded-full bg-warn-soft px-2.5 py-1 text-xs font-bold tracking-wide text-warn uppercase shadow-float"
      aria-label={`${label} environment`}
    >
      {label}
    </span>
  );
}
