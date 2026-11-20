import type { Book } from '@/data/books';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function monthYear(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/** The one-line italic caption under a book on the shelf. */
export function bookCaption(book: Book): string | null {
  switch (book.status) {
    case 'reading':
      if (book.chapterCount)
        return `Chapter ${Math.min(book.chaptersDone + 1, book.chapterCount)} of ${book.chapterCount}`;
      if (book.pageCount && book.currentPage) return `Page ${book.currentPage} of ${book.pageCount}`;
      if (book.currentPage) return `Page ${book.currentPage}`;
      return 'Just begun';
    case 'finished': {
      const when = monthYear(book.finishedAt);
      return when ? `Finished ${when}` : 'Finished';
    }
    case 'paused':
      return book.currentPage ? `Resting at page ${book.currentPage}` : 'Resting for now';
    default:
      return book.firstPublished ? `First published ${formatYear(book.firstPublished)}` : null;
  }
}

/** Years before 1000 read better with an era, such as 180 CE. */
export function formatYear(year: number): string {
  return year < 1000 ? `${year} CE` : String(year);
}

export const STATUS_LABEL: Record<Book['status'], string> = {
  reading: 'Reading now',
  want: 'Want to read',
  paused: 'Resting',
  finished: 'Finished',
};
