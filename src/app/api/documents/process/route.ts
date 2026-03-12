/**
 * POST /api/documents/process
 *
 * Receives a file via FormData, runs the extraction pipeline
 * (classify → extract), and returns an enriched ExtractionResult.
 *
 * Requires Node.js runtime (pdf-parse + LLM providers).
 */
import { NextResponse } from 'next/server';
import { createProvider, fileToLoadedFile, extractFromDocument, compraventaVehiculo } from '@/lib/pipeline';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';

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
    logger.info('api:document:received', { filename: fileName, size: file.size });

    const provider = createProvider();
    const loadedFile = await fileToLoadedFile(file);

    const extractionResult = await extractFromDocument(
      loadedFile,
      provider,
      compraventaVehiculo,
    );

    // Enrich with processing timestamp
    const enrichedResult = {
      ...extractionResult,
      processedAt: new Date().toISOString(),
    };

    logger.info('api:document:processed', {
      filename: fileName,
      type: extractionResult.documentType,
      fieldCount: Object.keys(extractionResult.fields).length,
    });

    return NextResponse.json(enrichedResult);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown processing error';
    logger.error('api:document:error', { filename: fileName, error: message });
    return NextResponse.json(
      { error: message, file: fileName },
      { status: 500 },
    );
  }
}
