/**
 * Due-date intelligence utilities
 * Determines the urgency status of obligations based on their deadline
 */

export type DueDateStatus = 'overdue' | 'due-soon' | 'upcoming' | 'no-date';

export function getDueDateStatus(deadline: Date | null): DueDateStatus {
  if (!deadline) return 'no-date';
  
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dueDate = new Date(deadline);
  const dueDateOnly = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
  
  const diffMs = dueDateOnly.getTime() - today.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  
  if (diffDays < 0) return 'overdue';
  if (diffDays <= 7) return 'due-soon';
  return 'upcoming';
}

export function getDaysUntilDue(deadline: Date | null): number | null {
  if (!deadline) return null;
  
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dueDate = new Date(deadline);
  const dueDateOnly = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
  
  return Math.ceil((dueDateOnly.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export function formatDueStatus(deadline: Date | null): string {
  const days = getDaysUntilDue(deadline);
  
  if (days === null) return 'No due date';
  if (days < 0) return `${Math.abs(days)} day${Math.abs(days) !== 1 ? 's' : ''} overdue`;
  if (days === 0) return 'Due today';
  if (days === 1) return 'Due tomorrow';
  if (days <= 7) return `Due in ${days} days`;
  return `Due in ${days} days`;
}
