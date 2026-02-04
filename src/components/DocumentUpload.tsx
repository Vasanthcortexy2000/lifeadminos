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
import { ExtractedObligation, RiskLevel } from '@/types/obligation';
import { ReviewObligationsModal } from './ReviewObligationsModal';
import { extractTextFromPDF } from '@/lib/pdfExtractor';
import { isImageFile } from '@/lib/imageOCR';
import { useReminders } from '@/hooks/useReminders';


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
  
  const [activeTab, setActiveTab] = useState<string>('upload');
  const [pastedText, setPastedText] = useState('');
  const [pastedDocName, setPastedDocName] = useState('');
  const { user } = useAuth();
  const { createRemindersForObligation } = useReminders();

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

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        // Remove data URL prefix to get just base64
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
    });
  };

  const extractTextFromFile = async (file: File): Promise<{ text: string; sourceType: string; ocrFailed?: boolean; isImage?: boolean; imageBase64?: string; mimeType?: string }> => {
    const fileNameLower = file.name.toLowerCase();

    // Handle text files
    if (file.type === 'text/plain' || fileNameLower.endsWith('.txt')) {
      return { text: await file.text(), sourceType: 'file' };
    }
    
    // Handle images - use vision API directly (much better than OCR for complex layouts)
    if (isImageFile(file)) {
      const imageBase64 = await fileToBase64(file);
      const mimeType = file.type || 'image/jpeg';
      return { 
        text: '', 
        sourceType: 'image',
        isImage: true,
        imageBase64,
        mimeType
      };
    }
    
    // Handle PDFs
    if (file.type === 'application/pdf' || fileNameLower.endsWith('.pdf')) {
      try {
        const text = await extractTextFromPDF(file);
        if (text.trim().length < 50) {
          // PDF might be scanned/image-based
          return { 
            text: text, 
            sourceType: 'file',
            ocrFailed: true 
          };
        }
        return { text, sourceType: 'file' };
      } catch (error) {
        console.error('PDF extraction failed:', error);
        return { text: '', sourceType: 'file', ocrFailed: true };
      }
    }
    
    // Fallback for other file types
    return { text: '', sourceType: 'file', ocrFailed: true };
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

  const analyzeImageWithVision = async (imageBase64: string, documentName: string, mimeType: string): Promise<{ obligations: ExtractedObligation[]; rawResponse: unknown }> => {
    const { data, error } = await supabase.functions.invoke('analyze-document-vision', {
      body: { imageBase64, documentName, mimeType }
    });

    if (error) {
      console.error('Error calling vision analyze function:', error);
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
      const { data: insertedData, error: insertError } = await supabase
        .from('obligations')
        .insert({
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
          confidence: obligation.confidence || null,
          domain: obligation.domain || 'general',
        })
        .select('id')
        .single();

      if (insertError) {
        console.error('Error inserting obligation:', insertError);
        throw insertError;
      }

      // Create reminders for obligations with due dates (skip completed)
      if (obligation.due_date && insertedData) {
        try {
          await createRemindersForObligation(
            insertedData.id,
            new Date(obligation.due_date),
            obligation.risk_level as RiskLevel
          );
        } catch (reminderError) {
          console.error('Error creating reminders:', reminderError);
          // Don't fail the whole operation if reminders fail
        }
      }
    }
  };

  const processDocument = async (
    rawText: string, 
    documentName: string, 
    documentType: string,
    sourceType: string = 'file',
    ocrFailed: boolean = false
  ) => {
    if (!user) {
      toast({
        title: "Please sign in to continue.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    try {
      // Check if we failed to extract readable text
      if (ocrFailed || rawText.trim().length < 50) {
        // Save document anyway
        await supabase
          .from('documents')
          .insert({
            user_id: user.id,
            name: documentName,
            type: documentType,
            source_type: sourceType,
            raw_text: rawText || null,
          });

        toast({
          title: "I had trouble reading this image.",
          description: "A clearer screenshot or pasted text will work best.",
          variant: "default",
        });
        setIsProcessing(false);
        return;
      }

      // Save document to database
      const { data: docData, error: docError } = await supabase
        .from('documents')
        .insert({
          user_id: user.id,
          name: documentName,
          type: documentType,
          source_type: sourceType,
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

      // Analyze document
      const { obligations } = await analyzeDocument(rawText, documentName);

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

    if (!user) {
      toast({
        title: "Please sign in to continue.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    const file = uploadedFiles[0];

    try {
      const extraction = await extractTextFromFile(file);
      
      // For images, use vision API directly (much better for calendars, screenshots, etc.)
      if (extraction.isImage && extraction.imageBase64) {
        toast({
          title: "Analysing your image…",
          description: "I'm reading the contents carefully.",
        });

        // Save document to database first
        const { data: docData, error: docError } = await supabase
          .from('documents')
          .insert({
            user_id: user.id,
            name: file.name,
            type: file.type || 'image/jpeg',
            source_type: 'image',
            raw_text: null,
          })
          .select('id')
          .single();

        if (docError) {
          throw docError;
        }

        // Analyze with vision API
        const { obligations } = await analyzeImageWithVision(
          extraction.imageBase64, 
          file.name, 
          extraction.mimeType || 'image/jpeg'
        );

        if (obligations.length === 0) {
          toast({
            title: "No actionable items found in this image.",
            description: "I'll keep it on file.",
          });
        } else {
          setExtractedObligations(obligations);
          setCurrentDocumentId(docData.id);
          setCurrentDocumentName(file.name);
          setShowReviewModal(true);
        }
      } else {
        // For text-based files, use the existing text analysis
        await processDocument(
          extraction.text, 
          file.name, 
          file.type || 'application/octet-stream',
          extraction.sourceType,
          extraction.ocrFailed
        );
      }
    } catch (error) {
      console.error('Error processing file:', error);
      toast({
        title: "Something went wrong.",
        description: "Please try again in a moment.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
      // Clear the processed file
      setUploadedFiles(prev => prev.slice(1));
    }
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
    
    await processDocument(pastedText, docName, 'text/plain', 'paste');
    
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
          <TabsList className="grid w-full grid-cols-2 h-12 sm:h-10">
            <TabsTrigger value="upload" className="gap-2 text-sm min-h-[44px] sm:min-h-0">
              <Upload className="w-4 h-4" aria-hidden="true" />
              Upload file
            </TabsTrigger>
            <TabsTrigger value="paste" className="gap-2 text-sm min-h-[44px] sm:min-h-0">
              <ClipboardPaste className="w-4 h-4" aria-hidden="true" />
              Paste text
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="space-y-4 mt-4">
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={cn(
                'relative border-2 border-dashed rounded-xl p-6 sm:p-8 text-center transition-all duration-300 cursor-pointer',
                'focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2',
                isDragOver
                  ? 'border-primary bg-accent'
                  : 'border-border hover:border-primary/50 hover:bg-accent/50'
              )}
              role="button"
              tabIndex={0}
              aria-label="Upload area. Drop files here or click to browse"
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  document.getElementById('file-upload-input')?.click();
                }
              }}
            >
              <input
                id="file-upload-input"
                type="file"
                multiple
                accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.txt"
                onChange={handleFileSelect}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                aria-label="Choose files to upload"
              />
              
              <div className="flex flex-col items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center">
                  <Upload className="w-5 h-5 text-muted-foreground" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Drop files here or click to browse
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Supports PDF, JPG, PNG, and screenshots
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
                      className="p-2 hover:bg-accent rounded transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      disabled={isProcessing}
                      aria-label={`Remove ${file.name}`}
                    >
                      <X className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <Button
              onClick={handleProcessUploadedFiles}
              disabled={isProcessing}
              className="w-full min-h-[48px]"
              size="lg"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                  <span>Analysing your document…</span>
                </>
              ) : (
                'Process document'
              )}
            </Button>
          </TabsContent>

          <TabsContent value="paste" className="space-y-4 mt-4">
            <div className="space-y-3">
              <div>
                <label htmlFor="paste-doc-name" className="sr-only">Document name (optional)</label>
                <Input
                  id="paste-doc-name"
                  placeholder="Document name (optional)"
                  value={pastedDocName}
                  onChange={(e) => setPastedDocName(e.target.value)}
                  className="w-full min-h-[44px]"
                />
              </div>
              <div>
                <label htmlFor="paste-doc-text" className="sr-only">Paste your document text here</label>
                <Textarea
                  id="paste-doc-text"
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
              </div>
              <p className="text-xs text-muted-foreground">
                Tip: Open your PDF, select all text (Ctrl+A / Cmd+A), copy (Ctrl+C / Cmd+C), and paste above.
              </p>
            </div>

            <Button
              onClick={handleProcessPastedText}
              disabled={isProcessing}
              className="w-full min-h-[48px]"
              size="lg"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                  <span>Analysing your document…</span>
                </>
              ) : (
                'Process text'
              )}
            </Button>
          </TabsContent>
        </Tabs>

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
