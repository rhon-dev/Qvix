export interface Question {
  question: string;
  options: string[];
  correctAnswer: string;
  category: string;
}

/**
 * Question bank. The engine picks a random subset and shuffles option order
 * each game, so no two rounds feel identical.
 */
export const QUESTION_BANK: Question[] = [
  // Geography
  { category: 'Geography', question: 'What is the capital of France?', options: ['Berlin', 'Madrid', 'Paris', 'Rome'], correctAnswer: 'Paris' },
  { category: 'Geography', question: 'Which is the largest ocean on Earth?', options: ['Atlantic', 'Indian', 'Arctic', 'Pacific'], correctAnswer: 'Pacific' },
  { category: 'Geography', question: 'Mount Everest sits on the border of Nepal and which country?', options: ['India', 'China', 'Bhutan', 'Pakistan'], correctAnswer: 'China' },
  { category: 'Geography', question: 'Which country has the most natural lakes?', options: ['Russia', 'USA', 'Canada', 'Finland'], correctAnswer: 'Canada' },

  // Science
  { category: 'Science', question: 'Which planet is known as the Red Planet?', options: ['Venus', 'Mars', 'Jupiter', 'Saturn'], correctAnswer: 'Mars' },
  { category: 'Science', question: 'Which element has the chemical symbol "O"?', options: ['Gold', 'Oxygen', 'Osmium', 'Iron'], correctAnswer: 'Oxygen' },
  { category: 'Science', question: 'What is the powerhouse of the cell?', options: ['Nucleus', 'Ribosome', 'Mitochondria', 'Golgi body'], correctAnswer: 'Mitochondria' },
  { category: 'Science', question: 'What gas do plants absorb from the atmosphere?', options: ['Oxygen', 'Nitrogen', 'Carbon dioxide', 'Hydrogen'], correctAnswer: 'Carbon dioxide' },
  { category: 'Science', question: 'How many bones are in the adult human body?', options: ['186', '206', '226', '246'], correctAnswer: '206' },
  { category: 'Science', question: 'What is the speed of light approximately?', options: ['300 km/s', '300,000 km/s', '3,000 km/s', '30,000 km/s'], correctAnswer: '300,000 km/s' },

  // History
  { category: 'History', question: 'In which year did World War II end?', options: ['1943', '1944', '1945', '1946'], correctAnswer: '1945' },
  { category: 'History', question: 'Who was the first President of the United States?', options: ['Thomas Jefferson', 'George Washington', 'Abraham Lincoln', 'John Adams'], correctAnswer: 'George Washington' },
  { category: 'History', question: 'The Great Wall is located in which country?', options: ['Japan', 'India', 'China', 'Mongolia'], correctAnswer: 'China' },

  // Literature & Arts
  { category: 'Literature', question: 'Who wrote "Hamlet"?', options: ['Dickens', 'Shakespeare', 'Tolstoy', 'Hemingway'], correctAnswer: 'Shakespeare' },
  { category: 'Literature', question: 'Who painted the Mona Lisa?', options: ['Van Gogh', 'Picasso', 'Da Vinci', 'Rembrandt'], correctAnswer: 'Da Vinci' },
  { category: 'Literature', question: 'In which language was "Don Quixote" originally written?', options: ['Italian', 'French', 'Spanish', 'Portuguese'], correctAnswer: 'Spanish' },

  // Math & Logic
  { category: 'Math', question: 'What is 7 x 8?', options: ['54', '56', '64', '49'], correctAnswer: '56' },
  { category: 'Math', question: 'What is the value of pi to two decimal places?', options: ['3.12', '3.14', '3.16', '3.18'], correctAnswer: '3.14' },
  { category: 'Math', question: 'What is 15% of 200?', options: ['20', '25', '30', '35'], correctAnswer: '30' },

  // Technology
  { category: 'Technology', question: 'What does "HTTP" stand for?', options: ['HyperText Transfer Protocol', 'High Transfer Text Protocol', 'HyperterminalText Protocol', 'Host Transfer Text Process'], correctAnswer: 'HyperText Transfer Protocol' },
  { category: 'Technology', question: 'Who is credited as the founder of Microsoft?', options: ['Steve Jobs', 'Bill Gates', 'Elon Musk', 'Mark Zuckerberg'], correctAnswer: 'Bill Gates' },
  { category: 'Technology', question: 'What does "CPU" stand for?', options: ['Central Process Unit', 'Computer Personal Unit', 'Central Processing Unit', 'Core Processing Unit'], correctAnswer: 'Central Processing Unit' },

  // Sports & General
  { category: 'Sports', question: 'How many players are on a standard soccer team on the field?', options: ['9', '10', '11', '12'], correctAnswer: '11' },
  { category: 'General', question: 'How many continents are there on Earth?', options: ['5', '6', '7', '8'], correctAnswer: '7' },
];

export type Rng = () => number;

/**
 * Fisher-Yates shuffle. Returns a new array; the input is not mutated.
 * Accepts an injectable RNG so games (and tests) can be made deterministic.
 */
export function shuffle<T>(arr: readonly T[], rng: Rng = Math.random): T[] {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Pick `count` random questions from the bank with their options shuffled.
 * `count` is clamped to the bank size.
 */
export function pickQuestions(
  count: number,
  rng: Rng = Math.random,
  bank: readonly Question[] = QUESTION_BANK,
): Question[] {
  const n = Math.max(1, Math.min(count, bank.length));
  return shuffle(bank, rng)
    .slice(0, n)
    .map((q) => ({ ...q, options: shuffle(q.options, rng) }));
}
