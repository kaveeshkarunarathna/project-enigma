/// <reference types="jest" />
import {
  guessFirstPage,
  guessPageNumber,
  joinScannedLines,
  selectedText,
  splitSentences,
  tapSentence,
} from '@/domain/scan';

const page = [
  'CHAPTER TWO',
  'The lamp was low when she opened the let-',
  'ter. Mr. Hale had written it in pencil.',
  'Was it a warning? She could not tell.',
  '"Come at once," it said.',
  '- 42 -',
];

describe('page scanner text', () => {
  it('finds the printed page number at the top or bottom', () => {
    expect(guessPageNumber(page)).toBe(42);
    expect(guessPageNumber(['17', 'Some text here.'])).toBe(17);
    expect(guessPageNumber(['No number here.', 'Still none.'])).toBeNull();
  });

  it('joins lines, mends hyphenation and drops page numbers', () => {
    const text = joinScannedLines(page);
    expect(text).toContain('opened the letter. Mr. Hale');
    expect(text).not.toContain('42');
  });

  it('splits sentences but not after abbreviations or initials', () => {
    const s = splitSentences(joinScannedLines(page));
    expect(s).toEqual([
      'CHAPTER TWO',
      'The lamp was low when she opened the letter.',
      'Mr. Hale had written it in pencil.',
      'Was it a warning?',
      'She could not tell.',
      '"Come at once," it said.',
    ]);
    expect(splitSentences('A book by C. S. Lewis. It is short.')).toEqual([
      'A book by C. S. Lewis.',
      'It is short.',
    ]);
  });

  it('selects a run of sentences with taps', () => {
    let sel = tapSentence(null, 2);
    expect(sel).toEqual({ start: 2, end: 2 });
    sel = tapSentence(sel, 4);
    expect(sel).toEqual({ start: 2, end: 4 });
    sel = tapSentence(sel, 0);
    expect(sel).toEqual({ start: 0, end: 4 });
    sel = tapSentence(sel, 4);
    expect(sel).toEqual({ start: 0, end: 3 });
    sel = tapSentence(sel, 0);
    expect(sel).toEqual({ start: 1, end: 3 });
    sel = tapSentence(sel, 2);
    expect(sel).toEqual({ start: 2, end: 2 });
    expect(tapSentence(sel, 2)).toBeNull();
    expect(selectedText(['A.', 'B.', 'C.'], { start: 1, end: 2 })).toBe('B. C.');
    expect(selectedText(['A.'], null)).toBe('');
  });
});

describe('scanning one page or two', () => {
  it('takes the first page number, or one before the second', () => {
    expect(guessFirstPage([['Some text', '214']])).toBe(214);
    expect(guessFirstPage([['Some text without a number'], ['More text', '215']])).toBe(214);
    expect(guessFirstPage([['no number'], ['none here either']])).toBeNull();
    expect(guessFirstPage([])).toBeNull();
  });

  it('joins a sentence that runs over the page break', () => {
    const lines = [...['the end of a long sen-', '88'], ...['89', 'tence that goes on.']];
    expect(joinScannedLines(lines)).toBe('the end of a long sentence that goes on.');
  });
});
