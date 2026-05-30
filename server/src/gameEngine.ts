import type { Room, ServerMessage } from './ws';

interface SampleQuestion {
  question: string;
  options: string[];
  correctAnswer: string;
}

const SAMPLE_QUESTIONS: SampleQuestion[] = [
  {
    question: 'What is the capital of France?',
    options: ['Berlin', 'Madrid', 'Paris', 'Rome'],
    correctAnswer: 'Paris',
  },
  {
    question: 'Which planet is known as the Red Planet?',
    options: ['Venus', 'Mars', 'Jupiter', 'Saturn'],
    correctAnswer: 'Mars',
  },
  {
    question: 'Who wrote "Hamlet"?',
    options: ['Dickens', 'Shakespeare', 'Tolstoy', 'Hemingway'],
    correctAnswer: 'Shakespeare',
  },
  {
    question: 'What is 7 x 8?',
    options: ['54', '56', '64', '49'],
    correctAnswer: '56',
  },
  {
    question: 'Which element has the chemical symbol "O"?',
    options: ['Gold', 'Oxygen', 'Osmium', 'Iron'],
    correctAnswer: 'Oxygen',
  },
];

const TIME_LIMIT_SECONDS = 15;
const TIME_LIMIT_MS = TIME_LIMIT_SECONDS * 1000;
const BASE_POINTS = 1000;
const TIME_PENALTY_MAX = 500;
const ROUND_INTERMISSION_MS = 3000;

type Broadcast = (msg: ServerMessage) => void;

interface PendingAnswer {
  answer: string;
  timeMs: number;
}

export function startGame(room: Room, broadcast: Broadcast): void {
  for (const p of room.players) p.score = 0;
  room.status = 'active';
  room.currentQuestion = -1;
  runNextQuestion(room, broadcast);
}

function runNextQuestion(room: Room, broadcast: Broadcast): void {
  room.currentQuestion++;
  if (room.currentQuestion >= SAMPLE_QUESTIONS.length) {
    finishGame(room, broadcast);
    return;
  }

  const q = SAMPLE_QUESTIONS[room.currentQuestion];
  const answers = new Map<string, PendingAnswer>();
  let finalized = false;
  let timer: NodeJS.Timeout | null = null;

  const finalize = (): void => {
    if (finalized) return;
    finalized = true;
    if (timer) clearTimeout(timer);
    room.handleAnswer = undefined;

    for (const player of room.players) {
      const a = answers.get(player.id);
      if (!a) continue;
      if (a.answer !== q.correctAnswer) continue;
      const clamped = Math.max(0, Math.min(a.timeMs, TIME_LIMIT_MS));
      const penalty = (clamped / TIME_LIMIT_MS) * TIME_PENALTY_MAX;
      player.score += Math.round(BASE_POINTS - penalty);
    }

    const scores = room.players
      .map((p) => ({ id: p.id, name: p.name, score: p.score }))
      .sort((a, b) => b.score - a.score);

    broadcast({
      type: 'ROUND_RESULT',
      payload: { correctAnswer: q.correctAnswer, scores },
    });

    setTimeout(() => runNextQuestion(room, broadcast), ROUND_INTERMISSION_MS);
  };

  room.handleAnswer = (playerId, answer, timeMs) => {
    if (finalized) return;
    if (!room.players.some((p) => p.id === playerId)) return;
    if (answers.has(playerId)) return;
    answers.set(playerId, { answer, timeMs });
    if (answers.size >= room.players.length) finalize();
  };

  broadcast({
    type: 'QUESTION',
    payload: {
      index: room.currentQuestion,
      total: SAMPLE_QUESTIONS.length,
      question: q.question,
      options: q.options,
      timeLimit: TIME_LIMIT_SECONDS,
    },
  });

  timer = setTimeout(finalize, TIME_LIMIT_MS);
}

function finishGame(room: Room, broadcast: Broadcast): void {
  room.status = 'ended';
  room.handleAnswer = undefined;
  const finalScores = room.players
    .map((p) => ({ id: p.id, name: p.name, score: p.score }))
    .sort((a, b) => b.score - a.score);
  broadcast({ type: 'GAME_OVER', payload: { finalScores } });
}
