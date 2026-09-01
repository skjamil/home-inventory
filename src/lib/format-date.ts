import { format } from 'date-fns';

// e.g. "July 7th 2026" — used everywhere a date is shown to the user.
export function formatDate(value: string | Date): string {
  return format(new Date(value), 'MMMM do yyyy');
}
