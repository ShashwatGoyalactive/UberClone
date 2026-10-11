"use client";

import { REGEXP_ONLY_DIGITS } from "input-otp";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Label } from "@/components/ui/label";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { emailCodeSchema, emailSchema } from "@/lib/validation/auth";

/**
 * Email one-time code sign-in (docs/UX_FLOWS.md Flow 2). Both calls run in
 * the browser so Supabase rate-limits by the visitor's IP, not the
 * server's. The Comet account itself is created on the first page load
 * after sign-in (lib/auth/session.ts).
 */
export function LoginForm({ next, googleEnabled }: { next: string; googleEnabled: boolean }) {
  const router = useRouter();
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function sendCode(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Enter a valid email address.");
      return;
    }
    startTransition(async () => {
      const { error: sendError } = await supabaseBrowser().auth.signInWithOtp({
        email: parsed.data,
        options: { shouldCreateUser: true },
      });
      if (sendError) {
        setError(
          sendError.status === 429
            ? "We've sent too many emails just now. Try again in a few minutes, or try the demo."
            : "We couldn't send the code. Check the address and try again.",
        );
        return;
      }
      setEmail(parsed.data);
      setStep("code");
    });
  }

  function verify(value: string) {
    setError(null);
    const parsed = emailCodeSchema.safeParse(value);
    if (!parsed.success) return;
    startTransition(async () => {
      const { error: verifyError } = await supabaseBrowser().auth.verifyOtp({
        email,
        token: parsed.data,
        type: "email",
      });
      if (verifyError) {
        setCode("");
        setError(
          verifyError.status === 429
            ? "Too many attempts. Wait a few minutes and request a new code."
            : "That code didn't match or has expired. Check the email or send a new one.",
        );
        return;
      }
      router.replace(next);
      router.refresh();
    });
  }

  function google() {
    setError(null);
    startTransition(async () => {
      const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
      const { error: oauthError } = await supabaseBrowser().auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo },
      });
      if (oauthError) setError("Google sign-in isn't available right now. Use your email instead.");
    });
  }

  if (step === "code") {
    return (
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <h1 className="font-heading text-[26px] leading-tight font-bold tracking-tight">
            Check your email
          </h1>
          <p className="text-[15px] leading-normal text-muted-foreground">
            We sent a 6-digit code to <span className="font-semibold text-foreground">{email}</span>
            . It expires in 10 minutes.
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="code" className="text-muted-foreground">
            6-digit code
          </Label>
          <InputOTP
            id="code"
            maxLength={6}
            pattern={REGEXP_ONLY_DIGITS}
            value={code}
            onChange={setCode}
            onComplete={verify}
            disabled={pending}
            autoFocus
            aria-invalid={error ? true : undefined}
          >
            <InputOTPGroup>
              {Array.from({ length: 6 }, (_, i) => (
                <InputOTPSlot key={i} index={i} className="size-12 text-lg" />
              ))}
            </InputOTPGroup>
          </InputOTP>
        </div>
        {error && (
          <p role="alert" className="text-sm font-semibold text-danger-text">
            {error}
          </p>
        )}
        <Button
          onClick={() => verify(code)}
          disabled={pending || code.length !== 6}
          className="h-14 rounded-lg text-[17px] font-bold"
        >
          {pending ? "Checking…" : "Continue"}
        </Button>
        <Button
          variant="ghost"
          className="h-11 font-semibold text-info"
          onClick={() => {
            setStep("email");
            setCode("");
            setError(null);
          }}
        >
          Use a different email
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={sendCode} className="flex flex-col gap-5" noValidate>
      <div className="flex flex-col gap-1.5">
        <h1 className="font-heading text-[30px] leading-[1.1] font-bold tracking-tight">
          Get there at
          <br />
          comet speed.
        </h1>
        <p className="text-[15px] leading-normal text-muted-foreground">
          Enter your email and we&apos;ll send you a code to sign in.
        </p>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="email" className="text-muted-foreground">
          Email
        </Label>
        <Input
          id="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={error ? true : undefined}
          className="h-14 rounded-md px-4 text-[17px]"
        />
      </div>
      {error && (
        <p role="alert" className="text-sm font-semibold text-danger-text">
          {error}
        </p>
      )}
      <Button type="submit" disabled={pending} className="h-14 rounded-lg text-[17px] font-bold">
        {pending ? "Sending…" : "Send code"}
      </Button>
      {googleEnabled && (
        <>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            or
            <span className="h-px flex-1 bg-border" />
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={google}
            disabled={pending}
            className="h-14 rounded-lg text-base font-semibold"
          >
            Continue with Google
          </Button>
        </>
      )}
      <Link
        href="/demo"
        className="py-1.5 text-center text-[15px] font-semibold text-info hover:underline"
      >
        Just looking? Try the demo — no sign-up
      </Link>
      <p className="text-center text-xs leading-normal text-muted-foreground">
        By continuing you agree to Comet&apos;s Terms and Privacy Policy.
      </p>
    </form>
  );
}
