/**
 * Zod schemas for parsing LLM JSON responses.
 * Mirrored from cli/src/documents/schemas.ts — keep in sync.
 */
import { z } from 'zod';

const ExtractedFieldSchema = z.object({
  value: z.string(),
  confidence: z.number().min(0).max(1),
});

const BaseExtractionSchema = z.object({
  documentType: z.string(),
  confidence: z.number().min(0).max(1),
  fields: z.record(z.string(), ExtractedFieldSchema),
});

const ClassificationSchema = z.object({
  documentType: z.string(),
  confidence: z.number().min(0).max(1),
  reasoning: z.string().optional(),
});

/**
 * Parses JSON from LLM response, cleaning markdown fences if present.
 */
export function parseJsonResponse<T>(raw: string, schema: z.ZodSchema<T>): T {
  let cleaned = raw.trim();

  const jsonMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    cleaned = jsonMatch[1].trim();
  }

  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1) {
    cleaned = cleaned.slice(firstBrace, lastBrace + 1);
  }

  const parsed = JSON.parse(cleaned) as unknown;
  return schema.parse(parsed);
}

export { BaseExtractionSchema, ClassificationSchema, ExtractedFieldSchema };
