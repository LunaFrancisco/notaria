/**
 * POST /api/documents/classify
 *
 * Lightweight classification-only endpoint.
 * Receives a file via FormData, runs the classification pipeline
 * (filename heuristics → text heuristics → LLM), and returns the
 * detected document type with confidence score.
 *
 * Much faster than the full /api/documents/process endpoint since
 * it skips field extraction entirely.
 */
import { NextResponse } from 'next/server';
import { createProvider, fileToLoadedFile, compraventaVehiculo } from '@/lib/pipeline';
import { classifyDocument } from '@/lib/pipeline/classify';
import { extractPdfText } from '@/lib/pipeline/pdf-text';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';

export interface ClassifyResponse {
  file: string;
  documentType: string;
  confidence: number;
}

export async function POST(request: Request): Promise<NextResponse> {
  let fileName = 'unknown';

  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: 'No file provided. Send a file via FormData with key "file".' },
        { status: 400 },
      );
    }

    fileName = file.name;
    logger.info('api:classify:received', { filename: fileName, size: file.size });

    const provider = createProvider();
    const loadedFile = await fileToLoadedFile(file);

    // Extract PDF text for text-based heuristics
    let pdfText: string | undefined;
    if (loadedFile.mimeType === 'application/pdf') {
      const pdfResult = await extractPdfText(loadedFile.buffer);
      if (pdfResult.isTextBased) {
        pdfText = pdfResult.text;
      }
    }

    const classification = await classifyDocument(
      loadedFile,
      provider,
      compraventaVehiculo,
      pdfText,
    );

    logger.info('api:classify:result', {
      filename: fileName,
      type: classification.documentType,
      confidence: classification.confidence,
    });

    const response: ClassifyResponse = {
      file: fileName,
      documentType: classification.documentType,
      confidence: classification.confidence,
    };

    return NextResponse.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown classification error';
    logger.error('api:classify:error', { filename: fileName, error: message });
    return NextResponse.json(
      { error: message, file: fileName },
      { status: 500 },
    );
  }
}
