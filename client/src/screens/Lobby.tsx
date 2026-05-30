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

  return (
    <div className={styles.wrap}>
      <div className={styles.card}>
        <div className={styles.codeWrap}>
          <div className={styles.codeLabel}>Room code</div>
          <div className={styles.code}>{roomCode}</div>
          <div className={styles.hint}>Share this code with friends to join.</div>
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
