import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AppFrame } from "@/components/AppFrame";
import { CometLogo } from "@/components/icons/CometMark";
import { getCurrentUser } from "@/lib/auth/session";
import { safeReturnPath } from "@/lib/redirects";

import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Sign in" };

/**
 * "1 · Welcome & login" on the canvas, with email in place of the phone
 * number (docs/PRD.md §10 — phone codes need a paid SMS provider).
 */
export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next } = await searchParams;
  const returnTo = safeReturnPath(typeof next === "string" ? next : null);

  // A real, complete session has nothing to do here. (Only this page
  // redirects away from /login, and only after a full check, so an
  // expired cookie can't bounce between here and /ride forever.)
  const user = await getCurrentUser();
  if (user && !user.isDemo) redirect(returnTo);

  return (
    <AppFrame>
      <main className="flex min-h-dvh flex-col px-6 pt-7 pb-8">
        <CometLogo />
        <div className="mt-auto pt-10">
          <LoginForm
            next={returnTo}
            googleEnabled={process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED === "1"}
          />
        </div>
      </main>
    </AppFrame>
  );
}
