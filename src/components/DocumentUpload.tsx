import { useState, useCallback } from 'react';
import { Upload, FileText, X, Loader2, ClipboardPaste } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { ExtractedObligation } from '@/types/obligation';
import { ReviewObligationsModal } from './ReviewObligationsModal';
import { DebugPanel } from './DebugPanel';
import { extractTextFromPDF } from '@/lib/pdfExtractor';

interface DebugInfo {
  extractedText: string;
  rawResponse: unknown;
  documentName: string;
}

interface DocumentUploadProps {
  onUpload?: (files: File[]) => void;
  onObligationsSaved?: () => void;
  className?: string;
}

export function DocumentUpload({ onUpload, onObligationsSaved, className }: DocumentUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [extractedObligations, setExtractedObligations] = useState<ExtractedObligation[]>([]);
  const [currentDocumentId, setCurrentDocumentId] = useState<string | null>(null);
  const [currentDocumentName, setCurrentDocumentName] = useState<string>('');
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null);
  const [activeTab, setActiveTab] = useState<string>('upload');
  const [pastedText, setPastedText] = useState('');
  const [pastedDocName, setPastedDocName] = useState('');
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
    // Handle text files
    if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
      return await file.text();
    }
    
    // Handle PDFs
    if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
      try {
        const text = await extractTextFromPDF(file);
        if (text.trim().length < 50) {
          // PDF might be scanned/image-based
          return `[Scanned PDF - limited text extracted]\n${text}`;
        }
        return text;
      } catch (error) {
        console.error('PDF extraction failed:', error);
        return `[Could not extract text from ${file.name}]`;
      }
    }
    
    // Fallback for other file types
    return `[Content from ${file.name} - ${file.type || 'unknown type'}]`;
  };

  const analyzeDocument = async (rawText: string, documentName: string): Promise<{ obligations: ExtractedObligation[]; rawResponse: unknown }> => {
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

    return { 
      obligations: data.obligations || [],
      rawResponse: data
    };
  };

  const saveObligations = async (
    obligations: ExtractedObligation[], 
    documentId: string, 
    documentName: string
  ) => {
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
        throw insertError;
      }
    }
  };

  const processDocument = async (rawText: string, documentName: string, documentType: string) => {
    if (!user) {
      toast({
        title: "Please sign in to continue.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    try {
      const isPlaceholderText =
        rawText.startsWith('[Content from') ||
        rawText.startsWith('[Could not extract text from');

      // Save document to database
      const { data: docData, error: docError } = await supabase
        .from('documents')
        .insert({
          user_id: user.id,
          name: documentName,
          type: documentType,
          source_type: activeTab === 'paste' ? 'paste' : 'file',
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

      // If we couldn't actually extract any readable text, don't send placeholders to AI.
      // (This prevents hallucinated obligations.)
      if (isPlaceholderText) {
        setDebugInfo({
          extractedText: rawText,
          rawResponse: { success: true, obligations: [] },
          documentName,
        });
        toast({
          title: 'Could not read this PDF.',
          description: 'Try a text-based PDF or use Paste Text mode.',
          variant: 'destructive',
        });
        return;
      }

      // Analyze document
      const { obligations, rawResponse } = await analyzeDocument(rawText, documentName);

      // Set debug info
      setDebugInfo({
        extractedText: rawText,
        rawResponse,
        documentName: documentName,
      });

      if (obligations.length === 0) {
        toast({
          title: "No actionable items found in this document.",
          description: "I'll keep it on file.",
        });
      } else {
        // Show review modal
        setExtractedObligations(obligations);
        setCurrentDocumentId(docData.id);
        setCurrentDocumentName(documentName);
        setShowReviewModal(true);
      }
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

  const handleProcessUploadedFiles = async () => {
    if (uploadedFiles.length === 0) {
      toast({
        title: "Please add a document before continuing.",
        description: "Drop a file above or click to browse your files.",
        variant: "default",
      });
      return;
    }

    const file = uploadedFiles[0];
    const rawText = await extractTextFromFile(file);
    
    await processDocument(rawText, file.name, file.type || 'application/octet-stream');
    
    // Clear the processed file
    setUploadedFiles(prev => prev.slice(1));
  };

  const handleProcessPastedText = async () => {
    if (!pastedText.trim()) {
      toast({
        title: "Please paste some text before continuing.",
        description: "Copy text from your document and paste it above.",
        variant: "default",
      });
      return;
    }

    const docName = pastedDocName.trim() || `Pasted document ${new Date().toLocaleDateString()}`;
    
    await processDocument(pastedText, docName, 'text/plain');
    
    // Clear the pasted text
    setPastedText('');
    setPastedDocName('');
  };

  const handleConfirmObligations = async (obligations: ExtractedObligation[]) => {
    if (!currentDocumentId || !user) return;

    try {
      await saveObligations(obligations, currentDocumentId, currentDocumentName);
      
      toast({
        title: `Saved ${obligations.length} obligation${obligations.length !== 1 ? 's' : ''}.`,
        description: "I've added them to your timeline.",
      });

      // Reset state
      setExtractedObligations([]);
      setCurrentDocumentId(null);
      setCurrentDocumentName('');
      onObligationsSaved?.();
    } catch (error) {
      console.error('Error saving obligations:', error);
      toast({
        title: "Couldn't save — try again.",
        description: "There was an error saving your obligations.",
        variant: "destructive",
      });
      throw error;
    }
  };

  return (
    <>
      <div className={cn('space-y-4', className)}>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="upload" className="gap-2">
              <Upload className="w-4 h-4" />
              Upload file
            </TabsTrigger>
            <TabsTrigger value="paste" className="gap-2">
              <ClipboardPaste className="w-4 h-4" />
              Paste text
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="space-y-4 mt-4">
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
                    For best results, use text-based PDFs (not scanned images)
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
              onClick={handleProcessUploadedFiles}
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
          </TabsContent>

          <TabsContent value="paste" className="space-y-4 mt-4">
            <div className="space-y-3">
              <Input
                placeholder="Document name (optional)"
                value={pastedDocName}
                onChange={(e) => setPastedDocName(e.target.value)}
                className="w-full"
              />
              <Textarea
                placeholder="Paste your document text here...

Copy the full text from your letter, contract, or email and paste it here. This works best for:
• Offer letters and employment contracts
• Official correspondence
• Policy documents
• Any text-based document"
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                className="min-h-[200px] resize-none"
              />
              <p className="text-xs text-muted-foreground">
                Tip: Open your PDF, select all text (Ctrl+A / Cmd+A), copy (Ctrl+C / Cmd+C), and paste above.
              </p>
            </div>

            <Button
              onClick={handleProcessPastedText}
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
                'Process text'
              )}
            </Button>
          </TabsContent>
        </Tabs>

        {/* Debug Panel - shows after processing */}
        {debugInfo && user && (
          <DebugPanel
            extractedText={debugInfo.extractedText}
            rawResponse={debugInfo.rawResponse}
            documentName={debugInfo.documentName}
          />
        )}
      </div>

      <ReviewObligationsModal
        open={showReviewModal}
        onOpenChange={setShowReviewModal}
        obligations={extractedObligations}
        documentName={currentDocumentName}
        onConfirm={handleConfirmObligations}
        onSaveAnyway={handleConfirmObligations}
      />
    </>
  );
}
