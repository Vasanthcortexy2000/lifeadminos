import { useState, useCallback } from 'react';
import { Upload, FileText, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

interface ExtractedObligation {
  title: string;
  summary: string;
  due_date: string | null;
  risk_level: 'low' | 'medium' | 'high';
  consequence: string;
  steps: string[];
}

interface DocumentUploadProps {
  onUpload?: (files: File[]) => void;
  className?: string;
}

export function DocumentUpload({ onUpload, className }: DocumentUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const { user } = useAuth();

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      handleFiles(files);
    }
  }, []);

  const handleFiles = (files: File[]) => {
    setUploadedFiles(prev => [...prev, ...files]);
    onUpload?.(files);
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const extractTextFromFile = async (file: File): Promise<string> => {
    // For text-based files, read content directly
    if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
      return await file.text();
    }
    
    // For other files, return a placeholder noting the file type
    // In production, you'd use a document parsing service
    return `[Content from ${file.name} - ${file.type || 'unknown type'}]`;
  };

  const analyzeAndExtractObligations = async (documentId: string, rawText: string, documentName: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('analyze-document', {
        body: { rawText, documentName }
      });

      if (error) {
        console.error('Error calling analyze function:', error);
        throw error;
      }

      if (data.error) {
        throw new Error(data.error);
      }

      const obligations: ExtractedObligation[] = data.obligations || [];
      
      if (obligations.length === 0) {
        toast({
          title: "No immediate actions found.",
          description: "I'll keep this on file.",
        });
        return 0;
      }

      // Insert each obligation into the database
      for (const obligation of obligations) {
        const { error: insertError } = await supabase.from('obligations').insert({
          user_id: user!.id,
          document_id: documentId,
          title: obligation.title,
          description: obligation.summary,
          source_document: documentName,
          deadline: obligation.due_date || null,
          risk_level: obligation.risk_level,
          status: 'not-started',
          type: 'mandatory',
          frequency: 'one-time',
          consequence: obligation.consequence,
          steps: obligation.steps || [],
        });

        if (insertError) {
          console.error('Error inserting obligation:', insertError);
        }
      }

      return obligations.length;
    } catch (error) {
      console.error('Error analyzing document:', error);
      throw error;
    }
  };

  const handleProcessDocuments = async () => {
    if (uploadedFiles.length === 0) {
      toast({
        title: "Please add a document before continuing.",
        description: "Drop a file above or click to browse your files.",
        variant: "default",
      });
      return;
    }

    if (!user) {
      toast({
        title: "Please sign in to continue.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    try {
      let totalObligations = 0;

      for (const file of uploadedFiles) {
        const rawText = await extractTextFromFile(file);
        
        // Save document to database
        const { data: docData, error: docError } = await supabase
          .from('documents')
          .insert({
            user_id: user.id,
            name: file.name,
            type: file.type || 'application/octet-stream',
            source_type: 'file',
            raw_text: rawText,
          })
          .select('id')
          .single();

        if (docError) {
          throw docError;
        }

        toast({
          title: "Document received.",
          description: "I'm reviewing it now.",
        });

        // Analyze document and extract obligations
        const count = await analyzeAndExtractObligations(docData.id, rawText, file.name);
        totalObligations += count;
      }

      if (totalObligations > 0) {
        toast({
          title: `Found ${totalObligations} obligation${totalObligations > 1 ? 's' : ''}.`,
          description: "I've added them to your timeline.",
        });
      }

      // Clear uploaded files after successful processing
      setUploadedFiles([]);
    } catch (error) {
      console.error('Error processing documents:', error);
      toast({
        title: "Something went wrong.",
        description: "Please try again in a moment.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className={cn('space-y-4', className)}>
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          'relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 cursor-pointer',
          isDragOver
            ? 'border-primary bg-accent'
            : 'border-border hover:border-primary/50 hover:bg-accent/50'
        )}
      >
        <input
          type="file"
          multiple
          accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.txt"
          onChange={handleFileSelect}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center">
            <Upload className="w-5 h-5 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">
              Drop documents here or click to browse
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              PDFs, images, and documents accepted
            </p>
          </div>
        </div>
      </div>

      {uploadedFiles.length > 0 && (
        <div className="space-y-2">
          {uploadedFiles.map((file, index) => (
            <div
              key={index}
              className="flex items-center gap-3 p-3 bg-secondary rounded-lg animate-fade-in"
            >
              <FileText className="w-4 h-4 text-muted-foreground" />
              <span className="flex-1 text-sm text-foreground truncate">
                {file.name}
              </span>
              <span className="text-xs text-muted-foreground">
                {(file.size / 1024).toFixed(1)} KB
              </span>
              <button
                onClick={() => removeFile(index)}
                className="p-1 hover:bg-accent rounded transition-colors"
                disabled={isProcessing}
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
          ))}
        </div>
      )}

      <Button
        onClick={handleProcessDocuments}
        disabled={isProcessing}
        className="w-full"
        size="lg"
      >
        {isProcessing ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Processing...
          </>
        ) : (
          'Process document'
        )}
      </Button>
    </div>
  );
}
