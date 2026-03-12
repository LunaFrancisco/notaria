'use client';

import { useMemo, useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  CheckCircle2,
  Download,
  FileSearch,
  Loader2,
  MoreVertical,
  Scale,
} from 'lucide-react';

import { useContractStore } from '@/store/contract-store';
import { ExportDialog } from '@/components/export/export-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

interface CompletionInfo {
  percentage: number;
  filledCount: number;
  totalCount: number;
  label: string;
  variant: 'secondary' | 'default' | 'outline';
}

function useCompletion(): CompletionInfo {
  const fields = useContractStore((s) => s.fields);

  return useMemo(() => {
    const entries = Object.values(fields);
    const totalCount = entries.length;
    const filledCount = entries.filter(
      (f) => f.value !== null && f.value !== '',
    ).length;
    const percentage = totalCount === 0 ? 0 : Math.round((filledCount / totalCount) * 100);

    let label: string;
    let variant: CompletionInfo['variant'];
    if (percentage >= 100) {
      label = 'Listo';
      variant = 'default';
    } else if (percentage >= 50) {
      label = 'Incompleto';
      variant = 'outline';
    } else {
      label = 'Borrador';
      variant = 'secondary';
    }

    return { percentage, filledCount, totalCount, label, variant };
  }, [fields]);
}

export function WorkspaceHeader() {
  const router = useRouter();
  const { percentage, label, variant } = useCompletion();
  const validateContractData = useContractStore((s) => s.validateContractData);
  const [isValidating, setIsValidating] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);

  const handleValidate = useCallback(async () => {
    setIsValidating(true);
    try {
      await validateContractData();
      toast.success('Validación completada');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error de validación';
      toast.error(message);
    } finally {
      setIsValidating(false);
    }
  }, [validateContractData]);

  return (
    <header className="sticky top-0 z-30 flex items-center gap-3 border-b bg-[var(--notary-parchment)] px-4 py-3 md:px-6">
      {/* Back + logo */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => router.push('/')}
        aria-label="Volver al inicio"
      >
        <ArrowLeft className="h-5 w-5" />
      </Button>

      <div className="flex items-center gap-2">
        <Scale className="h-5 w-5 text-[var(--notary-accent)]" data-icon="scale" />
        <span className="hidden text-sm font-semibold sm:inline">NotaryFlow</span>
      </div>

      {/* Status badge */}
      <Badge variant={variant} className="ml-2">
        {label}
      </Badge>

      {/* Progress bar — hidden on very small screens */}
      <div className="hidden items-center gap-2 sm:flex sm:min-w-[120px] md:min-w-[180px]">
        <Progress value={percentage} className="h-2 flex-1" />
        <span className="text-xs text-muted-foreground tabular-nums">
          {percentage}%
        </span>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Desktop actions */}
      <div className="hidden items-center gap-2 md:flex">
        <Button variant="outline" size="sm" onClick={handleValidate} disabled={isValidating}>
          {isValidating ? (
            <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
          ) : (
            <FileSearch className="mr-1.5 h-4 w-4" />
          )}
          Verificar documentos
        </Button>
        <ExportDialog
          trigger={
            <Button size="sm">
              <Download className="mr-1.5 h-4 w-4" />
              Exportar
            </Button>
          }
        />
      </div>

      {/* Mobile dropdown */}
      <div className="md:hidden">
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="ghost" size="icon" aria-label="Acciones">
                <MoreVertical className="h-5 w-5" />
              </Button>
            }
          />
          <DropdownMenuContent align="end" side="bottom" sideOffset={4}>
            <DropdownMenuItem onClick={handleValidate} disabled={isValidating}>
              <FileSearch className="mr-2 h-4 w-4" />
              Verificar documentos
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setExportDialogOpen(true)}>
              <Download className="mr-2 h-4 w-4" />
              Exportar
            </DropdownMenuItem>
            <DropdownMenuItem>
              <CheckCircle2 className="mr-2 h-4 w-4" />
              {label} — {percentage}%
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <ExportDialog
          open={exportDialogOpen}
          onOpenChange={setExportDialogOpen}
        />
      </div>
    </header>
  );
}
