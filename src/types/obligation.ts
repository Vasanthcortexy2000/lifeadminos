export type RiskLevel = 'low' | 'medium' | 'high';

export type ObligationStatus = 'not-started' | 'in-progress' | 'completed';

export type ObligationType = 'mandatory' | 'optional';

export type ObligationFrequency = 'one-time' | 'ongoing';

export interface ExtractedObligation {
  title: string;
  summary: string;
  due_date: string | null;
  risk_level: RiskLevel;
  consequence: string;
  steps: string[];
  confidence: number;
}

export interface Obligation {
  id: string;
  title: string;
  description: string;
  sourceDocument: string;
  deadline: Date | null;
  riskLevel: RiskLevel;
  status: ObligationStatus;
  type: ObligationType;
  frequency: ObligationFrequency;
  consequence?: string;
  leadTime?: string;
  steps?: string[];
  createdAt: Date;
  updatedAt: Date;
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
