import { getPrompt, PROMPT_AUTHOR } from '@/content/prompts';
import type { JournalEntry } from '@/data/journal';

/**
 * The whole journal as plain text, oldest first, for the reader to keep
 * wherever they like (Notes, Files, email to themselves). Built on the phone
 * and handed to the system share sheet; the app never sends it anywhere.
 */
export function journalAsText(entries: JournalEntry[], exportedOn = new Date()): string {
  const lines = [`Stellibria journal, exported ${exportedOn.toDateString()}`, ''];
  const sorted = [...entries].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  for (const e of sorted) {
    lines.push(`## ${e.createdAt.slice(0, 10)}${e.bookTitle ? `, ${e.bookTitle}` : ''}`);
    if (e.kind === 'reflection') {
      const prompt = getPrompt(e.promptId ?? undefined);
      if (prompt) lines.push(`Question (${PROMPT_AUTHOR}): ${prompt.text}`);
    }
    if (e.kind === 'quote' && e.quoteText) {
      lines.push(`"${e.quoteText}"${e.quotePage ? ` (page ${e.quotePage})` : ''}`);
    }
    if (e.body.trim()) lines.push(e.body.trim());
    lines.push('');
  }
  return lines.join('\n');
}
