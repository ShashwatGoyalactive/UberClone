/**
 * Theme choice, safe for the browser.
 *
 * Three states, as in Krama: "system" follows the OS, "light" and "dark"
 * override it. The choice is kept in localStorage so the inline script in
 * app/layout.tsx can apply it before first paint — a cookie round trip or
 * a database read would arrive too late to stop a flash of the wrong
 * theme. The signed-in user's choice is also saved to users.theme and
 * copied back into localStorage on sign-in.
 */

export const THEMES = ["system", "light", "dark"] as const;
export type Theme = (typeof THEMES)[number];

export const THEME_STORAGE_KEY = "comet-theme";

export function isTheme(value: unknown): value is Theme {
  return typeof value === "string" && (THEMES as readonly string[]).includes(value);
}

/**
 * Runs inline in <head>, before React. Kept dependency-free and wrapped
 * in try/catch: private windows can throw on localStorage access, and a
 * failure here must fall back to the system theme, never break the page.
 */
export const themeInitScript = `
(function(){
  try {
    var t = localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});
    var dark = t === 'dark' || (t !== 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.classList.toggle('dark', dark);
  } catch (e) {}
})();
`;
