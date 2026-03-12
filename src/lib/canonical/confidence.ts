import type { ConfidenceLevel } from '@/lib/types';

/**
 * Maps a numeric confidence (0–1) to a discrete level.
 * - low:    [0, 0.6)
 * - medium: [0.6, 0.85)
 * - high:   [0.85, 1.0]
 */
export function mapConfidenceToLevel(confidence: number): ConfidenceLevel {
  if (confidence >= 0.85) return 'high';
  if (confidence >= 0.6) return 'medium';
  return 'low';
}
