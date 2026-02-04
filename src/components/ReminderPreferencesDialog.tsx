import { useState, useEffect } from 'react';
import { Settings, Bell, Mail, Clock, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

interface ReminderPreferences {
  reminder_enabled: boolean;
  email_reminder_enabled: boolean;
  reminder_timing_high: number;
  reminder_timing_medium: number;
  reminder_timing_low: number;
}

export function ReminderPreferencesDialog() {
  const [preferences, setPreferences] = useState<ReminderPreferences>({
    reminder_enabled: true,
    email_reminder_enabled: false,
    reminder_timing_high: 7,
    reminder_timing_medium: 3,
    reminder_timing_low: 1,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const fetchPreferences = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('reminder_enabled, email_reminder_enabled, reminder_timing_high, reminder_timing_medium, reminder_timing_low')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!error && data) {
        setPreferences({
          reminder_enabled: data.reminder_enabled ?? true,
          email_reminder_enabled: data.email_reminder_enabled ?? false,
          reminder_timing_high: data.reminder_timing_high ?? 7,
          reminder_timing_medium: data.reminder_timing_medium ?? 3,
          reminder_timing_low: data.reminder_timing_low ?? 1,
        });
      }
    };

    fetchPreferences();
  }, [user]);

  const updatePreference = <K extends keyof ReminderPreferences>(
    key: K, 
    value: ReminderPreferences[K]
  ) => {
    setPreferences(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const savePreferences = async () => {
    if (!user) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          reminder_enabled: preferences.reminder_enabled,
          email_reminder_enabled: preferences.email_reminder_enabled,
          reminder_timing_high: preferences.reminder_timing_high,
          reminder_timing_medium: preferences.reminder_timing_medium,
          reminder_timing_low: preferences.reminder_timing_low,
        })
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: 'Preferences saved',
        description: 'Your reminder settings have been updated.',
      });
      setHasChanges(false);
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast({
        title: 'Could not save',
        description: 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Settings className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Reminder Preferences
          </DialogTitle>
          <DialogDescription>
            Customise how and when you receive reminders
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Global toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="reminders-enabled">In-app reminders</Label>
              <p className="text-xs text-muted-foreground">
                Show reminders in the dashboard
              </p>
            </div>
            <Switch
              id="reminders-enabled"
              checked={preferences.reminder_enabled}
              onCheckedChange={(checked) => updatePreference('reminder_enabled', checked)}
            />
          </div>

          <Separator />

          {/* Email toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="email-enabled" className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Email reminders
              </Label>
              <p className="text-xs text-muted-foreground">
                Only for high-priority items, max once per day
              </p>
            </div>
            <Switch
              id="email-enabled"
              checked={preferences.email_reminder_enabled}
              onCheckedChange={(checked) => updatePreference('email_reminder_enabled', checked)}
            />
          </div>

          <Separator />

          {/* Timing preferences */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <Label>Reminder timing (days before due)</Label>
            </div>

            <div className="space-y-4 pl-6">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-priority-high">High priority</span>
                  <span className="text-muted-foreground">{preferences.reminder_timing_high} days</span>
                </div>
                <Slider
                  value={[preferences.reminder_timing_high]}
                  onValueChange={([v]) => updatePreference('reminder_timing_high', v)}
                  min={1}
                  max={14}
                  step={1}
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-priority-medium">Medium priority</span>
                  <span className="text-muted-foreground">{preferences.reminder_timing_medium} days</span>
                </div>
                <Slider
                  value={[preferences.reminder_timing_medium]}
                  onValueChange={([v]) => updatePreference('reminder_timing_medium', v)}
                  min={1}
                  max={7}
                  step={1}
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-priority-low">Low priority</span>
                  <span className="text-muted-foreground">{preferences.reminder_timing_low} days</span>
                </div>
                <Slider
                  value={[preferences.reminder_timing_low]}
                  onValueChange={([v]) => updatePreference('reminder_timing_low', v)}
                  min={1}
                  max={3}
                  step={1}
                />
              </div>
            </div>
          </div>
        </div>

        {hasChanges && (
          <Button onClick={savePreferences} disabled={isSaving} className="w-full gap-2">
            <Save className="w-4 h-4" />
            Save preferences
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}
