/**
 * Reflection prompts, written in advance (no AI at runtime) and signed by the
 * app's author. They never quote or summarise any book, so they suit whatever
 * the reader has open.
 *
 * Kaveesh: these are a first draft in your voice. Edit freely. Keep ids
 * stable once shipped, because journal entries point at them.
 */
export const PROMPT_AUTHOR = 'Kaveesh';

export type PromptGenre = 'any' | 'philosophy' | 'classics' | 'fantasy' | 'scifi';

export type Prompt = { id: string; text: string; genre: PromptGenre };

export const PROMPTS: Prompt[] = [
  // For any book
  {
    id: 'any-01',
    genre: 'any',
    text: 'Which sentence tonight made you slow down? What do you think it was doing to you?',
  },
  {
    id: 'any-02',
    genre: 'any',
    text: 'If you could ask one character a single question, who would it be, and what would you ask?',
  },
  { id: 'any-03', genre: 'any', text: 'What did you expect to happen tonight that did not?' },
  {
    id: 'any-04',
    genre: 'any',
    text: 'Describe the room you imagined while reading. Where did those details come from?',
  },
  { id: 'any-05', genre: 'any', text: 'Who in your own life would understand this book best? Why them?' },
  {
    id: 'any-06',
    genre: 'any',
    text: 'What is one thing you now notice that you did not notice when you started this book?',
  },
  {
    id: 'any-07',
    genre: 'any',
    text: 'Which character do you disagree with most? Try to argue their side for a moment.',
  },
  {
    id: 'any-08',
    genre: 'any',
    text: 'How did you feel when you closed the book tonight, in one word? Where does that word come from?',
  },
  { id: 'any-09', genre: 'any', text: 'What would you have done differently in the scene you just read?' },
  {
    id: 'any-10',
    genre: 'any',
    text: 'Is there a question this book keeps asking without saying it out loud?',
  },
  { id: 'any-11', genre: 'any', text: 'What made you keep reading tonight, even for a few more pages?' },
  {
    id: 'any-12',
    genre: 'any',
    text: 'If this chapter were a place you could visit, would you go? Would you stay?',
  },
  {
    id: 'any-13',
    genre: 'any',
    text: 'Write down a word from tonight you would like to use more often, and why.',
  },
  { id: 'any-14', genre: 'any', text: 'What has this book taught you about patience, so far?' },
  {
    id: 'any-15',
    genre: 'any',
    text: 'Which small detail do you think the author placed on purpose? What might it be for?',
  },
  { id: 'any-16', genre: 'any', text: 'What would you tell yourself on page one, now that you are here?' },
  {
    id: 'any-17',
    genre: 'any',
    text: 'Did anything tonight remind you of a memory? Write a few lines about it.',
  },
  {
    id: 'any-18',
    genre: 'any',
    text: 'What is the bravest thing anyone did in tonight’s pages? Was it loud or quiet?',
  },
  { id: 'any-19', genre: 'any', text: 'Which part felt most true, even if the story is invented?' },
  {
    id: 'any-20',
    genre: 'any',
    text: 'If you stopped reading this book forever right now, what would you miss?',
  },

  // Philosophy
  {
    id: 'phi-01',
    genre: 'philosophy',
    text: 'Take one idea from tonight and test it on an ordinary day of yours. Does it hold?',
  },
  {
    id: 'phi-02',
    genre: 'philosophy',
    text: 'What would change in your week if you believed tonight’s idea completely?',
  },
  {
    id: 'phi-03',
    genre: 'philosophy',
    text: 'Where do you think the author is wrong, or at least too sure?',
  },
  {
    id: 'phi-04',
    genre: 'philosophy',
    text: 'Write tonight’s main idea in a sentence a twelve-year-old would understand.',
  },
  { id: 'phi-05', genre: 'philosophy', text: 'What is within your control tomorrow, and what is not?' },
  {
    id: 'phi-06',
    genre: 'philosophy',
    text: 'Which of your habits would this author praise? Which would they question?',
  },
  {
    id: 'phi-07',
    genre: 'philosophy',
    text: 'What does a good life look like, according to tonight’s pages? Do you agree?',
  },
  {
    id: 'phi-08',
    genre: 'philosophy',
    text: 'Name a feeling you had today. How would this thinker describe it?',
  },
  {
    id: 'phi-09',
    genre: 'philosophy',
    text: 'What question would you bring to this author if you met them for coffee?',
  },
  {
    id: 'phi-10',
    genre: 'philosophy',
    text: 'Is there something you have accepted without asking why? Ask it now.',
  },

  // Classics
  {
    id: 'cla-01',
    genre: 'classics',
    text: 'What in tonight’s pages feels old, and what feels like it could happen today?',
  },
  { id: 'cla-02', genre: 'classics', text: 'Why do you think people have kept this book alive for so long?' },
  {
    id: 'cla-03',
    genre: 'classics',
    text: 'Which character would fit best in your city today? What would they do first?',
  },
  {
    id: 'cla-04',
    genre: 'classics',
    text: 'What does this book seem to believe about love, or about money?',
  },
  {
    id: 'cla-05',
    genre: 'classics',
    text: 'Was there a slow passage tonight? What might it be preparing you for?',
  },
  { id: 'cla-06', genre: 'classics', text: 'Who has power in this story, and how do they hold on to it?' },
  {
    id: 'cla-07',
    genre: 'classics',
    text: 'If you rewrote tonight’s scene for a film, what would you keep and what would you cut?',
  },
  {
    id: 'cla-08',
    genre: 'classics',
    text: 'What surprised you about how people spoke to each other in this book?',
  },
  { id: 'cla-09', genre: 'classics', text: 'Which rule of its world would you most like to break?' },
  {
    id: 'cla-10',
    genre: 'classics',
    text: 'What do you think the author was afraid of when they wrote this?',
  },

  // Fantasy
  { id: 'fan-01', genre: 'fantasy', text: 'What does magic cost in this world? Is the price fair?' },
  {
    id: 'fan-02',
    genre: 'fantasy',
    text: 'Which place in this world would you visit first, and what would you bring?',
  },
  { id: 'fan-03', genre: 'fantasy', text: 'What real-world problem is hiding inside this invented one?' },
  {
    id: 'fan-04',
    genre: 'fantasy',
    text: 'Who is the most ordinary person in this story? Why might they matter most?',
  },
  {
    id: 'fan-05',
    genre: 'fantasy',
    text: 'If you had one small enchantment for your daily life, what would it be?',
  },
  { id: 'fan-06', genre: 'fantasy', text: 'What does home mean to the characters so far?' },
  { id: 'fan-07', genre: 'fantasy', text: 'Which monster or villain do you understand a little too well?' },
  { id: 'fan-08', genre: 'fantasy', text: 'What old story or myth does tonight’s chapter echo for you?' },
  { id: 'fan-09', genre: 'fantasy', text: 'What would you refuse to do, even to save this world?' },
  {
    id: 'fan-10',
    genre: 'fantasy',
    text: 'Draw a quick map in words: what is north of where the story is now?',
  },

  // Science fiction
  {
    id: 'sci-01',
    genre: 'scifi',
    text: 'Which invention in this book would you want, and which would frighten you?',
  },
  {
    id: 'sci-02',
    genre: 'scifi',
    text: 'What does this future get right about people, even if the technology is wrong?',
  },
  {
    id: 'sci-03',
    genre: 'scifi',
    text: 'If this world were real in fifty years, what small thing would you do today?',
  },
  { id: 'sci-04', genre: 'scifi', text: 'Who is left out of this future? What would they say about it?' },
  { id: 'sci-05', genre: 'scifi', text: 'What question about being human does tonight’s chapter ask?' },
  {
    id: 'sci-06',
    genre: 'scifi',
    text: 'Which rule of this world would change your daily routine the most?',
  },
  { id: 'sci-07', genre: 'scifi', text: 'Is this book hopeful or warning you? Where do you see it?' },
  {
    id: 'sci-08',
    genre: 'scifi',
    text: 'Describe a sound from this world that you imagine but the book never mentions.',
  },
  { id: 'sci-09', genre: 'scifi', text: 'What would you miss most from today if you lived in this future?' },
  {
    id: 'sci-10',
    genre: 'scifi',
    text: 'Which character would you trust with a starship? Which would you not?',
  },
];

export function getPrompt(id: string | null | undefined): Prompt | null {
  return (id && PROMPTS.find((p) => p.id === id)) || null;
}
