/**
 * Books Stellibria can suggest. Bundled with the app, so suggestions work
 * offline and nothing about the reader is sent anywhere to make them.
 *
 * Every line here is written by us: a title, an author, a genre, a few theme
 * words and one sentence on why a reader might pick it up. No book text is
 * quoted or summarised, and nothing here is fed to a generative model.
 *
 * It holds every book in the curated paths and the free classics, plus more
 * in the same four niches. Keep each `note` to one calm sentence.
 */

export const THEMES = [
  'time',
  'mortality',
  'calm',
  'meaning',
  'love',
  'humanity',
  'identity',
  'justice',
  'freedom',
  'nature',
  'wonder',
  'journey',
  'society',
  'family',
  'solitude',
  'courage',
  'truth',
  'myth',
  'future',
  'friendship',
] as const;
export type Theme = (typeof THEMES)[number];

/** How a theme reads at the end of a sentence: "a book about …". */
export const THEME_PHRASE: Record<Theme, string> = {
  time: 'time',
  mortality: 'living with endings',
  calm: 'finding calm',
  meaning: 'what makes a life meaningful',
  love: 'love',
  humanity: 'what makes us human',
  identity: 'who we become',
  justice: 'right and wrong',
  freedom: 'freedom',
  nature: 'the natural world',
  wonder: 'wonder',
  journey: 'journeys',
  society: 'how people live together',
  family: 'family',
  solitude: 'being alone',
  courage: 'courage',
  truth: 'searching for the truth',
  myth: 'old myths',
  future: 'the future',
  friendship: 'friendship',
};

/**
 * Words in the reader's own journal that hint at a theme. Used when search by
 * meaning is off, so suggestions can still listen to what they write.
 */
export const THEME_WORDS: Record<Theme, string[]> = {
  time: ['time', 'clock', 'hours', 'years', 'past', 'memory', 'memories', 'remember', 'aging', 'older'],
  mortality: ['death', 'die', 'dying', 'mortal', 'grief', 'loss', 'funeral', 'gone', 'mourning'],
  calm: ['calm', 'worry', 'worried', 'anxiety', 'anxious', 'stress', 'accept', 'peace', 'control', 'patience'],
  meaning: ['meaning', 'purpose', 'pointless', 'meaningful', 'why', 'happiness', 'happy'],
  love: ['love', 'loved', 'heart', 'romance', 'marriage', 'longing', 'crush'],
  humanity: ['human', 'humanity', 'soul', 'conscious', 'consciousness', 'robot', 'machine', 'empathy'],
  identity: ['self', 'identity', 'becoming', 'change', 'changed', 'person', 'myself'],
  justice: ['justice', 'guilt', 'guilty', 'crime', 'punishment', 'moral', 'wrong', 'fair', 'unfair'],
  freedom: ['freedom', 'free', 'censorship', 'choice', 'choose', 'power', 'rebel'],
  nature: ['nature', 'sea', 'ocean', 'forest', 'earth', 'desert', 'animals', 'trees', 'river', 'garden'],
  wonder: ['wonder', 'magic', 'dream', 'dreams', 'imagination', 'stars', 'sky', 'awe', 'strange'],
  journey: ['journey', 'adventure', 'travel', 'home', 'quest', 'map', 'road', 'wander'],
  society: ['society', 'class', 'money', 'status', 'manners', 'politics', 'work', 'city'],
  family: ['family', 'mother', 'father', 'mum', 'mom', 'dad', 'sister', 'brother', 'parents', 'child'],
  solitude: ['lonely', 'loneliness', 'alone', 'solitude', 'isolated', 'outsider', 'quiet'],
  courage: ['courage', 'brave', 'fear', 'afraid', 'scared', 'hero', 'risk'],
  truth: ['truth', 'knowledge', 'certain', 'doubt', 'question', 'questions', 'reason', 'believe'],
  myth: ['myth', 'myths', 'gods', 'god', 'legend', 'ancient', 'greek', 'norse'],
  future: ['future', 'technology', 'science', 'space', 'planet', 'ai', 'tomorrow'],
  friendship: ['friend', 'friends', 'friendship', 'companion', 'together', 'lonely'],
};

export type CatalogueGenre = 'philosophy' | 'classics' | 'fantasy' | 'scifi';

export type CatalogueBook = {
  title: string;
  author: string;
  genre: CatalogueGenre;
  themes: Theme[];
  note: string;
  /** Can be read in a week or two of short nights. */
  short?: boolean;
};

export const CATALOGUE: CatalogueBook[] = [
  // Philosophy
  { title: 'The Enchiridion', author: 'Epictetus', genre: 'philosophy', themes: ['calm', 'freedom'], short: true, note: 'A pocket handbook on what is ours to control.' },
  { title: 'On the Shortness of Life', author: 'Seneca', genre: 'philosophy', themes: ['time', 'meaning'], short: true, note: 'A short essay on how we spend our hours.' },
  { title: 'Meditations', author: 'Marcus Aurelius', genre: 'philosophy', themes: ['calm', 'mortality', 'meaning'], note: 'Private notes to himself, a few lines a night.' },
  { title: 'Letters from a Stoic', author: 'Seneca', genre: 'philosophy', themes: ['calm', 'friendship', 'mortality'], note: 'Warm, practical letters to a friend.' },
  { title: 'Discourses', author: 'Epictetus', genre: 'philosophy', themes: ['calm', 'freedom', 'truth'], note: 'Longer talks behind the Enchiridion, for after the handbook.' },
  { title: 'Apology', author: 'Plato', genre: 'philosophy', themes: ['truth', 'justice', 'courage'], short: true, note: 'A trial, a defence, and the best door into philosophy.' },
  { title: 'Symposium', author: 'Plato', genre: 'philosophy', themes: ['love', 'truth'], short: true, note: 'A dinner party where each guest speaks about love.' },
  { title: 'The Problems of Philosophy', author: 'Bertrand Russell', genre: 'philosophy', themes: ['truth'], note: 'A clear, friendly guide to the big questions.' },
  { title: 'Meditations on First Philosophy', author: 'René Descartes', genre: 'philosophy', themes: ['truth', 'identity'], short: true, note: 'Six short sittings in search of one certain thing.' },
  { title: "Sophie's World", author: 'Jostein Gaarder', genre: 'philosophy', themes: ['truth', 'wonder', 'identity'], note: 'A novel that walks through the history of thinking.' },
  { title: 'The Consolation of Philosophy', author: 'Boethius', genre: 'philosophy', themes: ['calm', 'mortality', 'meaning'], note: 'Written in a prison cell, about what cannot be taken away.' },
  { title: "Man's Search for Meaning", author: 'Viktor E. Frankl', genre: 'philosophy', themes: ['meaning', 'courage', 'mortality'], short: true, note: 'On finding a reason to go on, from someone who had to.' },
  { title: 'The Myth of Sisyphus', author: 'Albert Camus', genre: 'philosophy', themes: ['meaning', 'freedom'], short: true, note: 'An essay on carrying on when the world gives no answers.' },
  { title: 'Walden', author: 'Henry David Thoreau', genre: 'philosophy', themes: ['nature', 'solitude', 'meaning'], note: 'Two years in a cabin by a pond, living simply on purpose.' },
  { title: 'Tao Te Ching', author: 'Laozi', genre: 'philosophy', themes: ['calm', 'nature'], short: true, note: 'Eighty-one short verses, one for each quiet evening.' },
  { title: 'Siddhartha', author: 'Hermann Hesse', genre: 'philosophy', themes: ['journey', 'identity', 'meaning'], short: true, note: 'A gentle novel about a young man looking for wisdom.' },

  // Classics
  { title: 'The Metamorphosis', author: 'Franz Kafka', genre: 'classics', themes: ['identity', 'family', 'solitude'], short: true, note: 'A strange morning and a family that has to cope.' },
  { title: 'The Old Man and the Sea', author: 'Ernest Hemingway', genre: 'classics', themes: ['courage', 'nature', 'solitude'], short: true, note: 'An old fisherman, a great fish, and plain, clear sentences.' },
  { title: 'Of Mice and Men', author: 'John Steinbeck', genre: 'classics', themes: ['friendship', 'society'], short: true, note: 'Two friends and a dream of a small farm.' },
  { title: 'The Death of Ivan Ilyich', author: 'Leo Tolstoy', genre: 'classics', themes: ['mortality', 'meaning'], short: true, note: 'A short novel that asks what a good life was.' },
  { title: 'Candide', author: 'Voltaire', genre: 'classics', themes: ['meaning', 'journey', 'society'], short: true, note: 'A fast, funny journey that mocks easy optimism.' },
  { title: 'Frankenstein', author: 'Mary Shelley', genre: 'classics', themes: ['humanity', 'solitude', 'justice'], note: 'A creator, his creature, and who owes what to whom.' },
  { title: 'Pride and Prejudice', author: 'Jane Austen', genre: 'classics', themes: ['love', 'society', 'family'], note: 'Sharp, funny, and kinder than its reputation.' },
  { title: 'Jane Eyre', author: 'Charlotte Brontë', genre: 'classics', themes: ['identity', 'love', 'freedom'], note: 'A quiet, fierce heroine who will not be made smaller.' },
  { title: 'Crime and Punishment', author: 'Fyodor Dostoevsky', genre: 'classics', themes: ['justice', 'identity', 'solitude'], note: 'A crime in the first part, and a conscience for the rest.' },
  { title: 'Anna Karenina', author: 'Leo Tolstoy', genre: 'classics', themes: ['love', 'family', 'society'], note: 'A long, absorbing novel about love and families.' },
  { title: 'The Brothers Karamazov', author: 'Fyodor Dostoevsky', genre: 'classics', themes: ['family', 'justice', 'truth'], note: 'Three brothers and the biggest questions, argued at the table.' },
  { title: 'Wuthering Heights', author: 'Emily Brontë', genre: 'classics', themes: ['love', 'nature', 'family'], note: 'Wild moors and a love that will not behave.' },
  { title: 'Middlemarch', author: 'George Eliot', genre: 'classics', themes: ['society', 'love', 'meaning'], note: 'A whole town, and ordinary lives taken seriously.' },
  { title: 'Great Expectations', author: 'Charles Dickens', genre: 'classics', themes: ['identity', 'society', 'love'], note: 'A boy, a secret helper, and growing up.' },
  { title: 'The Great Gatsby', author: 'F. Scott Fitzgerald', genre: 'classics', themes: ['love', 'society', 'time'], short: true, note: 'A summer of parties and a past that will not stay past.' },
  { title: 'The Picture of Dorian Gray', author: 'Oscar Wilde', genre: 'classics', themes: ['identity', 'justice', 'time'], note: 'A portrait that ages so its owner does not.' },
  { title: 'Moby-Dick', author: 'Herman Melville', genre: 'classics', themes: ['nature', 'journey', 'truth'], note: 'A whaling voyage that becomes a book about everything.' },
  { title: 'Dracula', author: 'Bram Stoker', genre: 'classics', themes: ['courage', 'friendship'], note: 'Told in letters and diaries, perfect for dark evenings.' },
  { title: 'The Stranger', author: 'Albert Camus', genre: 'classics', themes: ['meaning', 'solitude', 'justice'], short: true, note: 'A short, cool novel about a man who will not pretend.' },

  // Fantasy
  { title: 'Coraline', author: 'Neil Gaiman', genre: 'fantasy', themes: ['courage', 'family', 'wonder'], short: true, note: 'A door in an old house, and a brave, small heroine.' },
  { title: 'The Lion, the Witch and the Wardrobe', author: 'C. S. Lewis', genre: 'fantasy', themes: ['wonder', 'courage', 'family'], short: true, note: 'The wardrobe that started so many readers.' },
  { title: 'A Wizard of Earthsea', author: 'Ursula K. Le Guin', genre: 'fantasy', themes: ['identity', 'journey', 'wonder'], short: true, note: 'A young wizard learns that names and shadows matter.' },
  { title: 'The Hobbit', author: 'J. R. R. Tolkien', genre: 'fantasy', themes: ['journey', 'courage', 'friendship'], note: 'A comfortable hobbit is talked into an adventure.' },
  { title: 'Norse Mythology', author: 'Neil Gaiman', genre: 'fantasy', themes: ['myth', 'wonder'], short: true, note: 'The old northern stories, told as if around a fire.' },
  { title: 'The Song of Achilles', author: 'Madeline Miller', genre: 'fantasy', themes: ['myth', 'love', 'mortality'], note: 'The Trojan War, told as a love story.' },
  { title: 'Circe', author: 'Madeline Miller', genre: 'fantasy', themes: ['myth', 'identity', 'solitude'], note: 'A goddess on an island, slowly becoming herself.' },
  { title: 'Till We Have Faces', author: 'C. S. Lewis', genre: 'fantasy', themes: ['myth', 'love', 'truth'], note: 'An old myth retold by the sister who was left out.' },
  { title: 'Alice’s Adventures in Wonderland', author: 'Lewis Carroll', genre: 'fantasy', themes: ['wonder', 'identity'], short: true, note: 'Nonsense, riddles and a girl who keeps her head.' },
  { title: 'The Wonderful Wizard of Oz', author: 'L. Frank Baum', genre: 'fantasy', themes: ['journey', 'friendship', 'courage'], short: true, note: 'A road, three companions, and the way home.' },
  { title: 'The Last Unicorn', author: 'Peter S. Beagle', genre: 'fantasy', themes: ['wonder', 'mortality', 'journey'], short: true, note: 'A unicorn goes looking for the others, and learns regret.' },
  { title: 'Stardust', author: 'Neil Gaiman', genre: 'fantasy', themes: ['wonder', 'love', 'journey'], short: true, note: 'A young man crosses a wall to fetch a fallen star.' },
  { title: "Howl's Moving Castle", author: 'Diana Wynne Jones', genre: 'fantasy', themes: ['identity', 'wonder', 'love'], note: 'A cursed hatmaker, a vain wizard, and a walking castle.' },
  { title: 'Piranesi', author: 'Susanna Clarke', genre: 'fantasy', themes: ['solitude', 'wonder', 'truth'], short: true, note: 'An endless house of statues and tides, and a gentle narrator.' },
  { title: 'The Name of the Wind', author: 'Patrick Rothfuss', genre: 'fantasy', themes: ['journey', 'identity', 'wonder'], note: 'A legend tells his own story, one long night at a time.' },
  { title: 'The Night Circus', author: 'Erin Morgenstern', genre: 'fantasy', themes: ['wonder', 'love'], note: 'A circus that opens only at night, and a quiet contest.' },

  // Science fiction
  { title: 'The Time Machine', author: 'H. G. Wells', genre: 'scifi', themes: ['time', 'future', 'society'], short: true, note: 'One of the first trips into the far future.' },
  { title: 'The War of the Worlds', author: 'H. G. Wells', genre: 'scifi', themes: ['courage', 'future'], short: true, note: 'An invasion seen by one man trying to get home.' },
  { title: 'Fahrenheit 451', author: 'Ray Bradbury', genre: 'scifi', themes: ['freedom', 'truth', 'society'], short: true, note: 'A fireman who burns books, until he reads one.' },
  { title: 'I, Robot', author: 'Isaac Asimov', genre: 'scifi', themes: ['humanity', 'future'], note: 'Linked stories about robots and their rules.' },
  { title: 'The Left Hand of Darkness', author: 'Ursula K. Le Guin', genre: 'scifi', themes: ['identity', 'friendship', 'society'], note: 'An envoy on a frozen world learns to trust.' },
  { title: 'Dune', author: 'Frank Herbert', genre: 'scifi', themes: ['nature', 'freedom', 'myth'], note: 'A desert planet, a family, and the price of power.' },
  { title: 'All Systems Red', author: 'Martha Wells', genre: 'scifi', themes: ['humanity', 'friendship', 'identity'], short: true, note: 'A security robot who would rather be watching shows.' },
  { title: 'Flowers for Algernon', author: 'Daniel Keyes', genre: 'scifi', themes: ['humanity', 'identity', 'solitude'], note: 'Told in progress reports, and quietly devastating.' },
  { title: 'Do Androids Dream of Electric Sheep?', author: 'Philip K. Dick', genre: 'scifi', themes: ['humanity', 'nature'], short: true, note: 'A bounty hunter starts to doubt what counts as alive.' },
  { title: 'Klara and the Sun', author: 'Kazuo Ishiguro', genre: 'scifi', themes: ['humanity', 'love', 'family'], note: 'A gentle robot watches a family and tries to help.' },
  { title: 'The Dispossessed', author: 'Ursula K. Le Guin', genre: 'scifi', themes: ['freedom', 'society', 'solitude'], note: 'A physicist between two worlds that each think they are free.' },
  { title: 'Solaris', author: 'Stanisław Lem', genre: 'scifi', themes: ['truth', 'love', 'solitude'], short: true, note: 'A station above a living ocean that answers in memories.' },
  { title: 'Never Let Me Go', author: 'Kazuo Ishiguro', genre: 'scifi', themes: ['mortality', 'friendship', 'humanity'], note: 'Three friends looking back on a school that hid something.' },
  { title: 'Brave New World', author: 'Aldous Huxley', genre: 'scifi', themes: ['freedom', 'society', 'future'], note: 'A world made comfortable, at a cost.' },
  { title: 'Nineteen Eighty-Four', author: 'George Orwell', genre: 'scifi', themes: ['freedom', 'truth', 'society'], note: 'A man keeps a secret diary in a watched world.' },
  { title: 'The Martian Chronicles', author: 'Ray Bradbury', genre: 'scifi', themes: ['future', 'solitude', 'wonder'], note: 'Linked stories of people trying to make Mars home.' },
  { title: 'Foundation', author: 'Isaac Asimov', genre: 'scifi', themes: ['future', 'society', 'time'], note: 'A plan to shorten a dark age, told across centuries.' },
  { title: 'Exhalation', author: 'Ted Chiang', genre: 'scifi', themes: ['time', 'humanity', 'wonder'], note: 'Thoughtful short stories, one per evening.' },
  { title: 'A Canticle for Leibowitz', author: 'Walter M. Miller Jr.', genre: 'scifi', themes: ['time', 'truth', 'future'], note: 'Monks keep knowledge alive across a long, dark age.' },
  { title: 'Project Hail Mary', author: 'Andy Weir', genre: 'scifi', themes: ['friendship', 'courage', 'future'], note: 'A lone astronaut, a puzzle, and an unlikely friend.' },
];
