import { describe, expect, it } from 'vitest';
import { ApiError } from '@/lib/api/errors';
import { MIN_PASSWORD_LENGTH } from '@/lib/auth';
import { credentialsErrorMessage } from './password-flow';

function validationFailed(errors?: { field: string; expected: string }[]) {
  return new ApiError({
    status: 400,
    code: 'validation_failed',
    title: 'Validation failed',
    detail: 'request body failed validation',
    errors,
  });
}

describe('credentialsErrorMessage', () => {
  it('restates the password floor when the password field failed', () => {
    const message = credentialsErrorMessage(
      validationFailed([{ field: 'password', expected: 'min 12 chars' }])
    );
    expect(message).toBe(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
  });

  it('names the failing field instead of blaming the password', () => {
    const message = credentialsErrorMessage(
      validationFailed([{ field: 'email', expected: 'valid email address' }])
    );
    expect(message).toContain('email');
    expect(message).not.toContain('Password');
  });

  it('does not map an unrelated 400 to the password rule', () => {
    const err = new ApiError({
      status: 400,
      code: 'csrf_mismatch',
      title: 'CSRF mismatch',
      detail: 'token did not match',
    });
    expect(credentialsErrorMessage(err)).toBe('token did not match');
  });

  it('passes the uniform 401 through unchanged', () => {
    const err = new ApiError({
      status: 401,
      code: 'invalid_credentials',
      title: 'Invalid credentials',
      detail: 'Invalid email or password.',
    });
    expect(credentialsErrorMessage(err)).toBe('Invalid email or password.');
  });
});
