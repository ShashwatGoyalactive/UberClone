import { vi } from "vitest";

// "server-only" throws when imported outside a React Server Component
// build. Tests run server modules directly in Node, which is exactly the
// environment the guard exists to allow, so it's a no-op here.
vi.mock("server-only", () => ({}));
