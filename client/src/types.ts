export interface PublicPlayer {
  id: string;
  name: string;
  score: number;
  isHost: boolean;
}

export interface ScoreEntry {
  id: string;
  name: string;
  score: number;
}

export type ServerMessage =
  | { type: 'ROOM_CREATED'; payload: { roomCode: string; playerId: string } }
  | { type: 'ROOM_JOINED'; payload: { roomCode: string; players: PublicPlayer[]; playerId: string } }
  | { type: 'PLAYER_JOINED'; payload: { player: PublicPlayer; players: PublicPlayer[] } }
  | { type: 'GAME_STARTED'; payload: { roomCode: string } }
  | {
      type: 'QUESTION';
      payload: {
        index: number;
        total: number;
        question: string;
        options: string[];
        timeLimit: number;
      };
    }
  | { type: 'ROUND_RESULT'; payload: { correctAnswer: string; scores: ScoreEntry[] } }
  | { type: 'GAME_OVER'; payload: { finalScores: ScoreEntry[] } }
  | { type: 'ERROR'; payload: { message: string } };

export type ClientMessageType =
  | 'CREATE_ROOM'
  | 'JOIN_ROOM'
  | 'START_GAME'
  | 'SUBMIT_ANSWER';

export type ConnectionStatus = 'connecting' | 'open' | 'closed';
