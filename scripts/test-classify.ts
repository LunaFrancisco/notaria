/**
 * Script para validar la clasificación y extracción de documentos reales.
 *
 * Usa el pipeline completo: filename heuristics → text heuristics → LLM/OCR.
 * Prueba distintos escenarios de subida, valida la asignación a slots,
 * y guarda los resultados detallados en scripts/test-results/.
 *
 * Uso:
 *   npx tsx scripts/test-classify.ts
 */
import { readFileSync, mkdirSync, writeFileSync } from 'fs';
import { resolve, basename, extname } from 'path';
import { config } from 'dotenv';

// Load env before any pipeline import
config({ path: resolve(__dirname, '../.env') });

import { extractPdfText } from '../src/lib/pipeline/pdf-text';
import { extractFromDocument } from '../src/lib/pipeline/extract';
import { createProvider } from '../src/lib/pipeline/providers';
import { compraventaVehiculo } from '../src/lib/pipeline/contract-def';
import { mapDocumentTypeToSlot, DOCUMENT_META } from '../src/store/contract-store';
import type { ExtractionResult } from '../src/lib/types/extraction';
import type { DocumentProcessingState } from '../src/lib/types';
import type { LoadedFile, LLMProvider } from '../src/lib/pipeline/providers';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const FILES_DIR = resolve(__dirname, '../../files');
const RESULTS_DIR = resolve(__dirname, 'test-results');

const MIME_MAP: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
};

function loadFile(filename: string): LoadedFile {
  const filePath = resolve(FILES_DIR, filename);
  const buffer = Buffer.from(readFileSync(filePath));
  const ext = extname(filename).toLowerCase();
  const mimeType = MIME_MAP[ext];
  if (!mimeType) throw new Error(`Unsupported extension: ${ext}`);
  return {
    base64: buffer.toString('base64'),
    buffer,
    mimeType,
    fileName: filename,
  };
}

function color(text: string, code: number): string {
  return `\x1b[${code}m${text}\x1b[0m`;
}
const green = (t: string) => color(t, 32);
const yellow = (t: string) => color(t, 33);
const red = (t: string) => color(t, 31);
const cyan = (t: string) => color(t, 36);
const bold = (t: string) => color(t, 1);
const dim = (t: string) => color(t, 2);

function confidenceColor(confidence: number): string {
  const pct = `${Math.round(confidence * 100)}%`;
  if (confidence >= 0.85) return green(pct);
  if (confidence >= 0.7) return yellow(pct);
  return red(pct);
}

/** Sanitize filename for use as markdown filename */
function sanitize(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/_+/g, '_');
}

// ---------------------------------------------------------------------------
// Classification tier detection (for reporting only)
// ---------------------------------------------------------------------------

function detectTier(file: LoadedFile, pdfText: string | undefined): string {
  const lower = file.fileName.toLowerCase();

  for (const docType of compraventaVehiculo.documentTypes) {
    for (const hint of docType.filenameHints) {
      if (hint.confidence >= 0.85 && lower.includes(hint.pattern)) {
        return 'filename';
      }
    }
  }

  if (pdfText) {
    const lowerText = pdfText.toLowerCase();
    for (const docType of compraventaVehiculo.documentTypes) {
      for (const hint of docType.textHints) {
        if (hint.confidence >= 0.9 && lowerText.includes(hint.pattern)) {
          return 'text';
        }
      }
    }
  }

  return 'LLM';
}

// ---------------------------------------------------------------------------
// Full pipeline runner (classify + extract)
// ---------------------------------------------------------------------------

interface FullResult {
  filename: string;
  documentType: string;
  classificationConfidence: number;
  tier: string;
  fields: Record<string, { value: string; confidence: number }>;
  pdfTextPreview: string | null;
  durationMs: number;
}

async function processFile(
  file: LoadedFile,
  provider: LLMProvider,
): Promise<FullResult> {
  const start = performance.now();

  // PDF text for tier detection
  let pdfText: string | undefined;
  if (file.mimeType === 'application/pdf') {
    const pdfResult = await extractPdfText(file.buffer);
    if (pdfResult.isTextBased) {
      pdfText = pdfResult.text;
    }
  }

  const tier = detectTier(file, pdfText);

  // Full pipeline: classify + extract
  const extraction: ExtractionResult = await extractFromDocument(
    file,
    provider,
    compraventaVehiculo,
  );

  const durationMs = Math.round(performance.now() - start);

  return {
    filename: file.fileName,
    documentType: extraction.documentType,
    classificationConfidence: extraction.classificationConfidence,
    tier,
    fields: extraction.fields,
    pdfTextPreview: pdfText ? pdfText.slice(0, 500) : null,
    durationMs,
  };
}

// ---------------------------------------------------------------------------
// Markdown report generators
// ---------------------------------------------------------------------------

function generateFileReport(result: FullResult, slot: string | null): string {
  const slotLabel = slot
    ? DOCUMENT_META.find((m) => m.key === slot)?.label ?? slot
    : 'No asignado';

  const fieldRows = Object.entries(result.fields)
    .sort(([, a], [, b]) => b.confidence - a.confidence)
    .map(([key, field]) => {
      const conf = Math.round(field.confidence * 100);
      return `| ${key} | ${field.value || '_(vacío)_'} | ${conf}% |`;
    })
    .join('\n');

  let md = `# ${result.filename}\n\n`;
  md += `| Propiedad | Valor |\n`;
  md += `|-----------|-------|\n`;
  md += `| **Tipo detectado** | \`${result.documentType}\` |\n`;
  md += `| **Confianza clasificación** | ${Math.round(result.classificationConfidence * 100)}% |\n`;
  md += `| **Método de clasificación** | ${result.tier} |\n`;
  md += `| **Slot asignado** | ${slotLabel} |\n`;
  md += `| **Tiempo de procesamiento** | ${result.durationMs}ms |\n`;
  md += `| **Campos extraídos** | ${Object.keys(result.fields).length} |\n`;
  md += `\n## Campos extraídos\n\n`;
  md += `| Campo | Valor | Confianza |\n`;
  md += `|-------|-------|-----------|\n`;
  md += fieldRows || '| _(sin campos)_ | | |';
  md += '\n';

  if (result.pdfTextPreview) {
    md += `\n## Texto PDF (preview)\n\n`;
    md += '```\n';
    md += result.pdfTextPreview;
    md += '\n```\n';
  }

  return md;
}

interface ScenarioResult {
  name: string;
  files: Array<{ result: FullResult; slot: string | null }>;
  totalMs: number;
}

function generateScenarioReport(scenario: ScenarioResult): string {
  const assigned = scenario.files.filter((f) => f.slot !== null).length;
  const total = scenario.files.length;

  let md = `# Escenario: ${scenario.name}\n\n`;
  md += `- **Archivos:** ${total}\n`;
  md += `- **Asignados:** ${assigned}/${total}\n`;
  md += `- **Tiempo total:** ${scenario.totalMs}ms\n\n`;

  md += `## Resultados por archivo\n\n`;
  md += `| Archivo | Tipo | Confianza | Método | Slot | Campos | Tiempo |\n`;
  md += `|---------|------|-----------|--------|------|--------|--------|\n`;

  for (const { result, slot } of scenario.files) {
    const slotLabel = slot
      ? DOCUMENT_META.find((m) => m.key === slot)?.label ?? slot
      : '---';
    md += `| ${result.filename} | \`${result.documentType}\` | ${Math.round(result.classificationConfidence * 100)}% | ${result.tier} | ${slotLabel} | ${Object.keys(result.fields).length} | ${result.durationMs}ms |\n`;
  }

  return md;
}

function generateSummaryReport(
  scenarios: ScenarioResult[],
  totalMs: number,
): string {
  const timestamp = new Date().toISOString();

  let md = `# Reporte de clasificación y extracción\n\n`;
  md += `- **Fecha:** ${timestamp}\n`;
  md += `- **Provider:** ${process.env.LLM_PROVIDER ?? 'openrouter'}\n`;
  md += `- **Modelo:** ${process.env.OPENROUTER_MODEL ?? 'default'}\n`;
  md += `- **Tiempo total:** ${totalMs}ms\n`;
  md += `- **Escenarios:** ${scenarios.length}\n\n`;

  md += `## Resumen por escenario\n\n`;
  md += `| Escenario | Archivos | Asignados | Tiempo |\n`;
  md += `|-----------|----------|-----------|--------|\n`;

  for (const scenario of scenarios) {
    const assigned = scenario.files.filter((f) => f.slot !== null).length;
    const total = scenario.files.length;
    const status = assigned === total ? 'OK' : `${total - assigned} sin slot`;
    md += `| ${scenario.name} | ${total} | ${assigned}/${total} ${status} | ${scenario.totalMs}ms |\n`;
  }

  // Unique files across all scenarios (dedup by filename)
  const uniqueFiles = new Map<string, { result: FullResult; slot: string | null }>();
  for (const scenario of scenarios) {
    for (const entry of scenario.files) {
      if (!uniqueFiles.has(entry.result.filename)) {
        uniqueFiles.set(entry.result.filename, entry);
      }
    }
  }

  md += `\n## Detalle por archivo único\n\n`;
  md += `| Archivo | Tipo | Confianza | Método | Campos |\n`;
  md += `|---------|------|-----------|--------|--------|\n`;

  for (const [, { result }] of uniqueFiles) {
    md += `| [${result.filename}](archivos/${sanitize(result.filename)}.md) | \`${result.documentType}\` | ${Math.round(result.classificationConfidence * 100)}% | ${result.tier} | ${Object.keys(result.fields).length} |\n`;
  }

  md += `\n## Archivos de escenario\n\n`;
  for (const scenario of scenarios) {
    const safeName = sanitize(scenario.name);
    md += `- [${scenario.name}](escenarios/${safeName}.md)\n`;
  }

  return md;
}

// ---------------------------------------------------------------------------
// Scenario runner
// ---------------------------------------------------------------------------

interface Scenario {
  name: string;
  files: string[];
}

async function runScenario(
  scenario: Scenario,
  provider: LLMProvider,
  /** Cache to avoid re-processing the same file across scenarios */
  cache: Map<string, FullResult>,
): Promise<ScenarioResult> {
  console.log(`\n${bold(`═══ ${scenario.name} ═══`)}`);
  console.log(dim(`  Archivos: ${scenario.files.join(', ')}`));
  console.log();

  const scenarioStart = performance.now();
  const documents: Record<string, DocumentProcessingState> = {};
  const fileResults: Array<{ result: FullResult; slot: string | null }> = [];

  for (const filename of scenario.files) {
    let result = cache.get(filename);

    if (!result) {
      const file = loadFile(filename);
      result = await processFile(file, provider);
      cache.set(filename, result);
    }

    const slot = mapDocumentTypeToSlot(result.documentType, documents);

    const slotLabel = slot
      ? DOCUMENT_META.find((m) => m.key === slot)?.label ?? slot
      : red('SIN SLOT');

    const tierTag = result.tier === 'filename'
      ? dim('[filename]')
      : result.tier === 'text'
        ? cyan('[text]')
        : yellow('[LLM]');

    const fieldCount = Object.keys(result.fields).length;

    console.log(
      `  ${basename(filename)}`,
      `→ ${green(result.documentType)}`,
      confidenceColor(result.classificationConfidence),
      tierTag,
      dim(`${fieldCount} campos`),
      dim(`${result.durationMs}ms`),
    );
    console.log(
      `    Slot: ${slot ? cyan(slotLabel) : red('No disponible')}`,
    );

    // Print top extracted fields
    const topFields = Object.entries(result.fields)
      .sort(([, a], [, b]) => b.confidence - a.confidence)
      .slice(0, 4);
    for (const [key, field] of topFields) {
      const val = field.value.length > 40 ? `${field.value.slice(0, 40)}...` : field.value;
      console.log(dim(`      ${key}: "${val}" (${Math.round(field.confidence * 100)}%)`));
    }
    if (Object.keys(result.fields).length > 4) {
      console.log(dim(`      ... y ${Object.keys(result.fields).length - 4} campos más`));
    }

    if (slot) {
      documents[slot] = {
        status: 'pending',
        file: new File([], filename),
        error: null,
        extractionResult: null,
      };
    }

    fileResults.push({ result, slot });
  }

  const totalMs = Math.round(performance.now() - scenarioStart);

  const assigned = Object.keys(documents).length;
  const total = scenario.files.length;
  console.log();
  console.log(
    `  ${dim('Resultado:')} ${assigned}/${total} documentos asignados a slots`,
  );
  if (assigned < total) {
    console.log(`  ${red(`⚠ ${total - assigned} archivo(s) sin slot`)}`);
  }

  return { name: scenario.name, files: fileResults, totalMs };
}

// ---------------------------------------------------------------------------
// Save reports
// ---------------------------------------------------------------------------

function saveReports(scenarios: ScenarioResult[], totalMs: number): void {
  // Create directories
  const archivosDir = resolve(RESULTS_DIR, 'archivos');
  const escenariosDir = resolve(RESULTS_DIR, 'escenarios');
  mkdirSync(archivosDir, { recursive: true });
  mkdirSync(escenariosDir, { recursive: true });

  // Per-file reports (deduplicated)
  const savedFiles = new Set<string>();
  for (const scenario of scenarios) {
    for (const { result, slot } of scenario.files) {
      if (savedFiles.has(result.filename)) continue;
      savedFiles.add(result.filename);

      const md = generateFileReport(result, slot);
      const outPath = resolve(archivosDir, `${sanitize(result.filename)}.md`);
      writeFileSync(outPath, md, 'utf-8');
    }
  }

  // Per-scenario reports
  for (const scenario of scenarios) {
    const md = generateScenarioReport(scenario);
    const outPath = resolve(escenariosDir, `${sanitize(scenario.name)}.md`);
    writeFileSync(outPath, md, 'utf-8');
  }

  // Summary report
  const summaryMd = generateSummaryReport(scenarios, totalMs);
  writeFileSync(resolve(RESULTS_DIR, 'resumen.md'), summaryMd, 'utf-8');

  console.log(`\n${green('Reportes guardados en:')} ${RESULTS_DIR}`);
  console.log(dim(`  resumen.md`));
  console.log(dim(`  archivos/ (${savedFiles.size} archivos)`));
  console.log(dim(`  escenarios/ (${scenarios.length} escenarios)`));
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const ALL_FILES = [
  'cedula_identidad.jpeg',
  'VEH_500684306148_DXJX.98.pdf',
  'Certificado_de_deuda (15).pdf',
  'Certificado_de_deuda (16).pdf',
  'IMG-20260305-WA0036 (1).jpg',
];

const SCENARIOS: Scenario[] = [
  {
    name: 'Solo una cédula',
    files: ['cedula_identidad.jpeg'],
  },
  {
    name: 'Vehículo + cédula',
    files: [
      'VEH_500684306148_DXJX.98.pdf',
      'cedula_identidad.jpeg',
    ],
  },
  {
    name: 'Certificado de deuda + cédula',
    files: [
      'Certificado_de_deuda (15).pdf',
      'cedula_identidad.jpeg',
    ],
  },
  {
    name: 'Dos certificados de deuda (vendedor y comprador)',
    files: [
      'Certificado_de_deuda (15).pdf',
      'Certificado_de_deuda (16).pdf',
    ],
  },
  {
    name: 'Imagen genérica (WhatsApp)',
    files: ['IMG-20260305-WA0036 (1).jpg'],
  },
  {
    name: 'Todos los documentos',
    files: ALL_FILES,
  },
];

async function main(): Promise<void> {
  console.log(bold('\n🔍 Test de clasificación y extracción de documentos\n'));
  console.log(dim(`Directorio de archivos: ${FILES_DIR}`));
  console.log(dim(`Directorio de resultados: ${RESULTS_DIR}`));
  console.log(dim(`Provider: ${process.env.LLM_PROVIDER ?? 'openrouter'}`));

  const provider = createProvider();
  const cache = new Map<string, FullResult>();
  const scenarioResults: ScenarioResult[] = [];

  const totalStart = performance.now();

  for (const scenario of SCENARIOS) {
    const result = await runScenario(scenario, provider, cache);
    scenarioResults.push(result);
  }

  const totalMs = Math.round(performance.now() - totalStart);

  saveReports(scenarioResults, totalMs);

  console.log(`\n${dim(`Tiempo total: ${totalMs}ms`)}\n`);
}

main().catch((error) => {
  console.error(red(`\nError fatal: ${error instanceof Error ? error.message : String(error)}`));
  process.exit(1);
});
