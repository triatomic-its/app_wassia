/** `sessionStorage`, or null when the browser blocks it (private mode, previews, tests). */
export function safeSession(): Storage | null {
  try {
    return typeof sessionStorage === 'undefined' ? null : sessionStorage;
  } catch {
    return null;
  }
}
