/**
 * PDF text extraction using pdf-parse v2.
 * Mirrored from cli/src/utils/pdf-text-extractor.ts — keep in sync.
 *
 * pdf-parse v2 bundles pdfjs-dist which references DOMMatrix at module load.
 * We use a lazy dynamic import and polyfill DOMMatrix for Node.js environments.
 */

export interface PdfTextResult {
  text: string;
  pageCount: number;
  isTextBased: boolean;
}

const MIN_CHARS_PER_PAGE = 50;

type PDFParseInstance = {
  getText(): Promise<{ text: string; total: number }>;
  destroy(): Promise<void>;
};

type PDFParseConstructor = new (opts: { data: Buffer }) => PDFParseInstance;

let PDFParseClass: PDFParseConstructor | null = null;

async function getPDFParse(): Promise<PDFParseConstructor> {
  if (PDFParseClass) return PDFParseClass;

  // Polyfill DOMMatrix for Node.js (pdfjs-dist requires it at load time)
  if (typeof globalThis.DOMMatrix === 'undefined') {
    globalThis.DOMMatrix = class DOMMatrix {
      m11 = 1; m12 = 0; m13 = 0; m14 = 0;
      m21 = 0; m22 = 1; m23 = 0; m24 = 0;
      m31 = 0; m32 = 0; m33 = 1; m34 = 0;
      m41 = 0; m42 = 0; m43 = 0; m44 = 1;
      a = 1; b = 0; c = 0; d = 1; e = 0; f = 0;
      is2D = true;
      isIdentity = true;
    } as unknown as typeof DOMMatrix;
  }

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require('pdf-parse') as { PDFParse: PDFParseConstructor };
  PDFParseClass = mod.PDFParse;
  return PDFParseClass;
}

export async function extractPdfText(buffer: Buffer): Promise<PdfTextResult> {
  try {
    const PDFParse = await getPDFParse();
    const parser = new PDFParse({ data: buffer });
    const result = await parser.getText();
    const pageCount = result.total;
    const text = result.text;
    const charsPerPage = text.replace(/\s/g, '').length / Math.max(pageCount, 1);

    await parser.destroy();

    return {
      text,
      pageCount,
      isTextBased: charsPerPage >= MIN_CHARS_PER_PAGE,
    };
  } catch {
    return { text: '', pageCount: 0, isTextBased: false };
  }
}
