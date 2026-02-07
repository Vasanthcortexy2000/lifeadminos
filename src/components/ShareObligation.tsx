import { useState } from 'react';
import { Link2, Copy, Check, X, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface Share {
  id: string;
  share_token: string;
  created_at: string;
  expires_at: string | null;
  revoked: boolean;
}

interface ShareObligationProps {
  obligationId: string;
  obligationTitle: string;
  existingShares: Share[];
  onShareChange: () => void;
  className?: string;
}

export function ShareObligation({ 
  obligationId, 
  obligationTitle,
  existingShares,
  onShareChange,
  className 
}: ShareObligationProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const { user } = useAuth();

  const activeShares = existingShares.filter(s => !s.revoked);

  // Generate cryptographically secure token with sufficient entropy (32+ characters)
  const generateToken = () => {
    // Combine multiple UUIDs and use full length for high entropy
    const uuid1 = crypto.randomUUID().replace(/-/g, '');
    const uuid2 = crypto.randomUUID().replace(/-/g, '');
    return (uuid1 + uuid2).substring(0, 32);
  };

  const createShare = async () => {
    if (!user) return;

    setIsCreating(true);
    try {
      const token = generateToken();
      
      const { error } = await supabase
        .from('obligation_shares')
        .insert({
          user_id: user.id,
          obligation_id: obligationId,
          share_token: token,
        });

      if (error) throw error;

      toast({
        title: 'Share link created',
        description: 'Anyone with this link can view this obligation.',
      });

      onShareChange();
    } catch (error) {
      console.error('Error creating share:', error);
      toast({
        title: 'Could not create link',
        description: 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
    }
  };

  const revokeShare = async (shareId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('obligation_shares')
        .update({ revoked: true })
        .eq('id', shareId)
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: 'Access revoked',
        description: 'This link no longer works.',
      });

      onShareChange();
    } catch (error) {
      console.error('Error revoking share:', error);
      toast({
        title: 'Could not revoke access',
        variant: 'destructive',
      });
    }
  };

  const copyLink = async (token: string, shareId: string) => {
    const url = `${window.location.origin}/shared/${token}`;
    await navigator.clipboard.writeText(url);
    setCopiedId(shareId);
    setTimeout(() => setCopiedId(null), 2000);
    toast({
      title: 'Link copied',
    });
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button className={cn(
          'flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors',
          className
        )}>
          <Share2 className="w-3.5 h-3.5" />
          Share
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Share with someone you trust</DialogTitle>
          <DialogDescription>
            Create a read-only link to share "{obligationTitle}" with a trusted person.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {activeShares.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">Active links</p>
              {activeShares.map((share) => (
                <div 
                  key={share.id}
                  className="flex items-center gap-2 p-3 bg-secondary rounded-lg"
                >
                  <Link2 className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <Input
                    readOnly
                    value={`${window.location.origin}/shared/${share.share_token}`}
                    className="flex-1 text-xs bg-transparent border-none h-auto py-0"
                  />
                  <button
                    onClick={() => copyLink(share.share_token, share.id)}
                    className="p-1.5 hover:bg-accent rounded transition-colors"
                  >
                    {copiedId === share.id ? (
                      <Check className="w-4 h-4 text-primary" />
                    ) : (
                      <Copy className="w-4 h-4 text-muted-foreground" />
                    )}
                  </button>
                  <button
                    onClick={() => revokeShare(share.id)}
                    className="p-1.5 hover:bg-accent rounded transition-colors"
                  >
                    <X className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <Button
            onClick={createShare}
            disabled={isCreating}
            variant="outline"
            className="w-full gap-2"
          >
            <Link2 className="w-4 h-4" />
            {activeShares.length > 0 ? 'Create another link' : 'Create share link'}
          </Button>

          <p className="text-xs text-muted-foreground">
            Shared links are view-only. You can revoke access at any time.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
