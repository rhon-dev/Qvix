import { useState } from 'react';
import type { ConnectionStatus } from '../types';
import styles from './Home.module.css';

interface Props {
  status: ConnectionStatus;
  error: string | null;
  onCreate: (playerName: string) => void;
  onJoin: (playerName: string, roomCode: string) => void;
}

export default function Home({ status, error, onCreate, onJoin }: Props) {
  const [playerName, setPlayerName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [mode, setMode] = useState<'choice' | 'join'>('choice');

  const nameReady = playerName.trim().length > 0;
  const codeReady = roomCode.trim().length === 6;
  const canSend = status === 'open';

  const handleCreate = () => {
    if (!nameReady || !canSend) return;
    onCreate(playerName.trim());
  };

  const handleJoin = () => {
    if (!nameReady || !codeReady || !canSend) return;
    onJoin(playerName.trim(), roomCode.trim().toUpperCase());
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
            placeholder="Player name"
            maxLength={20}
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
                placeholder="ABC123"
                maxLength={6}
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
