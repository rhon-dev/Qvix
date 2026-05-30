import { useEffect, useState } from 'react';
import { useWebSocket } from './hooks/useWebSocket';
import Home from './screens/Home';
import Lobby from './screens/Lobby';
import Game from './screens/Game';
import Results from './screens/Results';
import End from './screens/End';
import type { PublicPlayer, ScoreEntry, ServerMessage } from './types';
import './styles/global.css';

type Phase = 'home' | 'lobby' | 'question' | 'results' | 'end';

interface QuestionState {
  index: number;
  total: number;
  question: string;
  options: string[];
  timeLimit: number;
  startedAt: number;
}

interface RoundResultState {
  correctAnswer: string;
  scores: ScoreEntry[];
}

export default function App() {
  const { lastMessage, sendMessage, status } = useWebSocket();

  const [phase, setPhase] = useState<Phase>('home');
  const [error, setError] = useState<string | null>(null);

  const [playerId, setPlayerId] = useState<string | null>(null);
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [players, setPlayers] = useState<PublicPlayer[]>([]);
  const [isHost, setIsHost] = useState(false);

  const [question, setQuestion] = useState<QuestionState | null>(null);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [liveScores, setLiveScores] = useState<ScoreEntry[]>([]);
  const [previousScores, setPreviousScores] = useState<Record<string, number>>({});

  const [roundResult, setRoundResult] = useState<RoundResultState | null>(null);
  const [finalScores, setFinalScores] = useState<ScoreEntry[]>([]);

  useEffect(() => {
    if (!lastMessage) return;
    handleMessage(lastMessage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastMessage]);

  function handleMessage(msg: ServerMessage) {
    switch (msg.type) {
      case 'ROOM_CREATED': {
        setRoomCode(msg.payload.roomCode);
        setPlayerId(msg.payload.playerId);
        setIsHost(true);
        setError(null);
        setPhase('lobby');
        return;
      }
      case 'ROOM_JOINED': {
        setRoomCode(msg.payload.roomCode);
        setPlayerId(msg.payload.playerId);
        setPlayers(msg.payload.players);
        setIsHost(false);
        setError(null);
        setPhase('lobby');
        return;
      }
      case 'PLAYER_JOINED': {
        setPlayers(msg.payload.players);
        return;
      }
      case 'GAME_STARTED': {
        setLiveScores(players.map((p) => ({ id: p.id, name: p.name, score: 0 })));
        setPreviousScores({});
        return;
      }
      case 'QUESTION': {
        setQuestion({
          index: msg.payload.index,
          total: msg.payload.total,
          question: msg.payload.question,
          options: msg.payload.options,
          timeLimit: msg.payload.timeLimit,
          startedAt: Date.now(),
        });
        setHasAnswered(false);
        setRoundResult(null);
        setPhase('question');
        return;
      }
      case 'ROUND_RESULT': {
        const prevMap: Record<string, number> = {};
        for (const s of liveScores) prevMap[s.id] = s.score;
        setPreviousScores(prevMap);
        setLiveScores(msg.payload.scores);
        setRoundResult({
          correctAnswer: msg.payload.correctAnswer,
          scores: msg.payload.scores,
        });
        setPhase('results');
        return;
      }
      case 'GAME_OVER': {
        setFinalScores(msg.payload.finalScores);
        setPhase('end');
        return;
      }
      case 'ERROR': {
        setError(msg.payload.message);
        return;
      }
    }
  }

  const handleCreate = (playerName: string) => {
    setError(null);
    sendMessage('CREATE_ROOM', { playerName });
    setPlayers([{ id: 'pending', name: playerName, score: 0, isHost: true }]);
  };

  const handleJoin = (playerName: string, code: string) => {
    setError(null);
    sendMessage('JOIN_ROOM', { roomCode: code, playerName });
  };

  const handleStart = () => {
    if (!roomCode) return;
    sendMessage('START_GAME', { roomCode });
  };

  const handleAnswer = (answer: string, timeMs: number) => {
    if (!playerId || hasAnswered) return;
    sendMessage('SUBMIT_ANSWER', { playerId, answer, timeMs });
    setHasAnswered(true);
  };

  const handlePlayAgain = () => {
    setPhase('home');
    setRoomCode(null);
    setPlayerId(null);
    setPlayers([]);
    setIsHost(false);
    setQuestion(null);
    setHasAnswered(false);
    setLiveScores([]);
    setPreviousScores({});
    setRoundResult(null);
    setFinalScores([]);
    setError(null);
  };

  if (phase === 'home') {
    return <Home status={status} error={error} onCreate={handleCreate} onJoin={handleJoin} />;
  }
  if (phase === 'lobby' && roomCode) {
    const displayPlayers = players.length > 0
      ? players
      : playerId
        ? [{ id: playerId, name: 'You', score: 0, isHost }]
        : [];
    return (
      <Lobby
        roomCode={roomCode}
        players={displayPlayers}
        isHost={isHost}
        onStart={handleStart}
      />
    );
  }
  if (phase === 'question' && question) {
    const scoresForSidebar = liveScores.length > 0
      ? liveScores
      : players.map((p) => ({ id: p.id, name: p.name, score: p.score }));
    return (
      <Game
        index={question.index}
        total={question.total}
        question={question.question}
        options={question.options}
        timeLimit={question.timeLimit}
        startedAt={question.startedAt}
        scores={scoresForSidebar}
        playerId={playerId}
        hasAnswered={hasAnswered}
        onAnswer={handleAnswer}
      />
    );
  }
  if (phase === 'results' && roundResult) {
    return (
      <Results
        correctAnswer={roundResult.correctAnswer}
        scores={roundResult.scores}
        previousScores={previousScores}
        playerId={playerId}
      />
    );
  }
  if (phase === 'end') {
    return <End finalScores={finalScores} playerId={playerId} onPlayAgain={handlePlayAgain} />;
  }

  return <Home status={status} error={error} onCreate={handleCreate} onJoin={handleJoin} />;
}
