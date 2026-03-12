'use client';

import { useMemo, useCallback } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ChevronRight,
  Info,
} from 'lucide-react';

import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useContractStore } from '@/store/contract-store';
import type { ValidationIssue, ValidationResult } from '@/lib/types/validation';
import { dispatchSidebarItemClick } from '@/components/contract/extracted-data-list';

function severityIcon(severity: ValidationIssue['severity']) {
  switch (severity) {
    case 'error':
      return <AlertCircle className="h-4 w-4 text-destructive" />;
    case 'warning':
      return <AlertTriangle className="h-4 w-4 text-[var(--notary-confidence-medium)]" />;
    case 'info':
      return <Info className="h-4 w-4 text-muted-foreground" />;
  }
}

function severityVariant(severity: ValidationIssue['severity']): 'destructive' | 'default' {
  return severity === 'error' ? 'destructive' : 'default';
}

function severityLabel(severity: ValidationIssue['severity']): string {
  switch (severity) {
    case 'error': return 'Error';
    case 'warning': return 'Advertencia';
    case 'info': return 'Info';
  }
}

interface IssueCounts {
  errors: number;
  warnings: number;
  infos: number;
}

function countBySeverity(issues: ValidationIssue[]): IssueCounts {
  return {
    errors: issues.filter((i) => i.severity === 'error').length,
    warnings: issues.filter((i) => i.severity === 'warning').length,
    infos: issues.filter((i) => i.severity === 'info').length,
  };
}

function ValidationIssueItem({ issue }: { issue: ValidationIssue }) {
  const handleNavigate = useCallback(() => {
    if (issue.path) {
      dispatchSidebarItemClick(issue.path);
    }
  }, [issue.path]);

  return (
    <Alert variant={severityVariant(issue.severity)}>
      {severityIcon(issue.severity)}
      <AlertTitle className="flex items-center justify-between gap-2">
        <span className="flex-1">{issue.message}</span>
        {issue.path && (
          <button
            type="button"
            onClick={handleNavigate}
            className="shrink-0 rounded-sm p-0.5 transition-colors hover:bg-muted"
            aria-label={`Ir al campo ${issue.path}`}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        )}
      </AlertTitle>
      {(issue.suggestedFix || issue.evidence) && (
        <AlertDescription>
          {issue.suggestedFix && (
            <p className="text-xs">{issue.suggestedFix}</p>
          )}
          {issue.evidence && (
            <details className="mt-1">
              <summary className="cursor-pointer text-xs text-muted-foreground">
                Ver evidencia
              </summary>
              <p className="mt-1 rounded bg-muted px-2 py-1 font-mono text-xs">
                {issue.evidence}
              </p>
            </details>
          )}
        </AlertDescription>
      )}
    </Alert>
  );
}

function CompletenessFooter({ result }: { result: ValidationResult }) {
  const { extraction, manual, readiness } = result.completeness;

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-card p-3 text-sm">
      <span className="text-muted-foreground">Completitud:</span>
      <Badge variant="outline">
        Extracción {Math.round(extraction * 100)}%
      </Badge>
      <Badge variant="outline">
        Manual {Math.round(manual * 100)}%
      </Badge>
      <Separator orientation="vertical" className="h-4" />
      <Badge variant={readiness >= 0.85 ? 'default' : 'secondary'}>
        Preparación {Math.round(readiness * 100)}%
      </Badge>
    </div>
  );
}

/**
 * ValidationAlerts renders all validation issues from the CLI's ValidationResult
 * as shadcn Alerts, grouped by severity. Each alert with a path has a clickable
 * chevron that navigates to the corresponding contract placeholder.
 */
export function ValidationAlerts() {
  const validationResult = useContractStore((s) => s.validationResult);

  const sortedIssues = useMemo(() => {
    if (!validationResult) return [];
    const order: Record<string, number> = { error: 0, warning: 1, info: 2 };
    return [...validationResult.issues].sort(
      (a, b) => (order[a.severity] ?? 3) - (order[b.severity] ?? 3),
    );
  }, [validationResult]);

  const counts = useMemo(() => {
    if (!validationResult) return { errors: 0, warnings: 0, infos: 0 };
    return countBySeverity(validationResult.issues);
  }, [validationResult]);

  if (!validationResult) {
    return (
      <div className="flex flex-col gap-3 p-4">
        <p className="text-sm text-muted-foreground">
          No se ha ejecutado la validación. Procese documentos y presione &ldquo;Verificar documentos&rdquo;.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Summary badges */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium">Validación</span>
        {counts.errors > 0 && (
          <Badge variant="destructive">
            {counts.errors} {severityLabel('error')}{counts.errors > 1 ? 'es' : ''}
          </Badge>
        )}
        {counts.warnings > 0 && (
          <Badge variant="outline" className="border-[var(--notary-confidence-medium)] text-[var(--notary-confidence-medium)]">
            {counts.warnings} {severityLabel('warning')}{counts.warnings > 1 ? 's' : ''}
          </Badge>
        )}
        {counts.infos > 0 && (
          <Badge variant="secondary">
            {counts.infos} {severityLabel('info')}
          </Badge>
        )}
        {sortedIssues.length === 0 && (
          <Badge variant="default">Sin problemas</Badge>
        )}
      </div>

      {/* Issue list */}
      {sortedIssues.map((issue, idx) => (
        <ValidationIssueItem key={`${issue.code}-${issue.path ?? ''}-${idx}`} issue={issue} />
      ))}

      {/* Completeness report footer */}
      <CompletenessFooter result={validationResult} />
    </div>
  );
}
