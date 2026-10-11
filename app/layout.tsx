import type { Metadata, Viewport } from "next";
import { DM_Sans, Sora } from "next/font/google";

import { EnvBadge } from "@/components/EnvBadge";
import { appEnv } from "@/lib/env";
import { themeInitScript } from "@/lib/theme";

import "./globals.css";

const display = Sora({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const body = DM_Sans({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: { default: "Comet — rides at comet speed", template: "%s · Comet" },
  description:
    "A real-time ride-hailing platform: live tracking, wallet and UPI payments, and a safety suite.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f6fa" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0d18" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // The inline script toggles the "dark" class before React hydrates,
    // so server and client <html> classes necessarily differ. That is
    // what prevents a flash of the wrong theme, and it's the one place
    // suppressing the hydration warning is correct.
    <html lang="en" className={`${display.variable} ${body.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-dvh">
        {children}
        <EnvBadge env={appEnv()} />
      </body>
    </html>
  );
}
