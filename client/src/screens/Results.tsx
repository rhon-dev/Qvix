import type { ScoreEntry } from '../types';
import styles from './Results.module.css';

interface Props {
  correctAnswer: string;
  scores: ScoreEntry[];
  previousScores: Record<string, number>;
  playerId: string | null;
}

export default function Results({ correctAnswer, scores, previousScores, playerId }: Props) {
  const sorted = [...scores].sort((a, b) => b.score - a.score);

  return (
    <div className={styles.wrap}>
      <div className={styles.card}>
        <div className={styles.correctWrap}>
          <div className={styles.correctLabel}>Correct answer</div>
          <div className={styles.correctAnswer}>{correctAnswer}</div>
        </div>

        <div>
          <div className={styles.label}>Leaderboard</div>
        </div>

        <ul className={styles.scores}>
          {sorted.map((s, i) => {
            const prev = previousScores[s.id] ?? 0;
            const delta = s.score - prev;
            return (
              <li
                key={s.id}
                className={`${styles.row} ${s.id === playerId ? styles.rowMe : ''}`}
              >
                <span className={styles.rank}>#{i + 1}</span>
                <span>{s.name}</span>
                <span className={`${styles.delta} ${delta === 0 ? styles.deltaZero : ''}`}>
                  {delta > 0 ? `+${delta}` : delta}
                </span>
                <span className={styles.score}>{s.score}</span>
              </li>
            );
          })}
        </ul>

        <div className={styles.next}>Next question coming up...</div>
      </div>
    </div>
  );
}
