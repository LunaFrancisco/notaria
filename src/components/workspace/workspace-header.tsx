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

      {/* Circular progress ring */}
      <div className="hidden sm:flex items-center">
        <svg width="32" height="32" viewBox="0 0 32 32" className="shrink-0">
          <circle
            cx="16"
            cy="16"
            r="13"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            className="text-muted/40"
          />
          <circle
            cx="16"
            cy="16"
            r="13"
            fill="none"
            stroke="var(--notary-accent)"
            strokeWidth="3"
            strokeDasharray={`${2 * Math.PI * 13}`}
            strokeDashoffset={`${2 * Math.PI * 13 * (1 - percentage / 100)}`}
            strokeLinecap="round"
            className="progress-ring-circle"
          />
          <text
            x="16"
            y="16"
            textAnchor="middle"
            dominantBaseline="central"
            className="fill-foreground text-[8px] font-semibold"
          >
            {percentage}%
          </text>
        </svg>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Verify button — desktop only */}
      <div className="hidden items-center gap-2 md:flex">
        <Button variant="outline" size="sm" onClick={handleValidate} disabled={isValidating}>
          {isValidating ? (
            <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
          ) : (
            <FileSearch className="mr-1.5 h-4 w-4" />
          )}
          Verificar documentos
        </Button>
      </div>

      {/* Export button — always visible */}
      <ExportDialog
        trigger={
          <Button size="sm" className="sm:gap-1.5">
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Exportar</span>
          </Button>
        }
      />

      {/* Mobile dropdown for remaining actions */}
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
            <DropdownMenuItem>
              <CheckCircle2 className="mr-2 h-4 w-4" />
              {label} — {percentage}%
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
