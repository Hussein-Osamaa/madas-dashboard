/**
 * sanitizeHtml — strip dangerous tags/attributes from rich-text HTML.
 *
 * Uses DOMPurify with a conservative allowlist so merchants can format
 * their content (bold, italic, lists, links) without XSS risk.
 */
import DOMPurify, { type Config } from 'dompurify';

const PURIFY_CONFIG: Config = {
  ALLOWED_TAGS: [
    'p','br','b','strong','i','em','u','s','strike',
    'h1','h2','h3','h4','h5','h6',
    'ul','ol','li','blockquote','pre','code',
    'a','img','span','div',
    'table','thead','tbody','tr','th','td',
    'hr',
  ],
  ALLOWED_ATTR: ['href','target','rel','src','alt','class','style','title'],
  ALLOW_DATA_ATTR: false,
  FORCE_BODY: true,
};

export function sanitizeHtml(html: string): string {
  if (!html) return '';
  return String(DOMPurify.sanitize(html, PURIFY_CONFIG));
}

/** Strip all HTML tags and return plain text. Use for short text fields that don't need formatting. */
export function stripHtml(html: string): string {
  if (!html) return '';
  return String(DOMPurify.sanitize(html, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] }));
}
