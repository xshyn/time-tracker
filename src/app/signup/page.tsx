"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, TriangleAlert } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useLang } from "@/lib/i18n/provider";
import { Button, Field, Input, PasswordInput } from "@/components/ui";
import { AuthLayout } from "@/components/AuthLayout";

export default function SignupPage() {
  const { signUp } = useAuth();
  const { dict } = useLang();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await signUp(email, password, displayName);
      router.push("/");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (msg === "EMAIL_EXISTS") setError(dict.auth.errorExists);
      else if (msg === "WEAK_PASSWORD") setError(dict.auth.errorWeak);
      else setError(msg || dict.auth.errorInvalid);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout>
      <h1 className="text-2xl font-extrabold tracking-tight">{dict.auth.signupTitle}</h1>
      <p className="mb-6 mt-1 text-sm text-muted-foreground">{dict.auth.signupSub}</p>
      <form onSubmit={submit} className="space-y-4">
        <Field label={dict.auth.displayName}>
          <Input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            autoComplete="name"
            placeholder="Alex"
          />
        </Field>
        <Field label={dict.auth.email}>
          <Input
            type="email"
            required
            autoComplete="email"
            inputMode="email"
            placeholder="you@work.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>
        <Field label={dict.auth.password}>
          <PasswordInput
            required
            minLength={6}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>
        {error ? (
          <p role="alert" className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
            <TriangleAlert size={15} aria-hidden="true" className="shrink-0" />
            {error}
          </p>
        ) : null}
        <Button type="submit" disabled={busy} className="group w-full py-3 text-[15px]">
          {busy ? dict.common.loading : dict.auth.signup}
          <ArrowRight size={16} aria-hidden="true" className="transition-transform group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5" />
        </Button>
      </form>
      <p className="mt-6 rounded-2xl border border-border bg-card p-4 text-center text-sm">
        {dict.auth.hasAccount}{" "}
        <Link href="/login" className="font-bold text-accent-dark underline-offset-4 hover:underline">
          {dict.auth.login}
        </Link>
      </p>
    </AuthLayout>
  );
}
