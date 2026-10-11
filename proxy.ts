import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Keeps the Supabase session fresh on every request.
 *
 * Supabase access tokens expire after an hour. Server Components can't
 * write cookies, so the refresh has to happen here, where a response is
 * still being built. `getUser()` triggers it and writes any renewed
 * cookies onto both the request (for this render) and the response (for
 * the browser).
 *
 * It deliberately makes NO authorisation decisions, same as Krama's: a
 * redirect here would only check that a cookie exists. Every page and
 * action resolves the user for itself (lib/auth/session.ts).
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return response;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(toSet) {
        for (const { name, value } of toSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of toSet) response.cookies.set(name, value, options);
      },
    },
  });

  await supabase.auth.getUser();
  return response;
}

export const config = {
  // Everything except static assets and images.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp|ico)$).*)"],
};
