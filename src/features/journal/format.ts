const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "Thu 19 Nov", with the year only when it is not this year. */
export function entryDate(iso: string, now = new Date()): string {
  const d = new Date(iso);
  const base = `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
  return d.getFullYear() === now.getFullYear() ? base : `${base} ${d.getFullYear()}`;
}

export const KIND_LABEL = { reflection: 'Reflection', note: 'Note', quote: 'Quote' } as const;
