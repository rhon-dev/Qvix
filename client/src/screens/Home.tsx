import { useState } from 'react';
import type { ConnectionStatus } from '../types';
import styles from './Home.module.css';

interface Props {
  status: ConnectionStatus;
  error: string | null;
  onCreate: (playerName: string) => void;
  onJoin: (playerName: string, roomCode: string) => void;
}

const NAME_KEY = 'knowdown.playerName';

export default function Home({ status, error, onCreate, onJoin }: Props) {
  const [playerName, setPlayerName] = useState(() => {
    try {
      return localStorage.getItem(NAME_KEY) ?? '';
    } catch {
      return '';
    }
  });
  const [roomCode, setRoomCode] = useState('');
  const [mode, setMode] = useState<'choice' | 'join'>('choice');

  const nameReady = playerName.trim().length > 0;
  const codeReady = roomCode.trim().length === 6;
  const canSend = status === 'open';

  const rememberName = (name: string) => {
    try {
      localStorage.setItem(NAME_KEY, name);
    } catch {
      // ignore storage failures (private mode, etc.)
    }
  };

  const handleCreate = () => {
    if (!nameReady || !canSend) return;
    const name = playerName.trim();
    rememberName(name);
    onCreate(name);
  };

  const handleJoin = () => {
    if (!nameReady || !codeReady || !canSend) return;
    const name = playerName.trim();
    rememberName(name);
    onJoin(name, roomCode.trim().toUpperCase());
  };

  return (
    <div className={styles.wrap}>
      <div className={styles.card}>
        <div>
          <h1 className={styles.title}>Knowdown</h1>
          <p className={styles.subtitle}>Real-time trivia showdown.</p>
        </div>

        <div>
          <label className={styles.label} htmlFor="name">Your name</label>
          <input
            id="name"
            className={styles.input}
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key !== 'Enter') return;
              if (mode === 'join') handleJoin();
              else handleCreate();
            }}
            placeholder="Player name"
            maxLength={24}
            autoFocus
          />
        </div>

        {mode === 'choice' && (
          <div className={styles.buttons}>
            <button
              className={styles.btnPrimary}
              onClick={handleCreate}
              disabled={!nameReady || !canSend}
            >
              Create Room
            </button>
            <button
              className={styles.btnSecondary}
              onClick={() => setMode('join')}
              disabled={!nameReady}
            >
              Join Room
            </button>
          </div>
        )}

        {mode === 'join' && (
          <>
            <div>
              <label className={styles.label} htmlFor="code">Room code</label>
              <input
                id="code"
                className={`${styles.input} ${styles.codeInput}`}
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase().slice(0, 6))}
                onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
                placeholder="ABC123"
                maxLength={6}
                autoFocus
              />
            </div>
            <div className={styles.row}>
              <button
                className={styles.btnSecondary}
                onClick={() => { setMode('choice'); setRoomCode(''); }}
              >
                Back
              </button>
              <button
                className={styles.btnPrimary}
                onClick={handleJoin}
                disabled={!nameReady || !codeReady || !canSend}
              >
                Join
              </button>
            </div>
          </>
        )}

        {error && <div className={styles.error}>{error}</div>}

        <div className={`${styles.status} ${status === 'open' ? styles.statusOk : ''}`}>
          {status === 'open' ? 'Connected' : status === 'connecting' ? 'Connecting...' : 'Reconnecting...'}
        </div>
      </div>
    </div>
  );
}
