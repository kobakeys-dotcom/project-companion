/** Phase-0 stub. Original handled cookie-session redirects. */
export function isUnauthorizedError(error: Error): boolean {
  return /^401:/.test(error?.message ?? "");
}
