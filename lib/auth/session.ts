import "server-only";

import type { User } from "@prisma/client";
import { redirect } from "next/navigation";
import { cache } from "react";

import { safeReturnPath } from "@/lib/redirects";
import { findUser } from "@/lib/repositories/users";
import { ensureAccount, type AuthIdentity } from "@/lib/services/accounts";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * The single place the server learns who is asking (the Data Access
 * Layer pattern). Pages, actions and route handlers call these; nothing
 * else reads the session.
 *
 * Uses getUser(), which validates the token with Supabase, never
 * getSession() alone (docs/SECURITY.md §1).
 */

export const getAuthIdentity = cache(async (): Promise<AuthIdentity | null> => {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return {
    id: data.user.id,
    // Supabase reports an anonymous user's email as "" rather than null.
    // Stored as-is, the second demo account would collide with the first
    // on the unique email index.
    email: data.user.email || null,
    isAnonymous: data.user.is_anonymous ?? false,
  };
});

/**
 * The signed-in Comet user, or null. A real sign-in gets its account on
 * first use; an anonymous session without a demo account (closed the tab
 * before picking a role) counts as signed out.
 */
export const getCurrentUser = cache(async (): Promise<User | null> => {
  const identity = await getAuthIdentity();
  if (!identity) return null;
  if (identity.isAnonymous) return findUser(identity.id);
  return ensureAccount(identity);
});

/** For pages: the user, or a redirect to sign-in that returns here after. */
export async function requireUser(returnTo: string): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(safeReturnPath(returnTo))}`);
  return user;
}
