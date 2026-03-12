/**
 * POST /api/contract/validate
 *
 * Receives CompraventaVehiculoData + ExtractionResult[],
 * runs the validation engine, and returns ValidationResult.
 *
 * Requires Node.js runtime for consistency.
 */
import { NextResponse } from 'next/server';
import type { ExtractionResult } from '@/lib/types/extraction';
import type { CompraventaVehiculoData } from '@/lib/types/contract';
import { validateContract, compraventaVehiculo } from '@/lib/pipeline';

export const runtime = 'nodejs';

interface ValidateRequestBody {
  contractData: CompraventaVehiculoData;
  extractions: ExtractionResult[];
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = (await request.json()) as ValidateRequestBody;

    if (!body.contractData || !body.extractions || !Array.isArray(body.extractions)) {
      return NextResponse.json(
        { error: 'Invalid request. Expected { contractData: CompraventaVehiculoData, extractions: ExtractionResult[] }' },
        { status: 400 },
      );
    }

    const result = validateContract(
      compraventaVehiculo,
      body.contractData as unknown as Record<string, unknown>,
      body.extractions,
    );

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown validation error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
