/**
 * Which environment this deployment is, safe for the browser.
 *
 * Read from APP_ENV on the server and handed to the badge as a prop.
 * Anything missing or unrecognised reads as "dev", so a misconfigured
 * deployment shows a badge it shouldn't rather than hiding one it needs —
 * qa and stage share a database, and the badge is what stops real-looking
 * work landing in the wrong place (docs/ENVIRONMENTS.md).
 */

export const APP_ENVS = ["dev", "qa", "stage", "prod"] as const;
export type AppEnv = (typeof APP_ENVS)[number];

export function parseAppEnv(value: string | undefined): AppEnv {
  return (APP_ENVS as readonly string[]).includes(value ?? "") ? (value as AppEnv) : "dev";
}

export const APP_ENV_LABEL: Record<AppEnv, string | null> = {
  dev: "Dev",
  qa: "QA",
  stage: "Staging",
  prod: null,
};
