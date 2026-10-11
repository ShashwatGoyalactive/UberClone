import { afterEach, describe, expect, it } from "vitest";

import { poolConfig } from "@/lib/db";

const URL_WITH_SSL =
  "postgresql://u:p@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?sslmode=require";

afterEach(() => {
  delete process.env.DATABASE_CA_CERT;
});

describe("poolConfig", () => {
  it("uses the URL as-is locally, with no TLS settings", () => {
    expect(poolConfig("postgresql://postgres:postgres@127.0.0.1:54322/postgres")).toEqual({
      connectionString: "postgresql://postgres:postgres@127.0.0.1:54322/postgres",
    });
  });

  it("verifies the server certificate against the supplied CA", () => {
    process.env.DATABASE_CA_CERT = "-----BEGIN CERTIFICATE-----\\nABC\\n-----END CERTIFICATE-----";
    const config = poolConfig(URL_WITH_SSL);
    expect(config.ssl).toEqual({
      ca: "-----BEGIN CERTIFICATE-----\nABC\n-----END CERTIFICATE-----",
      rejectUnauthorized: true,
    });
  });

  it("drops sslmode from the URL so it can't override the verified settings", () => {
    process.env.DATABASE_CA_CERT = "-----BEGIN CERTIFICATE-----\nX\n-----END CERTIFICATE-----";
    expect(poolConfig(URL_WITH_SSL).connectionString).not.toContain("sslmode");
  });
});
