"use client";

import { forwardRef, useEffect, useRef, useState, type InputHTMLAttributes, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Check, Eye, EyeOff, Inbox, Loader2, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InlineNotice } from "@/components/ui/feedback";
import { Checkbox, Field, Input, Select } from "@/components/ui/form";
import { toast } from "@/components/ui/toast";
import { DIAL_CODES } from "@/data/countries";
import { requestOtp, requestPasswordReset, resetPassword, signIn, signUp, verifyOtp } from "@/lib/engine/auth";
import { useSessionStore } from "@/lib/stores/session";
import { cn } from "@/lib/utils";
import { emailField, strongPassword } from "@/lib/validation";

/** Only same-site paths are honoured as `?next=` targets; anything else lands on the account dashboard. */
const safeNext = (next?: string) => (next && /^\/(?![\/\\])[^\\\r\n]*$/.test(next) ? next : "/account");

const withNext = (path: string, next?: string, sep = "?") => (next ? `${path}${sep}next=${encodeURIComponent(next)}` : path);

const PasswordInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }>(function PasswordInput(
  { id, invalid, ...rest },
  ref,
) {
  const [shown, setShown] = useState(false);
  return (
    <div className="relative">
      <Input ref={ref} id={id} type={shown ? "text" : "password"} invalid={invalid} className="pr-11" {...rest} />
      <button
        type="button"
        onClick={() => setShown((v) => !v)}
        aria-label={shown ? "Hide password" : "Show password"}
        className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-md p-2 text-slate-400 hover:text-slate-700"
      >
        {shown ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
});

function AuthHeading({ title, subtitle }: { title: ReactNode; subtitle?: ReactNode }) {
  return (
    <div className="mb-7">
      <h1 className="text-[30px] font-extrabold leading-tight">{title}</h1>
      {subtitle && <p className="mt-2 text-[15px] text-slate-600">{subtitle}</p>}
    </div>
  );
}

function DemoInbox({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn("rounded-lg border border-dashed border-brand-300 bg-brand-50/60 p-4", className)}>
      <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-brand-700">
        <Inbox className="h-4 w-4" aria-hidden /> Demo inbox
      </p>
      {children}
    </div>
  );
}

const signInSchema = z.object({
  email: emailField,
  password: z.string().min(1, "Enter your password"),
  remember: z.boolean().optional(),
});

const signUpSchema = z.object({
  firstName: z.string().trim().min(2, "Enter your first name"),
  lastName: z.string().trim().min(2, "Enter your last name"),
  email: emailField,
  countryCode: z.string().min(1),
  mobile: z
    .string()
    .trim()
    .regex(/^[0-9\s-]{6,14}$/, "Enter a valid mobile number"),
  password: strongPassword,
  terms: z.boolean().refine((v) => v, "You need to accept the terms to create an account"),
  marketing: z.boolean().optional(),
});

const resetSchema = z
  .object({
    password: strongPassword,
    confirm: z.string().min(1, "Confirm your new password"),
  })
  .refine((v) => v.password === v.confirm, { path: ["confirm"], message: "Passwords don't match" });

const forgotSchema = z.object({ email: emailField });

const PASSWORD_HINT = "At least 8 characters with upper & lower case and a number";

/** 0–4: length, mixed case, digit, and a symbol or 12+ characters. */
function passwordStrength(pw: string) {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw) || pw.length >= 12) score++;
  return score;
}

export function SignInForm({ next }: { next?: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const form = useForm<z.infer<typeof signInSchema>>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "", password: "", remember: true },
  });
  const { errors, isSubmitting } = form.formState;

  async function onSubmit(values: z.infer<typeof signInSchema>) {
    setError(null);
    const res = await signIn(values.email, values.password, !!values.remember);
    if (res.ok) {
      toast.success(`Welcome back, ${res.user!.firstName}`);
      router.replace(safeNext(next));
      router.refresh();
      return;
    }
    if (res.code === "unverified") router.push(withNext(`/verify?email=${encodeURIComponent(values.email)}`, next, "&"));
    else setError(res.error);
  }

  return (
    <div>
      <AuthHeading title="Welcome back" subtitle="Sign in to see your trips, saved travellers and documents." />
      <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-5">
        {error && (
          <InlineNotice tone="error" title="We couldn't sign you in">
            {error}
          </InlineNotice>
        )}
        <Field label="Email address" htmlFor="si-email" error={errors.email?.message} required>
          <Input id="si-email" type="email" autoComplete="email" placeholder="you@example.com" invalid={!!errors.email} {...form.register("email")} />
        </Field>
        <Field label="Password" htmlFor="si-pass" error={errors.password?.message} required>
          <PasswordInput id="si-pass" autoComplete="current-password" invalid={!!errors.password} {...form.register("password")} />
        </Field>
        <div className="flex items-center justify-between">
          <Checkbox label="Keep me signed in" {...form.register("remember")} />
          <Link href="/forgot-password" className="text-sm font-semibold text-brand-600 hover:underline">
            Forgot password?
          </Link>
        </div>
        <Button type="submit" size="lg" block loading={isSubmitting}>
          Sign in
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-600">
        New to Cheaperfly?{" "}
        <Link href={withNext("/sign-up", next)} className="font-bold text-brand-600 hover:underline">
          Create an account
        </Link>
      </p>
      <p className="mt-3 text-center text-sm text-slate-600">
        Booked as a guest?{" "}
        <Link href="/manage-booking" className="font-bold text-brand-600 hover:underline">
          Find your booking
        </Link>
      </p>
    </div>
  );
}

export function SignUpForm({ email, next }: { email?: string; next?: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const form = useForm<z.infer<typeof signUpSchema>>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { firstName: "", lastName: "", email: email ?? "", countryCode: "+44", mobile: "", password: "", terms: false, marketing: false },
  });
  const { errors, isSubmitting } = form.formState;
  const strength = passwordStrength(form.watch("password") ?? "");

  async function onSubmit(values: z.infer<typeof signUpSchema>) {
    setError(null);
    const res = await signUp({ ...values, marketing: !!values.marketing });
    if (!res.ok) return setError(res.error);
    router.push(withNext(`/verify?email=${encodeURIComponent(values.email)}`, next, "&"));
  }

  return (
    <div>
      <AuthHeading title="Create your account" subtitle="Save travellers, track bookings and get 3% off every fare." />
      <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-4">
        {error && (
          <InlineNotice tone="error" title="Couldn't create your account">
            {error}{" "}
            <Link href="/sign-in" className="font-bold underline">
              Sign in
            </Link>
          </InlineNotice>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="First name" htmlFor="su-first" error={errors.firstName?.message} required>
            <Input id="su-first" autoComplete="given-name" invalid={!!errors.firstName} {...form.register("firstName")} />
          </Field>
          <Field label="Last name" htmlFor="su-last" error={errors.lastName?.message} required>
            <Input id="su-last" autoComplete="family-name" invalid={!!errors.lastName} {...form.register("lastName")} />
          </Field>
        </div>
        <Field label="Email address" htmlFor="su-email" error={errors.email?.message} required>
          <Input id="su-email" type="email" autoComplete="email" invalid={!!errors.email} {...form.register("email")} />
        </Field>
        <div className="grid grid-cols-[110px_1fr] gap-3">
          <Field label="Code" htmlFor="su-cc">
            <Select id="su-cc" {...form.register("countryCode")}>
              {DIAL_CODES.map((c) => (
                <option key={c.dial} value={c.dial}>
                  {c.dial}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Mobile number" htmlFor="su-mobile" error={errors.mobile?.message} required>
            <Input id="su-mobile" type="tel" inputMode="tel" autoComplete="tel-national" invalid={!!errors.mobile} {...form.register("mobile")} />
          </Field>
        </div>
        <Field label="Password" htmlFor="su-pass" error={errors.password?.message} required hint={PASSWORD_HINT}>
          <PasswordInput id="su-pass" autoComplete="new-password" invalid={!!errors.password} {...form.register("password")} />
          <div className="mt-1 flex gap-1" aria-hidden>
            {[0, 1, 2, 3].map((i) => (
              <span
                key={i}
                className={cn(
                  "h-1 flex-1 rounded-full",
                  i < strength ? (strength <= 1 ? "bg-red-400" : strength === 2 ? "bg-amber-400" : "bg-emerald-500") : "bg-slate-200",
                )}
              />
            ))}
          </div>
        </Field>
        <div className="space-y-2.5 pt-1">
          <Checkbox
            aria-invalid={!!errors.terms || undefined}
            label={
              <span>
                I agree to the{" "}
                <Link href="/legal/terms" target="_blank" className="font-bold text-brand-600 underline">
                  Terms
                </Link>{" "}
                and{" "}
                <Link href="/legal/privacy" target="_blank" className="font-bold text-brand-600 underline">
                  Privacy Policy
                </Link>
              </span>
            }
            {...form.register("terms")}
          />
          {errors.terms && (
            <p role="alert" className="text-xs font-medium text-red-600">
              {errors.terms.message}
            </p>
          )}
          <Checkbox label="Send me fare drops and travel deals (optional)" {...form.register("marketing")} />
        </div>
        <Button type="submit" size="lg" block loading={isSubmitting}>
          Create account
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-600">
        Already have an account?{" "}
        <Link href={withNext("/sign-in", next)} className="font-bold text-brand-600 hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}

export function VerifyForm({ email, next }: { email?: string; next?: string }) {
  const router = useRouter();
  const otp = useSessionStore((s) => s.otp);
  const [digits, setDigits] = useState<string[]>(Array(6).fill(""));
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [cooldown, setCooldown] = useState(30);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);
  const address = otp?.email ?? email ?? "";

  useEffect(() => {
    const t = setInterval(() => setCooldown((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, []);

  const code = digits.join("");

  async function verify(value = code) {
    if (value.length < 6) return setError("Enter your 6-digit verification code.");
    setVerifying(true);
    setError(null);
    const res = await verifyOtp(value);
    setVerifying(false);
    if (res.ok) {
      toast.success("Email verified — welcome to Cheaperfly");
      router.replace(safeNext(next));
      router.refresh();
    } else setError(res.error);
  }

  /** Typing fills one box and advances; pasting (or autofill) spreads digits across the boxes and submits when complete. */
  function enter(index: number, raw: string) {
    const value = raw.replace(/\D/g, "");
    if (!value) return setDigits((d) => d.map((x, i) => (i === index ? "" : x)));
    if (value.length > 1) {
      const chars = value.slice(0, 6).split("");
      setDigits(
        Array(6)
          .fill("")
          .map((_, i) => chars[i] ?? ""),
      );
      inputs.current[Math.min(chars.length, 5)]?.focus();
      if (chars.length === 6) verify(chars.join(""));
      return;
    }
    setDigits((d) => d.map((x, i) => (i === index ? value : x)));
    if (index < 5) inputs.current[index + 1]?.focus();
  }

  return (
    <div>
      <AuthHeading
        title="Check your email"
        subtitle={
          <>
            Enter the 6-digit verification code for <b className="text-navy-900">{address || "your email"}</b> to verify your account.
          </>
        }
      />
      {!otp?.challengeId && <InlineNotice tone="info">For a new verification code, <Link href={withNext("/sign-in", next)}>sign in again</Link>.</InlineNotice>}
      {otp?.code && (
        <DemoInbox className="mb-6">
          <p className="mt-1 text-sm text-slate-700">
            No email is actually sent in this prototype. Your verification code is{" "}
            <b className="font-mono text-lg tracking-[0.25em] text-navy-900">{otp.code}</b>
          </p>
        </DemoInbox>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          verify();
        }}
        noValidate
      >
        <fieldset>
          <legend className="sr-only">6-digit verification code</legend>
          <div
            className="flex justify-between gap-2"
            onPaste={(e) => {
              e.preventDefault();
              enter(0, e.clipboardData.getData("text"));
            }}
          >
            {digits.map((d, i) => (
              <input
                key={i}
                ref={(el) => {
                  inputs.current[i] = el;
                }}
                inputMode="numeric"
                autoComplete={i === 0 ? "one-time-code" : "off"}
                aria-label={`Digit ${i + 1}`}
                aria-invalid={!!error || undefined}
                maxLength={6}
                value={d}
                onChange={(e) => enter(i, e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Backspace" && !digits[i] && i > 0) inputs.current[i - 1]?.focus();
                }}
                className={cn(
                  "h-14 w-full rounded-lg border bg-white text-center text-2xl font-bold text-navy-900 outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20",
                  error ? "border-red-400" : "border-slate-300",
                )}
              />
            ))}
          </div>
        </fieldset>
        {error && (
          <p role="alert" className="mt-2 text-sm font-medium text-red-600">
            {error}
          </p>
        )}
        <Button type="submit" size="lg" block className="mt-6" loading={verifying}>
          Verify &amp; continue
        </Button>
      </form>
      <div className="mt-5 flex items-center justify-between text-sm">
        <Link href="/sign-up" className="flex items-center gap-1 font-semibold text-slate-600 hover:text-brand-600">
          <ArrowLeft className="h-4 w-4" aria-hidden /> Change email
        </Link>
        <button
          type="button"
          disabled={cooldown > 0}
          onClick={async () => {
            const result = await requestOtp("signup", address);
            if (!result.ok) return setError(result.error);
            setCooldown(30);
            setDigits(Array(6).fill(""));
            toast.info("A new verification challenge is ready");
          }}
          className="font-bold text-brand-600 hover:underline disabled:text-slate-400 disabled:no-underline"
        >
          {cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"}
        </button>
      </div>
    </div>
  );
}

export function ForgotPasswordForm() {
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [resetLink, setResetLink] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);
  const form = useForm<z.infer<typeof forgotSchema>>({ resolver: zodResolver(forgotSchema), defaultValues: { email: "" } });
  const { errors, isSubmitting } = form.formState;

  if (sentTo)
    return (
      <div>
        <span className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-brand-50 text-brand-600">
          <MailCheck className="h-7 w-7" aria-hidden />
        </span>
        <AuthHeading
          title="Check your inbox"
          subtitle={
            <>
              If an account exists for <b className="text-navy-900">{sentTo}</b>, a password reset challenge is ready.
            </>
          }
        />
        <DemoInbox>
          <p className="mt-1 text-sm text-slate-700">
            No email is sent in this prototype.{" "}
            {"If a simulated link is available, use the button below."}
          </p>
          {resetLink && (
            <Link
              href={resetLink}
              className="mt-3 inline-flex h-10 items-center rounded-lg bg-brand-500 px-4 text-sm font-semibold text-white hover:bg-brand-600"
            >
              Open reset link
            </Link>
          )}
        </DemoInbox>
        <p className="mt-6 text-center text-sm">
          <Link href="/sign-in" className="font-bold text-brand-600 hover:underline">
            Back to sign in
          </Link>
        </p>
      </div>
    );

  return (
    <div>
      <AuthHeading title="Forgot your password?" subtitle="Enter your email to request a password reset link." />
      <form
        onSubmit={form.handleSubmit(async (values) => {
          setError(null);
          const result = await requestPasswordReset(values.email);
          if (!result.ok) return setError(result.error);
          setResetLink(result.link);
          setSentTo(values.email);
        })}
        noValidate
        className="space-y-5"
      >
        {error && <InlineNotice tone="error">{error}</InlineNotice>}
        <Field label="Email address" htmlFor="fp-email" error={errors.email?.message} required>
          <Input id="fp-email" type="email" autoComplete="email" invalid={!!errors.email} {...form.register("email")} />
        </Field>
        <Button type="submit" size="lg" block loading={isSubmitting}>
          Send reset link
        </Button>
      </form>
      <p className="mt-6 text-center text-sm">
        <Link href="/sign-in" className="flex items-center justify-center gap-1 font-semibold text-slate-600 hover:text-brand-600">
          <ArrowLeft className="h-4 w-4" aria-hidden /> Back to sign in
        </Link>
      </p>
    </div>
  );
}

export function ResetPasswordForm({ email, challengeId, token }: { email?: string; challengeId?: string; token?: string }) {
  const router = useRouter();
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const form = useForm<z.infer<typeof resetSchema>>({ resolver: zodResolver(resetSchema), defaultValues: { password: "", confirm: "" } });
  const { errors, isSubmitting } = form.formState;

  if (!email || !challengeId || !token)
    return (
      <div>
        <AuthHeading title="This reset link isn't valid" subtitle="Request a new link to reset your password." />
        <Link href="/forgot-password" className="inline-flex h-11 items-center rounded-lg bg-brand-500 px-5 font-semibold text-white hover:bg-brand-600">
          Request a new link
        </Link>
      </div>
    );

  if (done)
    return (
      <div>
        <span className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
          <Check className="h-7 w-7" strokeWidth={3} aria-hidden />
        </span>
        <AuthHeading title="Password updated" subtitle="You can now sign in with your new password." />
        <Button size="lg" block onClick={() => router.push("/sign-in")}>
          Sign in
        </Button>
      </div>
    );

  return (
    <div>
      <AuthHeading
        title="Set a new password"
        subtitle={
          <>
            for <b className="text-navy-900">{email}</b>
          </>
        }
      />
      <form
        onSubmit={form.handleSubmit(async (values) => {
          setError(null);
          const res = await resetPassword(challengeId, token, values.password);
          if (res.ok) {
            window.history.replaceState(null, "", "/reset-password");
            setDone(true);
          }
          else setError(res.error ?? "Something went wrong");
        })}
        noValidate
        className="space-y-5"
      >
        {error && <InlineNotice tone="error">{error}</InlineNotice>}
        <Field label="New password" htmlFor="rp-pass" error={errors.password?.message} required hint={PASSWORD_HINT}>
          <PasswordInput id="rp-pass" autoComplete="new-password" invalid={!!errors.password} {...form.register("password")} />
        </Field>
        <Field label="Confirm new password" htmlFor="rp-confirm" error={errors.confirm?.message} required>
          <PasswordInput id="rp-confirm" autoComplete="new-password" invalid={!!errors.confirm} {...form.register("confirm")} />
        </Field>
        <Button
          type="submit"
          size="lg"
          block
          loading={isSubmitting}
          leftIcon={isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : undefined}
        >
          Update password
        </Button>
      </form>
    </div>
  );
}
