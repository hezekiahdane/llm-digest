/**
 * Input sanitization utilities.
 *
 * These functions prevent XSS when user-supplied content is embedded into
 * HTML strings (e.g. email templates built without React).
 *
 * When using React Email templates, React's JSX escaping handles this automatically.
 * Use these utilities only in plain string contexts.
 */

const HTML_ESCAPE_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;',
};

/**
 * Escape a string for safe inclusion in HTML.
 * Use this when embedding user input in plain HTML strings.
 */
export function escapeHtml(value: string): string {
  return value.replace(/[&<>"'/]/g, (char) => HTML_ESCAPE_MAP[char] ?? char);
}

/**
 * Strip all HTML tags from a string, returning plain text.
 * Useful for sanitizing rich-text input that should be stored as plain text.
 */
export function stripHtml(value: string): string {
  return value.replace(/<[^>]*>/g, '');
}

/**
 * Trim and normalize whitespace in a string.
 */
export function normalizeWhitespace(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

/**
 * Sanitize a string for safe use as plain text (trim + strip HTML).
 */
export function sanitizeText(value: string): string {
  return normalizeWhitespace(stripHtml(value));
}
