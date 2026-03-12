'use client';

import { useCallback, useRef, useState } from 'react';
import { Upload } from 'lucide-react';
import { cn } from '@/lib/utils';

const ACCEPTED_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
];

const ACCEPTED_EXTENSIONS = '.pdf,.jpg,.jpeg,.png';

interface DropZoneProps {
  onFilesSelected: (files: File[]) => void;
  disabled?: boolean;
}

export function DropZone({ onFilesSelected, disabled }: DropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    (fileList: FileList | null) => {
      if (!fileList || disabled) return;
      const valid = Array.from(fileList).filter((f) =>
        ACCEPTED_TYPES.includes(f.type),
      );
      if (valid.length > 0) {
        onFilesSelected(valid);
      }
    },
    [onFilesSelected, disabled],
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (!disabled) setIsDragging(true);
    },
    [disabled],
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles],
  );

  const handleClick = useCallback(() => {
    if (!disabled) inputRef.current?.click();
  }, [disabled]);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      handleFiles(e.target.files);
      // Reset input so the same file can be re-selected
      if (inputRef.current) inputRef.current.value = '';
    },
    [handleFiles],
  );

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') handleClick();
      }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        'flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 text-center transition-colors cursor-pointer',
        isDragging
          ? 'border-notary-accent bg-notary-accent/10'
          : 'border-muted-foreground/30 hover:border-muted-foreground/50',
        disabled && 'pointer-events-none opacity-50',
      )}
    >
      <Upload className="h-8 w-8 text-muted-foreground" />
      <p className="text-sm text-muted-foreground">
        Arrastra documentos o haz clic para seleccionar
      </p>
      <p className="text-xs text-muted-foreground/70">PDF, JPG, PNG</p>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_EXTENSIONS}
        multiple
        className="hidden"
        onChange={handleInputChange}
      />
    </div>
  );
}
