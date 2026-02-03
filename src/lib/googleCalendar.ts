import type { Obligation } from '@/types/obligation';

/**
 * Builds a Google Calendar "Add event" URL that pre-fills title, date, and description.
 * Returns null if the obligation has no deadline (so the caller can hide the button).
 */
export function buildGoogleCalendarEventUrl(obligation: Obligation): string | null {
  if (!obligation.deadline) return null;

  const d = new Date(obligation.deadline);
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  const start = `${year}${month}${day}T000000Z`;
  const end = `${year}${month}${day}T235959Z`;

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: obligation.title,
    dates: `${start}/${end}`,
    details: obligation.description || '',
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
