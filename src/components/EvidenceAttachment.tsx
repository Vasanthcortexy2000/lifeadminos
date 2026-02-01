import { useState, useCallback } from 'react';
import { Upload, Paperclip, X, FileCheck2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface Evidence {
  id: string;
  file_name: string;
  file_url: string;
  file_type: string | null;
  uploaded_at: string;
}

interface EvidenceAttachmentProps {
  obligationId: string;
  evidence: Evidence[];
  onEvidenceChange: () => void;
  className?: string;
}

export function EvidenceAttachment({ 
  obligationId, 
  evidence, 
  onEvidenceChange,
  className 
}: EvidenceAttachmentProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const { user } = useAuth();

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !user) return;
    
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);

    try {
      // Upload to storage
      const filePath = `${user.id}/${obligationId}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('evidence')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('evidence')
        .getPublicUrl(filePath);

      // Save to evidence table
      const { error: dbError } = await supabase
        .from('obligation_evidence')
        .insert({
          user_id: user.id,
          obligation_id: obligationId,
          file_name: file.name,
          file_url: urlData.publicUrl,
          file_type: file.type,
        });

      if (dbError) throw dbError;

      toast({
        title: 'Evidence attached',
        description: 'Your proof has been saved.',
      });

      onEvidenceChange();
    } catch (error) {
      console.error('Error uploading evidence:', error);
      toast({
        title: 'Upload failed',
        description: 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  }, [user, obligationId, onEvidenceChange]);

  const handleDelete = async (evidenceId: string, fileUrl: string) => {
    if (!user) return;

    try {
      // Extract file path from URL
      const urlParts = fileUrl.split('/evidence/');
      if (urlParts.length > 1) {
        const filePath = urlParts[1];
        await supabase.storage.from('evidence').remove([filePath]);
      }

      // Delete from database
      await supabase
        .from('obligation_evidence')
        .delete()
        .eq('id', evidenceId)
        .eq('user_id', user.id);

      toast({
        title: 'Evidence removed',
      });

      onEvidenceChange();
    } catch (error) {
      console.error('Error deleting evidence:', error);
      toast({
        title: 'Could not remove',
        description: 'Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className={cn('', className)}>
      {evidence.length > 0 ? (
        <button
          onClick={() => setShowDialog(true)}
          className="flex items-center gap-1.5 text-xs text-primary hover:underline"
        >
          <FileCheck2 className="w-3.5 h-3.5" />
          {evidence.length} proof attached
        </button>
      ) : (
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer transition-colors">
          <Paperclip className="w-3.5 h-3.5" />
          Attach proof
          <input
            type="file"
            className="hidden"
            onChange={handleFileSelect}
            disabled={isUploading}
            accept="image/*,.pdf,.doc,.docx"
          />
        </label>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Attached proof</DialogTitle>
            <DialogDescription>
              Evidence you've uploaded for this obligation
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-4">
            {evidence.map((item) => (
              <div 
                key={item.id}
                className="flex items-center gap-3 p-3 bg-secondary rounded-lg"
              >
                <FileCheck2 className="w-4 h-4 text-primary flex-shrink-0" />
                <a 
                  href={item.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 text-sm text-foreground hover:underline truncate"
                >
                  {item.file_name}
                </a>
                <button
                  onClick={() => handleDelete(item.id, item.file_url)}
                  className="p-1 hover:bg-accent rounded"
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
            ))}
          </div>

          <div className="border-t pt-4">
            <label className="w-full">
              <Button 
                variant="outline" 
                className="w-full gap-2"
                disabled={isUploading}
                asChild
              >
                <span>
                  {isUploading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4" />
                  )}
                  Add more proof
                  <input
                    type="file"
                    className="hidden"
                    onChange={handleFileSelect}
                    disabled={isUploading}
                    accept="image/*,.pdf,.doc,.docx"
                  />
                </span>
              </Button>
            </label>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
