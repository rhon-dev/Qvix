import { saveGameResult } from './db';
import { pickQuestions, type Question, type Rng } from './questions';
import { streakBonus, timeScore, TIME_LIMIT_MS, TIME_LIMIT_SECONDS } from './scoring';
import type { Room, ServerMessage } from './ws';

const ROUND_INTERMISSION_MS = 3000;
const DEFAULT_QUESTION_COUNT = Number(process.env.QUESTION_COUNT) || 10;

type Broadcast = (msg: ServerMessage) => void;

interface PendingAnswer {
  answer: string;
  timeMs: number;
}

export interface GameOptions {
  /** How many questions this game runs. Clamped to the bank size. */
  questionCount?: number;
  /** Override the question set (used by tests for determinism). */
  questions?: Question[];
  /** Injectable RNG for deterministic shuffling in tests. */
  rng?: Rng;
}

export function startGame(room: Room, broadcast: Broadcast, opts: GameOptions = {}): void {
  for (const p of room.players) {
    p.score = 0;
    p.streak = 0;
  }
  room.status = 'active';
  room.currentQuestion = -1;
  room.questions =
    opts.questions ?? pickQuestions(opts.questionCount ?? DEFAULT_QUESTION_COUNT, opts.rng);
  runNextQuestion(room, broadcast);
}

function runNextQuestion(room: Room, broadcast: Broadcast): void {
  const questions = room.questions ?? [];

  // Everyone left mid-game — stop cleanly without broadcasting into the void.
  if (room.players.length === 0) {
    room.status = 'ended';
    room.handleAnswer = undefined;
    room.onPlayerLeft = undefined;
    return;
  }

  room.currentQuestion++;
  if (room.currentQuestion >= questions.length) {
    finishGame(room, broadcast);
    return;
  }

  const q = questions[room.currentQuestion];
  const answers = new Map<string, PendingAnswer>();
  let finalized = false;
  let timer: NodeJS.Timeout | null = null;

  const finalize = (): void => {
    if (finalized) return;
    finalized = true;
    if (timer) clearTimeout(timer);
    room.handleAnswer = undefined;
    room.onPlayerLeft = undefined;

    for (const player of room.players) {
      const a = answers.get(player.id);
      const correct = a?.answer === q.correctAnswer;
      if (correct && a) {
        player.streak += 1;
        player.score += timeScore(a.timeMs) + streakBonus(player.streak);
      } else {
        player.streak = 0;
      }
    }

    broadcast({
      type: 'ROUND_RESULT',
      payload: { correctAnswer: q.correctAnswer, scores: scoreboard(room) },
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

  // A player leaving may mean everyone *remaining* has now answered.
  room.onPlayerLeft = () => {
    if (finalized) return;
    if (room.players.length === 0 || answers.size >= room.players.length) finalize();
  };

  broadcast({
    type: 'QUESTION',
    payload: {
      index: room.currentQuestion,
      total: questions.length,
      question: q.question,
      category: q.category,
      options: q.options,
      timeLimit: TIME_LIMIT_SECONDS,
    },
  });

  timer = setTimeout(finalize, TIME_LIMIT_MS);
}

function scoreboard(room: Room) {
  return room.players
    .map((p) => ({ id: p.id, name: p.name, score: p.score }))
    .sort((a, b) => b.score - a.score);
}

function finishGame(room: Room, broadcast: Broadcast): void {
  room.status = 'ended';
  room.handleAnswer = undefined;
  room.onPlayerLeft = undefined;
  const finalScores = scoreboard(room);
  broadcast({ type: 'GAME_OVER', payload: { finalScores } });

  saveGameResult(
    room.code,
    room.players.map((p) => ({ name: p.name, score: p.score })),
  ).catch((err) => console.error('[gameEngine] saveGameResult failed', err));
}
