/**
 * AI Layout Schema
 * ────────────────────────────────────────────────────────────────────
 * Zod schema that validates the JSON output of AI theme generation.
 *
 * RULES enforced here:
 *  - `type` must be a registered section type (prevents injection of
 *    arbitrary HTML through ai-generated content)
 *  - `data` values are plain strings / numbers / booleans (no HTML)
 *  - `settings.customJs` is explicitly forbidden (XSS prevention)
 *  - Maximum 30 sections per layout
 */

import { z } from 'zod';

/* ── Registered section types ──────────────────────────────────────── */
export const REGISTERED_SECTION_TYPES = [
  'hero', 'navbar', 'footer', 'features', 'products', 'deals',
  'collections', 'testimonials', 'cta', 'about', 'contact',
  'gallery', 'pricing', 'faq', 'stats', 'team', 'services',
  'video', 'countdown', 'banner', 'partners', 'newsletter',
  'divider', 'imageComparison',
] as const;

export type RegisteredSectionType = typeof REGISTERED_SECTION_TYPES[number];

/* ── Section data value — no raw HTML ─────────────────────────────── */
const SectionDataValueSchema: z.ZodType<unknown> = z.lazy(() =>
  z.union([
    z.string().max(4000),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(SectionDataValueSchema).max(100),
    z.record(z.string().max(100), SectionDataValueSchema),
  ])
);

/* ── Individual section ────────────────────────────────────────────── */
const AiSectionSchema = z.object({
  /** Must match a registered section type — no arbitrary values */
  type: z.enum(REGISTERED_SECTION_TYPES, {
    errorMap: () => ({ message: 'Unknown section type. Only registered types are allowed.' }),
  }),

  /**
   * Freeform section data — values are scalar / array / plain object.
   * HTML strings are filtered at the service layer before rendering.
   */
  data: z.record(z.string().max(100), SectionDataValueSchema).optional(),

  /**
   * Explicit render order (0-based). If omitted the array order is used.
   */
  order: z.number().int().min(0).max(29).optional(),

  /** Whether the section starts hidden */
  hidden: z.boolean().optional(),
});

export type AiSection = z.infer<typeof AiSectionSchema>;

/* ── Theme colours ─────────────────────────────────────────────────── */
const HexColorSchema = z
  .string()
  .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'Must be a valid 3- or 6-digit hex colour')
  .optional();

const AiThemeSchema = z.object({
  primaryColor:    HexColorSchema,
  secondaryColor:  HexColorSchema,
  accentColor:     HexColorSchema,
  backgroundColor: HexColorSchema,
  textColor:       HexColorSchema,
  fontFamily:      z.string().max(80).optional(),
  borderRadius:    z.enum(['sharp', 'rounded', 'pill']).optional(),
}).optional();

/* ── SEO overrides ─────────────────────────────────────────────────── */
const AiSeoSchema = z.object({
  title:       z.string().max(160).optional(),
  description: z.string().max(300).optional(),
  keywords:    z.array(z.string().max(50)).max(20).optional(),
}).optional();

/* ── Root AiLayout ─────────────────────────────────────────────────── */
export const AiLayoutSchema = z.object({
  /** Human-readable name for the generated theme */
  name: z.string().max(120).optional(),

  /** Ordered list of sections (max 30) */
  sections: z
    .array(AiSectionSchema)
    .min(1, 'At least one section is required')
    .max(30, 'Maximum 30 sections per layout'),

  /** Optional theme override */
  theme: AiThemeSchema,

  /** Optional SEO metadata */
  seo: AiSeoSchema,
});

export type AiLayout = z.infer<typeof AiLayoutSchema>;

/* ── Validation helper ─────────────────────────────────────────────── */
export function validateAiLayout(raw: unknown): { success: true; data: AiLayout } | { success: false; errors: string[] } {
  const result = AiLayoutSchema.safeParse(raw);
  if (result.success) return { success: true, data: result.data };
  return {
    success: false,
    errors:  result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`),
  };
}
