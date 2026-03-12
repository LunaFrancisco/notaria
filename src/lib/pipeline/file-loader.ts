/**
 * File loading utilities for uploaded files in Next.js API routes.
 * Adapted from cli/src/utils/file-loader.ts for File/Buffer inputs.
 */
import { writeFile, unlink } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { randomUUID } from 'crypto';
import type { LoadedFile } from './providers';

const MIME_MAP: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
};

const ALLOWED_MIMES = new Set(Object.values(MIME_MAP));

/**
 * Converts a web File (from FormData) to LoadedFile for pipeline processing.
 */
export async function fileToLoadedFile(file: File): Promise<LoadedFile> {
  const mimeType = file.type;

  if (!ALLOWED_MIMES.has(mimeType)) {
    throw new Error(
      `Unsupported file type: ${mimeType}. Supported: ${Array.from(ALLOWED_MIMES).join(', ')}`
    );
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const base64 = buffer.toString('base64');

  return {
    base64,
    buffer,
    mimeType,
    fileName: file.name,
  };
}

/**
 * Saves a buffer to a temporary file and returns the path.
 * Caller is responsible for cleanup via cleanupTempFile.
 */
export async function saveTempFile(buffer: Buffer, originalName: string): Promise<string> {
  const ext = originalName.includes('.') ? originalName.slice(originalName.lastIndexOf('.')) : '.tmp';
  const tempPath = join(tmpdir(), `notaryflow-${randomUUID()}${ext}`);
  await writeFile(tempPath, buffer);
  return tempPath;
}

/**
 * Removes a temporary file, ignoring errors if it doesn't exist.
 */
export async function cleanupTempFile(path: string): Promise<void> {
  try {
    await unlink(path);
  } catch {
    // File already cleaned up or doesn't exist
  }
}

export { ALLOWED_MIMES };
