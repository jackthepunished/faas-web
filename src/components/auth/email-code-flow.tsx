import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Link } from '@tanstack/react-router';
import { useSweepNavigate } from '@/components/sweep-link';
import { AlertCircle, ArrowLeft, ArrowRight, Loader2, MailCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { DEMO_CODE, hasOnboarded, isValidEmail, useAuth } from '@/lib/auth';
import { OtpInput } from './otp-input';

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];
const RESEND_SECONDS = 30;

type Step = 'email' | 'code';

const COPY = {
  signin: {
    title: 'Sign in to Gregale',
    subtitle: 'Enter your email and we will send you a one-time code.',
    cta: 'Continue with email',
    switchText: 'New to Gregale?',
    switchLabel: 'Create an account',
    switchTo: '/signup' as const,
  },
  signup: {
    title: 'Create your workspace',
    subtitle: 'Start with 1M invocations free every month. No credit card.',
    cta: 'Create account',
    switchText: 'Already have an account?',
    switchLabel: 'Sign in',
    switchTo: '/login' as const,
  },
};

function SsoButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-10 flex-1 items-center justify-center gap-2 rounded-lg border border-border bg-card text-sm transition-colors hover:border-border-secondary hover:bg-muted"
    >
      {label}
    </button>
  );
}

export function EmailCodeFlow({ mode }: { mode: 'signin' | 'signup' }) {
  const copy = COPY[mode];
  const sweepNavigate = useSweepNavigate();
  const { toast } = useToast();
  const { requestCode, verifyCode } = useAuth();

  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);

  const emailValid = isValidEmail(email);
  const showEmailError = touched && email.length > 0 && !emailValid;
  // Guards against the OTP's auto-submit firing twice on the last keystroke.
  const verifying = useRef(false);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const id = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [secondsLeft]);

  const sendCode = async (isResend = false) => {
    setPending(true);
    setError(null);
    try {
      await requestCode(email);
      setStep('code');
      setSecondsLeft(RESEND_SECONDS);
      if (isResend) toast({ kind: 'success', title: 'New code sent', description: email });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setPending(false);
    }
  };

  const submitCode = async (value: string) => {
    if (verifying.current) return;
    verifying.current = true;
    setPending(true);
    setError(null);
    try {
      const user = await verifyCode(email, value);
      toast({ kind: 'success', title: `Welcome, ${user.name.split(' ')[0]}` });
      // Sweep the hand-off from auth into the product.
      sweepNavigate(hasOnboarded() ? '/dashboard' : '/onboarding');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
      setCode('');
    } finally {
      setPending(false);
      verifying.current = false;
    }
  };

  return (
    <AnimatePresence mode="wait" initial={false}>
      {step === 'email' ? (
        <motion.div
          key="email"
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -12 }}
          transition={{ duration: 0.28, ease: EASE }}
        >
          <h1 className="text-2xl font-semibold tracking-tight">{copy.title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{copy.subtitle}</p>

          <div className="mt-7 flex gap-2">
            <SsoButton
              label="GitHub"
              onClick={() =>
                toast({
                  kind: 'info',
                  title: 'SSO is not wired up',
                  description: 'This build uses the email code flow. Try any address.',
                })
              }
            />
            <SsoButton
              label="Google"
              onClick={() =>
                toast({
                  kind: 'info',
                  title: 'SSO is not wired up',
                  description: 'This build uses the email code flow. Try any address.',
                })
              }
            />
          </div>

          <div className="my-6 flex items-center gap-3">
            <span className="h-px flex-1 bg-border" />
            <span className="label-mono text-muted-foreground">or</span>
            <span className="h-px flex-1 bg-border" />
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              setTouched(true);
              if (emailValid && !pending) void sendCode();
            }}
            noValidate
          >
            <label htmlFor="email" className="label-mono text-muted-foreground">
              Work email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => setTouched(true)}
              aria-invalid={showEmailError || undefined}
              aria-describedby={showEmailError ? 'email-error' : undefined}
              placeholder="you@company.com"
              className={`mt-2 h-11 w-full rounded-lg border bg-card px-3.5 text-sm outline-none transition-all placeholder:text-muted-foreground focus:ring-2 focus:ring-brand/25 ${
                showEmailError
                  ? 'border-[color:var(--status-critical)]'
                  : 'border-border focus:border-brand'
              }`}
            />

            {showEmailError && (
              <p
                id="email-error"
                className="mt-2 text-xs"
                style={{ color: 'var(--status-critical)' }}
              >
                Enter a valid email address.
              </p>
            )}

            {error && (
              <p
                role="alert"
                className="mt-3 flex items-start gap-2 rounded-lg border px-3 py-2 text-xs"
                style={{
                  color: 'var(--status-critical)',
                  borderColor: 'color-mix(in oklab, var(--status-critical) 35%, transparent)',
                }}
              >
                <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" />
                {error}
              </p>
            )}

            <Button
              type="submit"
              variant="cta"
              disabled={pending}
              className="mt-5 h-11 w-full gap-2 rounded-lg"
            >
              {pending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Sending code…
                </>
              ) : (
                <>
                  {copy.cta}
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </form>

          <p className="mt-6 text-sm text-muted-foreground">
            {copy.switchText}{' '}
            <Link to={copy.switchTo} className="text-brand hover:text-brand-hover">
              {copy.switchLabel}
            </Link>
          </p>
        </motion.div>
      ) : (
        <motion.div
          key="code"
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 12 }}
          transition={{ duration: 0.28, ease: EASE }}
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card">
            <MailCheck className="h-4 w-4 text-brand" />
          </span>

          <h1 className="mt-5 text-2xl font-semibold tracking-tight">Check your email</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            We sent a six-digit code to <span className="text-foreground">{email}</span>.
          </p>

          <div className="mt-7">
            <OtpInput
              value={code}
              onChange={(next) => {
                setCode(next);
                if (error) setError(null);
              }}
              onComplete={submitCode}
              invalid={!!error}
              disabled={pending}
            />
          </div>

          {error ? (
            <p
              role="alert"
              className="mt-3 flex items-start gap-2 text-xs"
              style={{ color: 'var(--status-critical)' }}
            >
              <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" />
              {error}
            </p>
          ) : (
            <p className="mt-3 text-xs text-muted-foreground">
              Demo build — the code is{' '}
              <span className="font-mono text-foreground">{DEMO_CODE}</span>.
            </p>
          )}

          <Button
            type="button"
            variant="cta"
            disabled={pending || code.length < 6}
            onClick={() => submitCode(code)}
            className="mt-5 h-11 w-full gap-2 rounded-lg"
          >
            {pending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Verifying…
              </>
            ) : (
              <>
                Verify and continue
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>

          <div className="mt-6 flex items-center justify-between text-sm">
            <button
              type="button"
              onClick={() => {
                setStep('email');
                setCode('');
                setError(null);
              }}
              className="inline-flex items-center gap-1.5 text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Use a different email
            </button>

            <button
              type="button"
              disabled={secondsLeft > 0 || pending}
              onClick={() => void sendCode(true)}
              className="text-brand transition-colors hover:text-brand-hover disabled:text-muted-foreground"
            >
              {secondsLeft > 0 ? `Resend in ${secondsLeft}s` : 'Resend code'}
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
