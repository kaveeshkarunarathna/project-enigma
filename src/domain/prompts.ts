import { PROMPTS, type Prompt, type PromptGenre } from '@/content/prompts';
import { hash } from './sky';

/**
 * Tonight's prompt: the same all night (so it does not change while you
 * read), different each night. `offset` steps through others when the reader
 * asks for another question. With a genre, prompts for that genre come first,
 * mixed with prompts that suit any book.
 */
export function promptFor(night: string, genre: PromptGenre | null = null, offset = 0): Prompt {
  const pool =
    genre && genre !== 'any' ? PROMPTS.filter((p) => p.genre === genre || p.genre === 'any') : PROMPTS;
  const start = Math.floor(hash(`prompt:${night}`) * pool.length);
  return pool[(start + offset) % pool.length];
}
