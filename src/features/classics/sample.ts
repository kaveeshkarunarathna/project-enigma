/**
 * A made-up book in the shape of a Project Gutenberg plain-text file. Dev
 * builds use it to try the reader where downloads cannot run (the web
 * preview, a phone without internet). It is written for the app and is not
 * from any real book.
 */
const SENTENCES = [
  'The keeper climbed the hill each evening with a small lamp and a heavy book.',
  'He never read more than a few pages, and he never hurried.',
  'Below him the town put out its lights one window at a time.',
  'Some nights the wind turned the pages for him, and he let it.',
  'Orrin, who kept the shop at the foot of the hill, thought it a strange habit.',
  'But the next evening he climbed the hill as well, with a book of his own.',
  'They did not talk much. The lamp did not need them to.',
  'By the end of the month the path up the hill was worn smooth.',
];

function paragraph(seed: number): string {
  const lines: string[] = [];
  for (let i = 0; i < 5; i++) lines.push(SENTENCES[(seed + i * 3) % SENTENCES.length]);
  // Wrapped at about 70 characters, like the real files.
  return lines
    .join(' ')
    .replace(/(.{1,70})(\s|$)/g, '$1\n')
    .trim();
}

const CHAPTERS = ['The Hill', 'The Shop', 'The Second Lamp', 'The Worn Path'];

export function sampleGutenbergFile(title: string): string {
  const body = CHAPTERS.map(
    (name, c) =>
      `CHAPTER ${['I', 'II', 'III', 'IV'][c]}.\n\n${name}\n\n${Array.from({ length: 6 }, (_, p) => paragraph(c * 6 + p)).join('\n\n')}`,
  ).join('\n\n\n');
  return [
    `Title: ${title}`,
    '',
    'Author: Sample',
    '',
    '*** START OF THE PROJECT GUTENBERG EBOOK SAMPLE ***',
    '',
    body,
    '',
    '*** END OF THE PROJECT GUTENBERG EBOOK SAMPLE ***',
  ].join('\n');
}
