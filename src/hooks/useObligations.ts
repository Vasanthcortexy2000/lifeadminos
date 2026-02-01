import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Obligation, ObligationStatus, RiskLevel, ObligationType, ObligationFrequency } from '@/types/obligation';
import { useToast } from '@/hooks/use-toast';
import type { Json } from '@/integrations/supabase/types';

interface DbObligation {
  id: string;
  user_id: string;
  document_id: string | null;
  title: string;
  description: string;
  source_document: string | null;
  deadline: string | null;
  risk_level: string;
  status: string;
  type: string;
  frequency: string;
  consequence: string | null;
  lead_time: string | null;
  steps: Json;
  created_at: string;
  updated_at: string;
}

function parseSteps(steps: Json): string[] | undefined {
  if (Array.isArray(steps)) {
    return steps.filter((s): s is string => typeof s === 'string');
  }
  return undefined;
}

function mapDbToObligation(db: DbObligation): Obligation {
  return {
    id: db.id,
    title: db.title,
    description: db.description,
    sourceDocument: db.source_document || 'Unknown',
    deadline: db.deadline ? new Date(db.deadline) : null,
    riskLevel: db.risk_level as RiskLevel,
    status: db.status as ObligationStatus,
    type: db.type as ObligationType,
    frequency: db.frequency as ObligationFrequency,
    consequence: db.consequence || undefined,
    leadTime: db.lead_time || undefined,
    steps: parseSteps(db.steps),
    createdAt: new Date(db.created_at),
    updatedAt: new Date(db.updated_at),
  };
}

export function useObligations() {
  const [obligations, setObligations] = useState<Obligation[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchObligations = useCallback(async () => {
    if (!user) {
      setObligations([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('obligations')
        .select('*')
        .eq('user_id', user.id)
        .order('deadline', { ascending: true });

      if (error) throw error;

      setObligations((data || []).map(mapDbToObligation));
    } catch (error) {
      console.error('Error fetching obligations:', error);
      toast({
        title: 'Error',
        description: 'Failed to load your obligations.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    fetchObligations();
  }, [fetchObligations]);

  const updateStatus = async (id: string, status: ObligationStatus): Promise<void> => {
    if (!user) return;

    const { error } = await supabase
      .from('obligations')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error updating obligation status:', error);
      toast({
        title: "Couldn't save — try again.",
        description: 'There was an error updating the status.',
        variant: 'destructive',
      });
      throw error;
    }

    setObligations(prev =>
      prev.map(ob =>
        ob.id === id ? { ...ob, status, updatedAt: new Date() } : ob
      )
    );
  };

  const addObligation = async (obligation: Omit<Obligation, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('obligations')
        .insert({
          user_id: user.id,
          title: obligation.title,
          description: obligation.description,
          source_document: obligation.sourceDocument,
          deadline: obligation.deadline.toISOString(),
          risk_level: obligation.riskLevel,
          status: obligation.status,
          type: obligation.type,
          frequency: obligation.frequency,
          consequence: obligation.consequence,
          lead_time: obligation.leadTime,
        })
        .select()
        .single();

      if (error) throw error;

      const newObligation = mapDbToObligation(data);
      setObligations(prev => [...prev, newObligation]);
      return newObligation;
    } catch (error) {
      console.error('Error adding obligation:', error);
      toast({
        title: 'Error',
        description: 'Failed to add obligation.',
        variant: 'destructive',
      });
      return null;
    }
  };

  return {
    obligations,
    loading,
    updateStatus,
    addObligation,
    refetch: fetchObligations,
  };
}
