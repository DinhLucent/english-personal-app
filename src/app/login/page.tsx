"use client";

import { useEffect, useMemo, useState } from "react";
import { LogIn, Mail } from "lucide-react";
import { Button, Panel, TextInput } from "@/components/ui";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { appConfig } from "@/lib/config";

const RESEND_COOLDOWN_MS = 60 * 1000;
const RATE_LIMIT_COOLDOWN_MS = 5 * 60 * 1000;

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function getCooldownKey(email: string) {
  return `speakflow:magic-link-cooldown:${email}`;
}

function formatCooldown(ms: number) {
  const totalSeconds = Math.max(1, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (!minutes) {
    return `${seconds}s`;
  }

  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getStringValue(source: Record<string, unknown>, key: string) {
  const value = source[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function getAuthErrorMessage(err: unknown) {
  if (typeof err === "string" && err.trim()) {
    return err.trim();
  }

  if (err instanceof Error && err.message && err.message !== "{}") {
    if (isRecord(err)) {
      const code = getStringValue(err, "code") ?? getStringValue(err, "error_code");
      return code ? `${code}: ${err.message}` : err.message;
    }

    return err.message;
  }

  if (isRecord(err)) {
    const code = getStringValue(err, "code") ?? getStringValue(err, "error_code");
    const message =
      getStringValue(err, "message") ??
      getStringValue(err, "error_description") ??
      getStringValue(err, "error");

    if (message && message !== "{}") {
      return code ? `${code}: ${message}` : message;
    }
  }

  return "Could not start sign in. Check Supabase Auth and SMTP configuration, then try again.";
}

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const normalizedEmail = useMemo(() => normalizeEmail(email), [email]);
  const cooldownRemaining = Math.max(0, cooldownUntil - now);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  function startCooldown(durationMs: number) {
    const nextCooldownUntil = Date.now() + durationMs;
    setCooldownUntil(nextCooldownUntil);
    setNow(Date.now());

    if (normalizedEmail) {
      window.localStorage.setItem(
        getCooldownKey(normalizedEmail),
        String(nextCooldownUntil),
      );
    }
  }

  function handleEmailChange(value: string) {
    setEmail(value);

    const nextEmail = normalizeEmail(value);
    if (!nextEmail) {
      setCooldownUntil(0);
      return;
    }

    const stored = window.localStorage.getItem(getCooldownKey(nextEmail));
    const storedUntil = stored ? Number(stored) : 0;
    setCooldownUntil(Number.isFinite(storedUntil) ? storedUntil : 0);
  }

  async function signIn() {
    if (cooldownRemaining > 0) {
      setError(`Please wait ${formatCooldown(cooldownRemaining)} before requesting another link.`);
      return;
    }

    setLoading(true);
    setMessage(null);
    setError(null);

    try {
      const supabase = createSupabaseBrowserClient();
      const { error: authError } = await supabase.auth.signInWithOtp({
        email: normalizedEmail,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (authError) {
        throw authError;
      }

      startCooldown(RESEND_COOLDOWN_MS);
      setMessage("Magic link sent. Check your inbox and spam folder.");
    } catch (err) {
      const message = getAuthErrorMessage(err);
      const isRateLimit = /rate limit|too many|429|over_email_send_rate_limit/i.test(message);
      const isEmailSendFailure = /error sending confirmation email|unexpected_failure|smtp/i.test(
        message,
      );

      if (isRateLimit) {
        startCooldown(RATE_LIMIT_COOLDOWN_MS);
        setError("Too many magic link requests. Wait a few minutes, then try again.");
      } else if (isEmailSendFailure) {
        setError(
          "Supabase could not send the magic link email. Check SMTP host and credentials, then try again.",
        );
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <Panel className="w-full max-w-md">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-[8px] bg-brand text-white">
            <LogIn size={21} />
          </div>
          <div>
            <h1 className="text-xl font-semibold">{appConfig.name}</h1>
            <p className="text-sm text-[#66716c]">Sign in with Supabase magic link</p>
          </div>
        </div>

        <div className="space-y-3">
          <TextInput
            type="email"
            value={email}
            placeholder="you@example.com"
            onChange={(event) => handleEmailChange(event.target.value)}
          />
          <Button
            className="w-full"
            onClick={signIn}
            disabled={loading || !normalizedEmail.includes("@") || cooldownRemaining > 0}
            icon={<Mail size={18} />}
          >
            {loading
              ? "Sending..."
              : cooldownRemaining > 0
                ? `Try again in ${formatCooldown(cooldownRemaining)}`
                : "Send magic link"}
          </Button>
        </div>

        {message ? (
          <p className="mt-4 rounded-[8px] border border-[#b9d8ca] bg-[#e7f4ed] p-3 text-sm text-brand-strong">
            {message}
          </p>
        ) : null}
        {error ? (
          <p className="mt-4 rounded-[8px] border border-[#f0c7bd] bg-[#fff7f4] p-3 text-sm text-[#7b3f34]">
            {error}
          </p>
        ) : null}
      </Panel>
    </main>
  );
}
