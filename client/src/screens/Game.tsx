import { useEffect, useState } from 'react';
import type { PublicPlayer, ScoreEntry } from '../types';
import styles from './Game.module.css';

interface Props {
  index: number;
  total: number;
  question: string;
  options: string[];
  timeLimit: number;
  startedAt: number;
  scores: ScoreEntry[] | PublicPlayer[];
  playerId: string | null;
  hasAnswered: boolean;
  onAnswer: (answer: string, timeMs: number) => void;
}

const LETTERS = ['A', 'B', 'C', 'D'];

export default function Game({
  index,
  total,
  question,
  options,
  timeLimit,
  startedAt,
  scores,
  playerId,
  hasAnswered,
  onAnswer,
}: Props) {
  const [remaining, setRemaining] = useState(timeLimit);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    setSelected(null);
  }, [index]);

  useEffect(() => {
    const tick = () => {
      const elapsedMs = Date.now() - startedAt;
      const rem = Math.max(0, timeLimit - elapsedMs / 1000);
      setRemaining(rem);
    };
    tick();
    const id = window.setInterval(tick, 100);
    return () => window.clearInterval(id);
  }, [startedAt, timeLimit]);

  const pct = Math.max(0, Math.min(100, (remaining / timeLimit) * 100));
  const low = remaining <= 5;

  const handleClick = (opt: string) => {
    if (hasAnswered || selected) return;
    const timeMs = Date.now() - startedAt;
    setSelected(opt);
    onAnswer(opt, timeMs);
  };

  const sortedScores = [...scores].sort((a, b) => b.score - a.score);

  return (
    <div className={styles.wrap}>
      <div className={styles.main}>
        <div className={styles.header}>
          <div className={styles.qIndex}>
            Question {index + 1} / {total}
          </div>
          <div className={styles.timer}>{Math.ceil(remaining)}s</div>
        </div>

        <div className={styles.timerBarWrap}>
          <div
            className={`${styles.timerBar} ${low ? styles.timerBarLow : ''}`}
            style={{ width: `${pct}%` }}
          />
        </div>

        <div className={styles.question}>{question}</div>

        <div className={styles.options}>
          {options.map((opt, i) => {
            const isSelected = selected === opt;
            return (
              <button
                key={opt}
                className={`${styles.option} ${isSelected ? styles.optionSelected : ''}`}
                onClick={() => handleClick(opt)}
                disabled={hasAnswered || selected !== null}
              >
                <span className={styles.letter}>{LETTERS[i]}</span>
                <span>{opt}</span>
              </button>
            );
          })}
        </div>

        {(hasAnswered || selected) && (
          <div className={styles.waitingAfter}>Answer locked. Waiting for others...</div>
        )}
      </div>

      <aside className={styles.sidebar}>
        <div className={styles.sideTitle}>Scores</div>
        <ul className={styles.scoreList}>
          {sortedScores.map((s) => (
            <li
              key={s.id}
              className={`${styles.scoreRow} ${s.id === playerId ? styles.scoreRowMe : ''}`}
            >
              <span>{s.name}</span>
              <span className={styles.scoreVal}>{s.score}</span>
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}
