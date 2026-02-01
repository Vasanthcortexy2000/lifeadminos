import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { NudgeMessage } from '@/types/obligation';
import { useToast } from '@/hooks/use-toast';

interface DbNudge {
  id: string;
  user_id: string;
  obligation_id: string;
  message: string;
  tone: string;
  read: boolean;
  created_at: string;
}

function mapDbToNudge(db: DbNudge): NudgeMessage {
  return {
    id: db.id,
    obligationId: db.obligation_id,
    message: db.message,
    tone: db.tone as 'gentle' | 'firm' | 'urgent',
    createdAt: new Date(db.created_at),
    read: db.read,
  };
}

export function useNudges() {
  const [nudges, setNudges] = useState<NudgeMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchNudges = useCallback(async () => {
    if (!user) {
      setNudges([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('nudges')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setNudges((data || []).map(mapDbToNudge));
    } catch (error) {
      console.error('Error fetching nudges:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchNudges();
  }, [fetchNudges]);

  const dismissNudge = async (id: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('nudges')
        .update({ read: true })
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      setNudges(prev =>
        prev.map(n => (n.id === id ? { ...n, read: true } : n))
      );
    } catch (error) {
      console.error('Error dismissing nudge:', error);
      toast({
        title: 'Error',
        description: 'Failed to dismiss nudge.',
        variant: 'destructive',
      });
    }
  };

  return {
    nudges,
    loading,
    dismissNudge,
    refetch: fetchNudges,
  };
}
