import { useState } from 'react';
import { ChevronDown, ChevronUp, AlertTriangle, Bug } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DebugPanelProps {
  extractedText: string;
  rawResponse: unknown;
  documentName: string;
}

export function DebugPanel({ extractedText, rawResponse, documentName }: DebugPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  
  const textLength = extractedText.length;
  const isLikelyUnreadable = textLength < 200 || extractedText.includes('[Content from');
  const previewText = extractedText.slice(0, 500);

  return (
    <div className="border border-dashed border-[hsl(var(--risk-medium))] rounded-lg bg-[hsl(var(--risk-medium)/0.05)] p-4 space-y-3">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 w-full text-left"
      >
        <Bug className="w-4 h-4 text-[hsl(var(--risk-medium))]" />
        <span className="text-sm font-medium text-[hsl(var(--risk-medium))]">
          Debug Panel — {documentName}
        </span>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 ml-auto text-muted-foreground" />
        ) : (
          <ChevronDown className="w-4 h-4 ml-auto text-muted-foreground" />
        )}
      </button>

      {isExpanded && (
        <div className="space-y-4 text-sm">
          {/* Warning */}
          {isLikelyUnreadable && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
              <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
              <div className="text-destructive">
                <p className="font-medium">This file may be scanned or unreadable.</p>
                <p className="text-xs mt-1 opacity-80">
                  Try a clearer PDF or use "Paste Text" mode instead.
                </p>
              </div>
            </div>
          )}

          {/* Text Length */}
          <div>
            <p className="text-muted-foreground mb-1">Extracted text length:</p>
            <p className={cn(
              "font-mono text-xs px-2 py-1 rounded inline-block",
              textLength < 200 ? "bg-destructive/20 text-destructive" : "bg-secondary"
            )}>
              {textLength} characters
            </p>
          </div>

          {/* Text Preview */}
          <div>
            <p className="text-muted-foreground mb-1">First 500 characters:</p>
            <pre className="font-mono text-xs bg-secondary p-3 rounded-lg overflow-x-auto whitespace-pre-wrap break-words max-h-32 overflow-y-auto">
              {previewText || '(empty)'}
              {textLength > 500 && '...'}
            </pre>
          </div>

          {/* Raw Response */}
          <div>
            <p className="text-muted-foreground mb-1">Raw AI response:</p>
            <pre className="font-mono text-xs bg-secondary p-3 rounded-lg overflow-x-auto whitespace-pre-wrap break-words max-h-48 overflow-y-auto">
              {JSON.stringify(rawResponse, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
