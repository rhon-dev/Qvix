import { useEffect, useState } from 'react';
import type { ScoreEntry } from '../types';
import styles from './End.module.css';

interface Props {
  finalScores: ScoreEntry[];
  playerId: string | null;
  onPlayAgain: () => void;
}

interface HofEntry {
  name: string;
  score: number;
  room_code: string;
  played_at: string;
}

const API_BASE: string = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export default function End({ finalScores, playerId, onPlayAgain }: Props) {
  const sorted = [...finalScores].sort((a, b) => b.score - a.score);
  const winner = sorted[0];

  const [hof, setHof] = useState<HofEntry[] | null>(null);
  const [hofError, setHofError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/leaderboard`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as { leaderboard: HofEntry[] };
        if (!cancelled) setHof(data.leaderboard);
      } catch (err) {
        if (!cancelled) setHofError(err instanceof Error ? err.message : 'failed');
      }
    };
    const t = window.setTimeout(load, 600);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, []);

  return (
    <div className={styles.wrap}>
      <div className={styles.card}>
        <div>
          <h1 className={styles.title}>Game Over</h1>
          <p className={styles.subtitle}>Final results</p>
        </div>

        {winner && (
          <div className={styles.winner}>
            <div className={styles.winnerLabel}>Winner</div>
            <div className={styles.winnerName}>{winner.name}</div>
            <div className={styles.winnerScore}>{winner.score} pts</div>
          </div>
        )}

        <ul className={styles.list}>
          {sorted.map((s, i) => (
            <li
              key={s.id}
              className={`${styles.row} ${s.id === playerId ? styles.rowMe : ''}`}
            >
              <span className={`${styles.rank} ${i === 0 ? styles.rank1 : ''}`}>#{i + 1}</span>
              <span>{s.name}</span>
              <span className={styles.score}>{s.score}</span>
            </li>
          ))}
        </ul>

        <div className={styles.hofWrap}>
          <div className={styles.hofTitle}>Hall of Fame</div>
          {hof === null && !hofError && (
            <div className={styles.hofLoading}>Loading...</div>
          )}
          {hofError && (
            <div className={styles.hofEmpty}>Could not load leaderboard.</div>
          )}
          {hof && hof.length === 0 && (
            <div className={styles.hofEmpty}>No games recorded yet.</div>
          )}
          {hof && hof.length > 0 && (
            <ul className={styles.hofList}>
              {hof.map((h, i) => (
                <li key={`${h.room_code}-${h.name}-${i}`} className={styles.hofRow}>
                  <span className={styles.rank}>#{i + 1}</span>
                  <span>{h.name}</span>
                  <span className={styles.hofCode}>{h.room_code}</span>
                  <span className={styles.hofScore}>{h.score}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <button className={styles.btn} onClick={onPlayAgain}>
          Play Again
        </button>
      </div>
    </div>
  );
}
