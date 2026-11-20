/**
 * ISBN rules for the barcode scanner. The barcode on a book's back cover is an
 * EAN-13 that starts with 978 or 979, which is the book's ISBN-13. Older books
 * print an ISBN-10 instead, which converts.
 */

function isbn13CheckDigit(first12: string): number {
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += Number(first12[i]) * (i % 2 ? 3 : 1);
  return (10 - (sum % 10)) % 10;
}

function isValidIsbn10(s: string): boolean {
  if (!/^\d{9}[\dX]$/.test(s)) return false;
  let sum = 0;
  for (let i = 0; i < 10; i++) sum += (s[i] === 'X' ? 10 : Number(s[i])) * (10 - i);
  return sum % 11 === 0;
}

/**
 * The ISBN-13 for anything a reader might scan or type: an EAN-13 barcode,
 * an ISBN-13 or ISBN-10 with or without hyphens and spaces. Null when it is
 * not a valid book number (a price barcode, a typo).
 */
export function toIsbn13(input: string): string | null {
  const s = input.toUpperCase().replace(/[\s-]/g, '');
  if (/^97[89]\d{10}$/.test(s)) {
    return isbn13CheckDigit(s.slice(0, 12)) === Number(s[12]) ? s : null;
  }
  if (isValidIsbn10(s)) {
    const body = `978${s.slice(0, 9)}`;
    return body + isbn13CheckDigit(body);
  }
  return null;
}

/** "9780141439518" as "978-0-14-143951-8" is not knowable without ranges, so group plainly. */
export function formatIsbn(isbn13: string): string {
  return `${isbn13.slice(0, 3)} ${isbn13.slice(3, 12)} ${isbn13.slice(12)}`;
}

/**
 * Page count from an edition's printed pagination, such as "xii, 320 p." or
 * "320 pages". The largest arabic number wins; roman front matter is ignored.
 */
export function pagesFromPagination(pagination: string | null | undefined): number | null {
  if (!pagination) return null;
  const nums = (pagination.match(/\d+/g) ?? []).map(Number).filter((n) => n > 0 && n < 10000);
  return nums.length ? Math.max(...nums) : null;
}
