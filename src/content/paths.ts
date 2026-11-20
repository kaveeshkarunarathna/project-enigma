import type { CuratedPathSeed } from '@/data/paths';

/**
 * Curated reading paths, bundled with the app. Each opens with a short book,
 * so the first star lights in the first week. Notes are our own words about
 * why a book sits where it does; they never quote or summarise the book.
 *
 * Bump `version` when a path changes, so phones that already have it update.
 */
export const CURATED_PATHS: CuratedPathSeed[] = [
  {
    id: 'stoics',
    version: 1,
    genre: 'philosophy',
    title: 'First Steps with the Stoics',
    subtitle: 'Calm, practical philosophy for ordinary days',
    description:
      'Four books from thinkers who wrote about what we can control and what we cannot. Short chapters, easy to read a little each night.',
    books: [
      {
        title: 'The Enchiridion',
        author: 'Epictetus',
        note: 'A handbook you can finish in an evening. The ideas the rest of the path builds on.',
      },
      {
        title: 'On the Shortness of Life',
        author: 'Seneca',
        note: 'A short essay on time and how we spend it. A good second star.',
      },
      {
        title: 'Meditations',
        author: 'Marcus Aurelius',
        note: 'Private notes an emperor wrote to himself. Read a few entries a night; there is no plot to lose.',
      },
      {
        title: 'Letters from a Stoic',
        author: 'Seneca',
        note: 'Letters to a friend, warm and practical. Each one stands on its own.',
      },
    ],
  },
  {
    id: 'big-questions',
    version: 1,
    genre: 'philosophy',
    title: 'Questions That Started Everything',
    subtitle: 'Where Western philosophy begins, and where it goes',
    description:
      'From a trial in ancient Athens to a novel about a girl who receives mysterious letters, this path walks through the questions people have never stopped asking.',
    books: [
      {
        title: 'Apology',
        author: 'Plato',
        note: 'Socrates speaking at his own trial. Short, dramatic, and the best door into philosophy.',
      },
      {
        title: 'The Problems of Philosophy',
        author: 'Bertrand Russell',
        note: 'A clear, friendly guide to the big questions, written for beginners.',
      },
      {
        title: 'Meditations on First Philosophy',
        author: 'René Descartes',
        note: 'Six short meditations that try to find one thing we can be sure of.',
      },
      {
        title: 'Symposium',
        author: 'Plato',
        note: 'A dinner party where the guests take turns talking about love.',
      },
      {
        title: "Sophie's World",
        author: 'Jostein Gaarder',
        note: 'A novel that ties the whole path together. Take it slowly.',
      },
    ],
  },
  {
    id: 'short-classics',
    version: 1,
    genre: 'classics',
    title: 'Short Classics for Long Evenings',
    subtitle: 'Famous books you can finish in a week or two',
    description:
      'Classics are less frightening when they are short. Each of these can be read in a handful of nights, and each one leaves a mark.',
    books: [
      {
        title: 'The Metamorphosis',
        author: 'Franz Kafka',
        note: 'Strange from the first line and only a few evenings long.',
      },
      {
        title: 'The Old Man and the Sea',
        author: 'Ernest Hemingway',
        note: 'Simple sentences, a long struggle, and a lot left unsaid.',
      },
      {
        title: 'Of Mice and Men',
        author: 'John Steinbeck',
        note: 'Friendship and hope, told almost like a play.',
      },
      {
        title: 'The Death of Ivan Ilyich',
        author: 'Leo Tolstoy',
        note: 'A short novel that asks what makes a life well lived. A gentle way into Tolstoy.',
      },
      {
        title: 'Candide',
        author: 'Voltaire',
        note: 'A fast, funny journey that makes fun of easy optimism.',
      },
    ],
  },
  {
    id: 'great-novels',
    version: 1,
    genre: 'classics',
    title: 'Into the Great Novels',
    subtitle: 'Five long classics, one star at a time',
    description:
      'For when you are ready for bigger books. The path starts with the shortest and builds towards one of the longest. Take as many nights as you need.',
    books: [
      {
        title: 'Frankenstein',
        author: 'Mary Shelley',
        note: 'Written by a nineteen-year-old and still unsettling. The shortest of the five.',
      },
      {
        title: 'Pride and Prejudice',
        author: 'Jane Austen',
        note: 'Sharp, funny conversations. Read the dialogue aloud in your head.',
      },
      {
        title: 'Jane Eyre',
        author: 'Charlotte Brontë',
        note: 'A narrator who speaks straight to you, and a house full of secrets.',
      },
      {
        title: 'Crime and Punishment',
        author: 'Fyodor Dostoevsky',
        note: 'A tense book that lives inside one troubled mind.',
      },
      {
        title: 'Anna Karenina',
        author: 'Leo Tolstoy',
        note: 'The longest star in this path. Many short chapters make it easier than it looks.',
      },
    ],
  },
  {
    id: 'other-worlds',
    version: 1,
    genre: 'fantasy',
    title: 'Doors into Other Worlds',
    subtitle: 'Fantasy that begins with a door, a wardrobe, or a map',
    description:
      'Stories where ordinary people step into somewhere else. A short, eerie start, then wardrobes, wizards and a very reluctant hero.',
    books: [
      {
        title: 'Coraline',
        author: 'Neil Gaiman',
        note: 'A short, eerie story about a door that should stay closed.',
      },
      {
        title: 'The Lion, the Witch and the Wardrobe',
        author: 'C. S. Lewis',
        note: 'A classic doorway into another land. Quick to read and easy to love.',
      },
      {
        title: 'A Wizard of Earthsea',
        author: 'Ursula K. Le Guin',
        note: 'A young wizard learns that power has a price. Quiet, deep and beautifully written.',
      },
      {
        title: 'The Hobbit',
        author: 'J. R. R. Tolkien',
        note: 'A comfortable hero pulled into a long journey. The perfect end to this path.',
      },
    ],
  },
  {
    id: 'myths-retold',
    version: 1,
    genre: 'fantasy',
    title: 'Myths Retold',
    subtitle: 'Old gods and heroes, told again for today',
    description:
      'Modern writers return to the oldest stories. Start with short tales, then follow a few lives that the myths left in the background.',
    books: [
      {
        title: 'Norse Mythology',
        author: 'Neil Gaiman',
        note: 'Short tales you can read one a night. Gods who are clever, foolish and very human.',
      },
      {
        title: 'The Song of Achilles',
        author: 'Madeline Miller',
        note: 'A famous war told through a close friendship.',
      },
      {
        title: 'Circe',
        author: 'Madeline Miller',
        note: 'A minor goddess becomes the main character of her own story.',
      },
      {
        title: 'Till We Have Faces',
        author: 'C. S. Lewis',
        note: 'An old myth retold by the sister nobody listened to. The most thoughtful star here.',
      },
    ],
  },
  {
    id: 'classic-scifi',
    version: 1,
    genre: 'scifi',
    title: 'Classic Science Fiction, Gently',
    subtitle: 'The books that taught us to imagine the future',
    description:
      'From a Victorian time traveller to a desert planet. Each book asks a big question about people by changing one thing about the world.',
    books: [
      {
        title: 'The Time Machine',
        author: 'H. G. Wells',
        note: 'Short and strange. Where much of science fiction begins.',
      },
      {
        title: 'Fahrenheit 451',
        author: 'Ray Bradbury',
        note: 'A world that burns books, which is a fine reason to read one.',
      },
      {
        title: 'I, Robot',
        author: 'Isaac Asimov',
        note: 'Linked short stories, one a night, about machines and the rules we give them.',
      },
      {
        title: 'The Left Hand of Darkness',
        author: 'Ursula K. Le Guin',
        note: 'A cold planet and a careful look at what we assume about each other.',
      },
      {
        title: 'Dune',
        author: 'Frank Herbert',
        note: 'The big one. A whole world of politics, ecology and prophecy.',
      },
    ],
  },
  {
    id: 'minds-machines',
    version: 1,
    genre: 'scifi',
    title: 'Minds and Machines',
    subtitle: 'What it means to think, feel and be a person',
    description:
      'Robots who would rather watch television, a man who becomes a genius, and an artificial friend who watches the sun. Big questions told through very personal stories.',
    books: [
      {
        title: 'All Systems Red',
        author: 'Martha Wells',
        note: 'A short, funny story told by a security robot who only wants to be left alone.',
      },
      {
        title: 'Flowers for Algernon',
        author: 'Daniel Keyes',
        note: 'Told through diary entries that change as the writer changes.',
      },
      {
        title: 'Do Androids Dream of Electric Sheep?',
        author: 'Philip K. Dick',
        note: 'A detective story that keeps asking what makes someone real.',
      },
      {
        title: 'Klara and the Sun',
        author: 'Kazuo Ishiguro',
        note: 'A quiet, tender book seen through the eyes of an artificial friend.',
      },
    ],
  },
];
