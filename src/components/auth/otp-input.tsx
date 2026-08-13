import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

const LENGTH = 6;

/**
 * Six-box one-time code field.
 *
 * Handles the details that make this feel native: auto-advance on entry,
 * backspace stepping into the previous box, arrow-key navigation, paste of a
 * full code into any box, and auto-submit once the last digit lands.
 */
export function OtpInput({
  value,
  onChange,
  onComplete,
  invalid,
  disabled,
}: {
  value: string;
  onChange: (next: string) => void;
  onComplete?: (code: string) => void;
  invalid?: boolean;
  disabled?: boolean;
}) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    refs.current[0]?.focus();
  }, []);

  const setDigit = (index: number, digit: string) => {
    const next = (value.padEnd(LENGTH, ' ').slice(0, LENGTH).split('') as string[])
      .map((c, i) => (i === index ? digit : c))
      .join('')
      .replace(/\s+$/, '');
    onChange(next);
    return next;
  };

  const handleChange = (index: number, raw: string) => {
    const digits = raw.replace(/\D/g, '');
    if (!digits) return;

    // A paste (or fast typing) fills forward from this box.
    if (digits.length > 1) {
      const merged = (value.slice(0, index) + digits).slice(0, LENGTH);
      onChange(merged);
      const land = Math.min(merged.length, LENGTH - 1);
      refs.current[land]?.focus();
      if (merged.length === LENGTH) onComplete?.(merged);
      return;
    }

    const next = setDigit(index, digits);
    if (index < LENGTH - 1) refs.current[index + 1]?.focus();
    if (next.length === LENGTH && !next.includes(' ')) onComplete?.(next);
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      e.preventDefault();
      if (value[index]) {
        onChange(value.slice(0, index) + value.slice(index + 1));
      } else if (index > 0) {
        onChange(value.slice(0, index - 1) + value.slice(index));
        refs.current[index - 1]?.focus();
      }
    }
    if (e.key === 'ArrowLeft' && index > 0) refs.current[index - 1]?.focus();
    if (e.key === 'ArrowRight' && index < LENGTH - 1) refs.current[index + 1]?.focus();
  };

  return (
    <div
      className={cn('flex gap-2', invalid && 'animate-[shake_0.4s_ease-in-out]')}
      role="group"
      aria-label="One-time code"
    >
      {Array.from({ length: LENGTH }).map((_, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          type="text"
          inputMode="numeric"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          maxLength={LENGTH}
          disabled={disabled}
          aria-label={`Digit ${i + 1}`}
          aria-invalid={invalid || undefined}
          value={value[i] ?? ''}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onFocus={(e) => e.target.select()}
          className={cn(
            'h-12 w-full rounded-lg border bg-card text-center font-mono text-lg outline-none transition-all',
            'focus:border-brand focus:ring-2 focus:ring-brand/25',
            'disabled:opacity-50',
            invalid ? 'border-[color:var(--status-critical)]' : 'border-border'
          )}
        />
      ))}
    </div>
  );
}
