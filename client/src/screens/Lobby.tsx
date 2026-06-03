import { useState } from 'react';
import type { PublicPlayer } from '../types';
import styles from './Lobby.module.css';

interface Props {
  roomCode: string;
  players: PublicPlayer[];
  isHost: boolean;
  onStart: () => void;
}

export default function Lobby({ roomCode, players, isHost, onStart }: Props) {
  const canStart = players.length >= 1;
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(roomCode);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard unavailable — ignore
    }
  };

  return (
    <div className={styles.wrap}>
      <div className={styles.card}>
        <div className={styles.codeWrap}>
          <div className={styles.codeLabel}>Room code</div>
          <button className={styles.code} onClick={handleCopy} title="Click to copy">
            {roomCode}
          </button>
          <div className={styles.hint}>
            {copied ? 'Copied to clipboard!' : 'Click the code to copy, then share it with friends.'}
          </div>
        </div>

        <div className={styles.playersWrap}>
          <div className={styles.playersLabel}>
            <span>Players</span>
            <span className={styles.count}>{players.length}</span>
          </div>
          <ul className={styles.players}>
            {players.map((p) => (
              <li key={p.id} className={styles.player}>
                <span className={styles.playerName}>
                  <span className={styles.dot} />
                  {p.name}
                </span>
                {p.isHost && <span className={styles.hostBadge}>Host</span>}
              </li>
            ))}
          </ul>
        </div>

        {isHost ? (
          <button
            className={styles.startBtn}
            onClick={onStart}
            disabled={!canStart}
          >
            Start Game
          </button>
        ) : (
          <div className={styles.waiting}>Waiting for host to start...</div>
        )}
      </div>
    </div>
  );
}
