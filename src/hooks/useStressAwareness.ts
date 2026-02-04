import { useMemo } from 'react';
import { Obligation } from '@/types/obligation';
import { getDueDateStatus, getDaysUntilDue } from '@/lib/dateUtils';

export interface StressState {
  isStressed: boolean;
  stressLevel: 'calm' | 'moderate' | 'elevated';
  highPriorityCount: number;
  urgentDeadlines: number;
  overlappingDays: number;
  reassurance: string;
}

const REASSURANCE_MESSAGES = {
  calm: [
    "You're on track. One step at a time.",
    "Everything's manageable. You've got this.",
    "No rush. Take things at your own pace.",
  ],
  moderate: [
    "You have a few things coming up. Let's focus on what matters most.",
    "It's a busy period, but you're handling it well.",
    "A few priorities need attention. We'll tackle them together.",
  ],
  elevated: [
    "I know things feel overwhelming right now. Let's take this step by step.",
    "You're not late. There's still time. Let's focus on just one thing.",
    "Take a breath. We'll work through this together, one task at a time.",
    "You're doing better than you think. Let's simplify what's on your plate.",
  ],
};

export function useStressAwareness(obligations: Obligation[]): StressState {
  return useMemo(() => {
    const activeObligations = obligations.filter(ob => ob.status !== 'completed');
    
    // Count high priority items
    const highPriorityCount = activeObligations.filter(ob => ob.riskLevel === 'high').length;
    
    // Count items due within 72 hours (3 days)
    const urgentDeadlines = activeObligations.filter(ob => {
      const days = getDaysUntilDue(ob.deadline);
      return days !== null && days >= 0 && days <= 3;
    }).length;
    
    // Count overlapping days (multiple obligations on same day)
    const dateMap = new Map<string, number>();
    activeObligations.forEach(ob => {
      if (ob.deadline) {
        const dateKey = ob.deadline.toISOString().split('T')[0];
        dateMap.set(dateKey, (dateMap.get(dateKey) || 0) + 1);
      }
    });
    const overlappingDays = Array.from(dateMap.values()).filter(count => count > 1).length;
    
    // Determine stress level
    let stressLevel: 'calm' | 'moderate' | 'elevated' = 'calm';
    let isStressed = false;
    
    // Elevated stress conditions
    if (highPriorityCount >= 3 || urgentDeadlines >= 2 || overlappingDays >= 2) {
      stressLevel = 'elevated';
      isStressed = true;
    } 
    // Moderate stress conditions
    else if (highPriorityCount >= 2 || urgentDeadlines >= 1 || overlappingDays >= 1) {
      stressLevel = 'moderate';
      isStressed = true;
    }
    
    // Pick a random reassurance message based on stress level
    const messages = REASSURANCE_MESSAGES[stressLevel];
    const reassurance = messages[Math.floor(Math.random() * messages.length)];
    
    return {
      isStressed,
      stressLevel,
      highPriorityCount,
      urgentDeadlines,
      overlappingDays,
      reassurance,
    };
  }, [obligations]);
}

// Helper for components to get calmer language
export function getCalmLanguage(isStressed: boolean, originalText: string): string {
  if (!isStressed) return originalText;
  
  // Map urgent language to calmer alternatives
  const calmMappings: Record<string, string> = {
    'Urgent': 'Needs attention soon',
    'URGENT': 'Needs attention soon',
    'Overdue': 'Past due date',
    'OVERDUE': 'Past due date',
    'Immediately': 'When you can',
    'Right now': 'Soon',
    'You missed': 'This is past the due date',
    'Failed to': 'Not yet completed',
    'Warning': 'Note',
    'Alert': 'Reminder',
    'Critical': 'Important',
  };
  
  let result = originalText;
  for (const [urgent, calm] of Object.entries(calmMappings)) {
    result = result.replace(new RegExp(urgent, 'gi'), calm);
  }
  
  return result;
}
