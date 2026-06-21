import { getErrorCode } from './error.util';

describe('error.util - getErrorCode', () => {
  it('extracts a Firebase-style code property', () => {
    expect(getErrorCode({ code: 'auth/invalid-credential' })).toBe(
      'auth/invalid-credential'
    );
  });

  it('works with a real Error that carries a code', () => {
    const error = Object.assign(new Error('boom'), { code: 'auth/wrong-password' });
    expect(getErrorCode(error)).toBe('auth/wrong-password');
  });

  it('returns an empty string when code is not a string', () => {
    expect(getErrorCode({ code: 42 })).toBe('');
  });

  it('returns an empty string for an object without code', () => {
    expect(getErrorCode({ message: 'no code here' })).toBe('');
  });

  it('returns an empty string for null', () => {
    expect(getErrorCode(null)).toBe('');
  });

  it('returns an empty string for undefined', () => {
    expect(getErrorCode(undefined)).toBe('');
  });

  it('returns an empty string for primitive values', () => {
    expect(getErrorCode('some string')).toBe('');
    expect(getErrorCode(123)).toBe('');
  });
});
