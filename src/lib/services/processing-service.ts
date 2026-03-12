/**
 * Document processing service interface and implementation.
 * Abstracts API calls for testability — swap RealProcessingService for mocks in tests.
 */
import type { ExtractionResult } from '@/lib/types/extraction';
import type { CompraventaVehiculoData } from '@/lib/types/contract';
import type { ValidationResult } from '@/lib/types/validation';

/** Enriched ExtractionResult with processing timestamp from API */
export interface EnrichedExtractionResult extends ExtractionResult {
  processedAt: string;
}

/** Error response shape from process API */
export interface ProcessErrorResponse {
  error: string;
  file: string;
}

export interface DocumentProcessingService {
  processDocument(file: File): Promise<EnrichedExtractionResult>;
  mergeResults(extractions: ExtractionResult[]): Promise<CompraventaVehiculoData>;
  validateContract(
    data: CompraventaVehiculoData,
    extractions: ExtractionResult[],
  ): Promise<ValidationResult>;
}

export class RealProcessingService implements DocumentProcessingService {
  async processDocument(file: File): Promise<EnrichedExtractionResult> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch('/api/documents/process', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorBody = (await response.json()) as ProcessErrorResponse;
      throw new Error(errorBody.error || `Processing failed: ${response.status}`);
    }

    return response.json() as Promise<EnrichedExtractionResult>;
  }

  async mergeResults(extractions: ExtractionResult[]): Promise<CompraventaVehiculoData> {
    const response = await fetch('/api/contract/merge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ extractions }),
    });

    if (!response.ok) {
      const errorBody = (await response.json()) as { error: string };
      throw new Error(errorBody.error || `Merge failed: ${response.status}`);
    }

    return response.json() as Promise<CompraventaVehiculoData>;
  }

  async validateContract(
    contractData: CompraventaVehiculoData,
    extractions: ExtractionResult[],
  ): Promise<ValidationResult> {
    const response = await fetch('/api/contract/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contractData, extractions }),
    });

    if (!response.ok) {
      const errorBody = (await response.json()) as { error: string };
      throw new Error(errorBody.error || `Validation failed: ${response.status}`);
    }

    return response.json() as Promise<ValidationResult>;
  }
}
