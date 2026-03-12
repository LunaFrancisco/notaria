/**
 * Document classification pipeline.
 * Mirrored from cli/src/pipeline/classify.ts — keep in sync.
 */
import type { LLMProvider, ContentPart, LoadedFile } from './providers';
import { toDataUri } from './providers';
import type { ContractDefinition } from './contract-def';
import { ClassificationSchema, parseJsonResponse } from './schemas';

/**
 * Classifies a document: filename heuristics → text heuristics → LLM fallback.
 */
export async function classifyDocument(
  file: LoadedFile,
  provider: LLMProvider,
  contractDef: ContractDefinition,
  pdfText?: string,
): Promise<{ documentType: string; confidence: number }> {
  const lower = file.fileName.toLowerCase();

  // Tier 1: filename heuristics
  for (const docType of contractDef.documentTypes) {
    for (const hint of docType.filenameHints) {
      if (hint.confidence >= 0.85 && lower.includes(hint.pattern)) {
        return { documentType: docType.id, confidence: hint.confidence };
      }
    }
  }

  // Tier 2: text content heuristics
  if (pdfText) {
    const lowerText = pdfText.toLowerCase();
    for (const docType of contractDef.documentTypes) {
      for (const hint of docType.textHints) {
        if (hint.confidence >= 0.9 && lowerText.includes(hint.pattern)) {
          return { documentType: docType.id, confidence: hint.confidence };
        }
      }
    }
  }

  // Tier 3: LLM classification
  const systemPrompt = contractDef.systemPrompt;
  const validDocTypeIds = contractDef.documentTypes.map(d => d.id);

  let response: string;

  if (pdfText) {
    response = await provider.complete([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `${contractDef.classificationPrompt}\n\nTexto del documento:\n\n${pdfText}` },
    ]);
  } else {
    const content: ContentPart[] = [
      { type: 'text', text: contractDef.classificationPrompt },
      { type: 'image_url', image_url: { url: toDataUri(file) } },
    ];

    response = await provider.complete([
      { role: 'system', content: systemPrompt },
      { role: 'user', content },
    ]);
  }

  const result = parseJsonResponse(response, ClassificationSchema);

  const docType = validDocTypeIds.includes(result.documentType)
    ? result.documentType
    : 'unknown';

  return { documentType: docType, confidence: result.confidence };
}
