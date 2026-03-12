/**
 * Document extraction pipeline.
 * Mirrored from cli/src/pipeline/extract.ts — keep in sync.
 */
import type { ExtractionResult } from '@/lib/types/extraction';
import type { LLMProvider, ContentPart, LoadedFile } from './providers';
import { toDataUri, MistralOCRProvider } from './providers';
import type { ContractDefinition } from './contract-def';
import { BaseExtractionSchema, parseJsonResponse } from './schemas';
import { classifyDocument } from './classify';
import { extractPdfText } from './pdf-text';

const UNKNOWN_EXTRACTION_PROMPT = `Analiza este documento e intenta extraer cualquier información relevante:
- Nombres de personas
- RUN/RUT
- Datos relevantes
- Fechas relevantes

Responde SOLO con JSON:
{
  "documentType": "unknown",
  "confidence": 0.5,
  "fields": { ... }
}`;

async function extractWithVision(
  file: LoadedFile,
  prompt: string,
  systemPrompt: string,
  provider: LLMProvider,
): Promise<Record<string, { value: string; confidence: number }>> {
  const content: ContentPart[] = [
    { type: 'text', text: prompt },
    { type: 'image_url', image_url: { url: toDataUri(file) } },
  ];

  const response = await provider.complete([
    { role: 'system', content: systemPrompt },
    { role: 'user', content },
  ]);

  const result = parseJsonResponse(response, BaseExtractionSchema);
  return result.fields;
}

async function extractWithMistralOCR(
  file: LoadedFile,
  prompt: string,
  systemPrompt: string,
  provider: MistralOCRProvider,
): Promise<Record<string, { value: string; confidence: number }>> {
  const ocrText = await provider.ocr(file);

  const response = await provider.complete([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: `${prompt}\n\nTexto del documento (extraído por OCR):\n\n${ocrText}` },
  ]);

  const result = parseJsonResponse(response, BaseExtractionSchema);
  return result.fields;
}

async function extractWithPdfText(
  text: string,
  prompt: string,
  systemPrompt: string,
  provider: LLMProvider,
): Promise<Record<string, { value: string; confidence: number }>> {
  const response = await provider.complete([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: `${prompt}\n\nTexto del documento (extraído del PDF):\n\n${text}` },
  ]);

  const result = parseJsonResponse(response, BaseExtractionSchema);
  return result.fields;
}

/**
 * Full pipeline: file → classification → extraction → ExtractionResult
 */
export async function extractFromDocument(
  file: LoadedFile,
  provider: LLMProvider,
  contractDef: ContractDefinition,
): Promise<ExtractionResult> {
  // Try PDF text extraction for text-based PDFs
  let pdfText: string | undefined;
  const isPdf = file.mimeType === 'application/pdf';

  if (isPdf) {
    const pdfResult = await extractPdfText(file.buffer);
    if (pdfResult.isTextBased) {
      pdfText = pdfResult.text;
    }
  }

  // Classify
  const classification = await classifyDocument(file, provider, contractDef, pdfText);

  // Find document type definition and its prompt
  const docTypeDef = contractDef.documentTypes.find(d => d.id === classification.documentType);
  const prompt = docTypeDef?.extractionPrompt || UNKNOWN_EXTRACTION_PROMPT;
  const systemPrompt = contractDef.systemPrompt;

  // Extract based on available text or provider type
  let fields: Record<string, { value: string; confidence: number }>;

  if (pdfText) {
    fields = await extractWithPdfText(pdfText, prompt, systemPrompt, provider);
  } else if (provider instanceof MistralOCRProvider) {
    fields = await extractWithMistralOCR(file, prompt, systemPrompt, provider);
  } else {
    fields = await extractWithVision(file, prompt, systemPrompt, provider);
  }

  // Apply normalize if defined
  if (docTypeDef?.normalize) {
    fields = docTypeDef.normalize(fields);
  }

  return {
    file: file.fileName,
    documentType: classification.documentType,
    classificationConfidence: classification.confidence,
    fields,
  };
}
