/**
 * POST /api/contract/merge
 *
 * Receives ExtractionResult[], merges them into CompraventaVehiculoData.
 *
 * Requires Node.js runtime for consistency.
 */
import { NextResponse } from 'next/server';
import type { ExtractionResult } from '@/lib/types/extraction';
import { compraventaVehiculo } from '@/lib/pipeline';

export const runtime = 'nodejs';

interface MergeRequestBody {
  extractions: ExtractionResult[];
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = (await request.json()) as MergeRequestBody;

    if (!body.extractions || !Array.isArray(body.extractions)) {
      return NextResponse.json(
        { error: 'Invalid request. Expected { extractions: ExtractionResult[] }' },
        { status: 400 },
      );
    }

    const contractData = compraventaVehiculo.merge(body.extractions);

    return NextResponse.json(contractData);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown merge error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
