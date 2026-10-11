import { describe, expect, it } from "vitest";

import { APP_ENV_LABEL, parseAppEnv } from "@/lib/app-env";
import { isTheme } from "@/lib/theme";

describe("parseAppEnv", () => {
  it("accepts the four known environments", () => {
    expect(parseAppEnv("dev")).toBe("dev");
    expect(parseAppEnv("qa")).toBe("qa");
    expect(parseAppEnv("stage")).toBe("stage");
    expect(parseAppEnv("prod")).toBe("prod");
  });

  it("reads anything missing or unknown as dev, so the badge shows", () => {
    expect(parseAppEnv(undefined)).toBe("dev");
    expect(parseAppEnv("")).toBe("dev");
    expect(parseAppEnv("production")).toBe("dev");
    expect(parseAppEnv("PROD")).toBe("dev");
  });

  it("labels every environment except prod", () => {
    expect(APP_ENV_LABEL.prod).toBeNull();
    expect(APP_ENV_LABEL.dev).toBe("Dev");
    expect(APP_ENV_LABEL.stage).toBe("Staging");
  });
});

describe("isTheme", () => {
  it("accepts only the three theme states", () => {
    expect(isTheme("system")).toBe(true);
    expect(isTheme("dark")).toBe(true);
    expect(isTheme("auto")).toBe(false);
    expect(isTheme(null)).toBe(false);
  });
});
