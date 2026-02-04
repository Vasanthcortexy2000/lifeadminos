export type PriorityLevel = 'low' | 'medium' | 'high';
// Alias for backwards compatibility during migration
export type RiskLevel = PriorityLevel;

export type ObligationStatus = 'not-started' | 'in-progress' | 'completed';

export type ObligationType = 'mandatory' | 'optional';

export type ObligationFrequency = 'one-time' | 'ongoing';

export type LifeDomain = 'visa' | 'work' | 'health' | 'finance' | 'study' | 'housing' | 'legal' | 'general';

export interface ExtractedObligation {
  title: string;
  summary: string;
  due_date: string | null;
  risk_level: PriorityLevel;
  consequence: string;
  steps: string[];
  confidence: number;
  domain?: LifeDomain;
  subject?: string; // For grouping by subject/topic
  topic?: string;
}

export interface Obligation {
  id: string;
  title: string;
  description: string;
  sourceDocument: string;
  documentId?: string;
  deadline: Date | null;
  riskLevel: PriorityLevel;
  status: ObligationStatus;
  type: ObligationType;
  frequency: ObligationFrequency;
  consequence?: string;
  leadTime?: string;
  steps?: string[];
  confidence?: number;
  domain?: LifeDomain;
  subject?: string; // For grouping (e.g., "COMP9417")
  topic?: string; // For sub-grouping (e.g., "Assignment 2")
  createdAt: Date;
  updatedAt: Date;
}

export interface ObligationUpdate {
  title?: string;
  description?: string;
  deadline?: Date | null;
  riskLevel?: PriorityLevel;
  steps?: string[];
  subject?: string;
  topic?: string;
}

export interface Document {
  id: string;
  name: string;
  type: string;
  uploadedAt: Date;
  processed: boolean;
  obligations: Obligation[];
}

export interface NudgeMessage {
  id: string;
  obligationId: string;
  message: string;
  tone: 'gentle' | 'firm' | 'urgent';
  createdAt: Date;
  read: boolean;
}
