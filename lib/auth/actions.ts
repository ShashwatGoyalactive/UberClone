"use server";

import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";

/** Ends the session everywhere this browser is signed in, then goes home. */
export async function signOutAction() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/");
}
