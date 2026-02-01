import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { RiskLevel } from '@/types/obligation';

interface ReminderSchedule {
  daysBefore: number;
  type: 'pre_due' | 'day_of' | 'overdue';
}

// Risk-based reminder schedules
const REMINDER_SCHEDULES: Record<RiskLevel, ReminderSchedule[]> = {
  high: [
    { daysBefore: 7, type: 'pre_due' },
    { daysBefore: 3, type: 'pre_due' },
    { daysBefore: 1, type: 'pre_due' },
    { daysBefore: 0, type: 'day_of' },
  ],
  medium: [
    { daysBefore: 3, type: 'pre_due' },
    { daysBefore: 1, type: 'pre_due' },
    { daysBefore: 0, type: 'day_of' },
  ],
  low: [
    { daysBefore: 1, type: 'pre_due' },
    { daysBefore: 0, type: 'day_of' },
  ],
};

export function useReminders() {
  const { user } = useAuth();

  const createRemindersForObligation = async (
    obligationId: string,
    deadline: Date,
    riskLevel: RiskLevel
  ): Promise<void> => {
    if (!user) return;

    const schedule = REMINDER_SCHEDULES[riskLevel];
    const now = new Date();
    const reminders: Array<{
      user_id: string;
      obligation_id: string;
      reminder_time: string;
      type: string;
      channel: string;
    }> = [];

    for (const item of schedule) {
      const reminderDate = new Date(deadline);
      reminderDate.setDate(reminderDate.getDate() - item.daysBefore);
      
      // Set reminder time to 9 AM local time for a calm start
      reminderDate.setHours(9, 0, 0, 0);

      // Only create reminders for future times
      if (reminderDate > now) {
        reminders.push({
          user_id: user.id,
          obligation_id: obligationId,
          reminder_time: reminderDate.toISOString(),
          type: item.type,
          channel: 'in_app',
        });
      }
    }

    if (reminders.length > 0) {
      const { error } = await supabase
        .from('reminders')
        .insert(reminders);

      if (error) {
        console.error('Error creating reminders:', error);
        throw error;
      }
    }
  };

  const deleteRemindersForObligation = async (obligationId: string): Promise<void> => {
    if (!user) return;

    const { error } = await supabase
      .from('reminders')
      .delete()
      .eq('obligation_id', obligationId)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error deleting reminders:', error);
      throw error;
    }
  };

  const updateRemindersForObligation = async (
    obligationId: string,
    deadline: Date | null,
    riskLevel: RiskLevel
  ): Promise<void> => {
    if (!user) return;

    // Delete existing unsent reminders
    await supabase
      .from('reminders')
      .delete()
      .eq('obligation_id', obligationId)
      .eq('user_id', user.id)
      .eq('sent', false);

    // Create new reminders if there's a deadline
    if (deadline) {
      await createRemindersForObligation(obligationId, deadline, riskLevel);
    }
  };

  return {
    createRemindersForObligation,
    deleteRemindersForObligation,
    updateRemindersForObligation,
  };
}
