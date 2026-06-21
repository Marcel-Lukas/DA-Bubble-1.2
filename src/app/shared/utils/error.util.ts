/**
 * Safely extracts the Firebase error code (e.g. `auth/invalid-credential`)
 * from an unknown error value caught in a `catch` block. Returns an empty
 * string when the value does not carry a string `code` property.
 *
 * Centralizes the previously duplicated `error.code` access and replaces the
 * use of `any` in the various auth error handlers.
 */
export function getErrorCode(error: unknown): string {
  if (
    error &&
    typeof error === 'object' &&
    typeof (error as { code?: unknown }).code === 'string'
  ) {
    return (error as { code: string }).code;
  }
  return '';
}
