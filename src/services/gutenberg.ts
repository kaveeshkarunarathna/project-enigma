import type { Classic } from '@/content/classics';
import { parseGutenberg, titleMatches, type ParsedBook } from '@/domain/gutenberg';

/**
 * Downloads one public-domain book from Project Gutenberg, as the reader asks
 * for it. One plain-text file per book, fetched once and then kept on the
 * phone, so it is light on their servers. Nothing is sent but the request.
 */
const USER_AGENT = 'NightAtlas/0.1 (reading companion app)';

export function gutenbergTextUrl(id: number): string {
  return `https://www.gutenberg.org/cache/epub/${id}/pg${id}.txt`;
}

export type DownloadErrorKind = 'offline' | 'server' | 'timeout' | 'mismatch' | 'empty';

export class DownloadError extends Error {
  constructor(
    message: string,
    public kind: DownloadErrorKind,
  ) {
    super(message);
  }
}

export async function downloadClassic(
  classic: Classic,
  opts: { timeoutMs?: number } = {},
): Promise<ParsedBook> {
  const timeout = new AbortController();
  const timer = setTimeout(() => timeout.abort(), opts.timeoutMs ?? 45_000);
  let raw: string;
  try {
    const res = await fetch(gutenbergTextUrl(classic.gutenbergId), {
      headers: { 'User-Agent': USER_AGENT, Accept: 'text/plain' },
      signal: timeout.signal,
    });
    if (!res.ok) throw new DownloadError('The library is resting. Try again in a little while.', 'server');
    raw = await res.text();
  } catch (e) {
    if (e instanceof DownloadError) throw e;
    if (timeout.signal.aborted)
      throw new DownloadError('The download took too long. Try again on Wi-Fi.', 'timeout');
    throw new DownloadError('No connection. Classics need the internet once, to download.', 'offline');
  } finally {
    clearTimeout(timer);
  }

  const book = parseGutenberg(raw);
  if (!titleMatches(book.title, classic.expect)) {
    throw new DownloadError('That file was not the book we expected, so it was not saved.', 'mismatch');
  }
  if (!book.chapters.length) throw new DownloadError('The book came through empty.', 'empty');
  return book;
}
