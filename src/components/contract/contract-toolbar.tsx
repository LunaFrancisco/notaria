'use client';

import { useCallback, type RefObject } from 'react';
import {
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
} from 'lucide-react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip';

interface ContractToolbarProps {
  editorRef: RefObject<HTMLDivElement | null>;
}

interface ToolbarAction {
  command: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}

const TEXT_FORMAT_ACTIONS: ToolbarAction[] = [
  { command: 'bold', icon: Bold, label: 'Negrita' },
  { command: 'italic', icon: Italic, label: 'Cursiva' },
  { command: 'underline', icon: Underline, label: 'Subrayado' },
];

const LIST_FORMAT_ACTIONS: ToolbarAction[] = [
  { command: 'insertOrderedList', icon: ListOrdered, label: 'Lista ordenada' },
  { command: 'insertUnorderedList', icon: List, label: 'Lista sin orden' },
];

export function ContractToolbar({ editorRef }: ContractToolbarProps) {
  const executeCommand = useCallback(
    (command: string) => {
      if (!editorRef.current) return;
      editorRef.current.focus();
      document.execCommand(command, false);
    },
    [editorRef],
  );

  return (
    <div className="flex items-center gap-1 rounded-lg border bg-background p-1">
      <ToggleGroup variant="outline" size="sm">
        {TEXT_FORMAT_ACTIONS.map((action) => (
          <Tooltip key={action.command}>
            <TooltipTrigger
              render={(props) => (
                <ToggleGroupItem
                  {...props}
                  value={action.command}
                  aria-label={action.label}
                  onClick={() => executeCommand(action.command)}
                >
                  <action.icon className="h-4 w-4" />
                </ToggleGroupItem>
              )}
            />
            <TooltipContent>{action.label}</TooltipContent>
          </Tooltip>
        ))}
      </ToggleGroup>

      <Separator orientation="vertical" className="mx-1 h-6" />

      <ToggleGroup variant="outline" size="sm">
        {LIST_FORMAT_ACTIONS.map((action) => (
          <Tooltip key={action.command}>
            <TooltipTrigger
              render={(props) => (
                <ToggleGroupItem
                  {...props}
                  value={action.command}
                  aria-label={action.label}
                  onClick={() => executeCommand(action.command)}
                >
                  <action.icon className="h-4 w-4" />
                </ToggleGroupItem>
              )}
            />
            <TooltipContent>{action.label}</TooltipContent>
          </Tooltip>
        ))}
      </ToggleGroup>
    </div>
  );
}
