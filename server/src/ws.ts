import { randomBytes, randomUUID } from 'crypto';
import type { Server as HttpServer } from 'http';
import { WebSocket, WebSocketServer } from 'ws';
import { startGame } from './gameEngine';
import type { Question } from './questions';

type RoomStatus = 'waiting' | 'active' | 'ended';

interface Player {
  id: string;
  name: string;
  score: number;
  streak: number;
  isHost: boolean;
  socket: WebSocket;
}

export interface Room {
  code: string;
  hostId: string;
  status: RoomStatus;
  currentQuestion: number;
  players: Player[];
  questions?: Question[];
  handleAnswer?: (playerId: string, answer: string, timeMs: number) => void;
  onPlayerLeft?: () => void;
}

interface PublicPlayer {
  id: string;
  name: string;
  score: number;
  isHost: boolean;
}

// ---- Incoming message shapes ----
interface CreateRoomMsg {
  type: 'CREATE_ROOM';
  payload: { playerName: string };
}

interface JoinRoomMsg {
  type: 'JOIN_ROOM';
  payload: { roomCode: string; playerName: string };
}

interface StartGameMsg {
  type: 'START_GAME';
  payload: { roomCode: string };
}

interface SubmitAnswerMsg {
  type: 'SUBMIT_ANSWER';
  payload: { playerId: string; answer: string; timeMs: number };
}

type ClientMessage = CreateRoomMsg | JoinRoomMsg | StartGameMsg | SubmitAnswerMsg;

// ---- Outgoing message shapes ----
interface RoomCreatedMsg {
  type: 'ROOM_CREATED';
  payload: { roomCode: string; playerId: string };
}

interface RoomJoinedMsg {
  type: 'ROOM_JOINED';
  payload: { roomCode: string; players: PublicPlayer[]; playerId: string };
}

interface PlayerJoinedMsg {
  type: 'PLAYER_JOINED';
  payload: { player: PublicPlayer; players: PublicPlayer[] };
}

interface PlayerLeftMsg {
  type: 'PLAYER_LEFT';
  payload: { playerId: string; players: PublicPlayer[] };
}

interface GameStartedMsg {
  type: 'GAME_STARTED';
  payload: { roomCode: string };
}

interface ErrorMsg {
  type: 'ERROR';
  payload: { message: string };
}

interface ScoreEntry {
  id: string;
  name: string;
  score: number;
}

interface QuestionMsg {
  type: 'QUESTION';
  payload: {
    index: number;
    total: number;
    question: string;
    category: string;
    options: string[];
    timeLimit: number;
  };
}

interface RoundResultMsg {
  type: 'ROUND_RESULT';
  payload: { correctAnswer: string; scores: ScoreEntry[] };
}

interface GameOverMsg {
  type: 'GAME_OVER';
  payload: { finalScores: ScoreEntry[] };
}

export type ServerMessage =
  | RoomCreatedMsg
  | RoomJoinedMsg
  | PlayerJoinedMsg
  | PlayerLeftMsg
  | GameStartedMsg
  | ErrorMsg
  | QuestionMsg
  | RoundResultMsg
  | GameOverMsg;

interface SocketState {
  isAlive: boolean;
  playerId?: string;
  roomCode?: string;
}

const HEARTBEAT_INTERVAL_MS = 30_000;
const ROOM_CODE_LENGTH = 6;
const MAX_NAME_LENGTH = 24;
const MAX_PLAYERS_PER_ROOM = Number(process.env.MAX_PLAYERS_PER_ROOM) || 12;
const MAX_ROOMS = Number(process.env.MAX_ROOMS) || 1000;

const rooms = new Map<string, Room>();
const sockets = new WeakMap<WebSocket, SocketState>();

function generateRoomCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  do {
    code = '';
    const bytes = randomBytes(ROOM_CODE_LENGTH);
    for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
      code += alphabet[bytes[i] % alphabet.length];
    }
  } while (rooms.has(code));
  return code;
}

/** Strip control characters, collapse whitespace, and cap length. */
export function sanitizeName(raw: unknown): string {
  if (typeof raw !== "string") return "";
  let out = "";
  for (const ch of raw) {
    const code = ch.codePointAt(0) ?? 0;
    // Drop C0 control chars (0x00-0x1F) and DEL (0x7F).
    if (code < 0x20 || code === 0x7f) continue;
    out += ch;
  }
  return out.replace(/\s+/g, " ").trim().slice(0, MAX_NAME_LENGTH);
}

function toPublicPlayer(p: Player): PublicPlayer {
  return { id: p.id, name: p.name, score: p.score, isHost: p.isHost };
}

function send(socket: WebSocket, msg: ServerMessage): void {
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(msg));
  }
}

function broadcast(room: Room, msg: ServerMessage, exclude?: WebSocket): void {
  const data = JSON.stringify(msg);
  for (const player of room.players) {
    if (player.socket === exclude) continue;
    if (player.socket.readyState === WebSocket.OPEN) {
      player.socket.send(data);
    }
  }
}

function sendError(socket: WebSocket, message: string): void {
  send(socket, { type: 'ERROR', payload: { message } });
}

function handleCreateRoom(socket: WebSocket, payload: CreateRoomMsg['payload']): void {
  const name = sanitizeName(payload?.playerName);
  if (!name) return sendError(socket, 'playerName required');
  if (rooms.size >= MAX_ROOMS) return sendError(socket, 'Server is at capacity, try again later');

  const code = generateRoomCode();
  const playerId = randomUUID();
  const player: Player = {
    id: playerId,
    name,
    score: 0,
    streak: 0,
    isHost: true,
    socket,
  };
  const room: Room = {
    code,
    hostId: playerId,
    status: 'waiting',
    currentQuestion: 0,
    players: [player],
  };
  rooms.set(code, room);

  const state = sockets.get(socket);
  if (state) {
    state.playerId = playerId;
    state.roomCode = code;
  }

  send(socket, {
    type: 'ROOM_CREATED',
    payload: { roomCode: code, playerId },
  });
}

function handleJoinRoom(socket: WebSocket, payload: JoinRoomMsg['payload']): void {
  const code = payload?.roomCode?.trim().toUpperCase();
  const name = sanitizeName(payload?.playerName);
  if (!code || !name) return sendError(socket, 'roomCode and playerName required');

  const room = rooms.get(code);
  if (!room) return sendError(socket, 'Room not found');
  if (room.status !== 'waiting') return sendError(socket, 'Room not accepting players');
  if (room.players.length >= MAX_PLAYERS_PER_ROOM) return sendError(socket, 'Room is full');

  const playerId = randomUUID();
  const player: Player = {
    id: playerId,
    name,
    score: 0,
    streak: 0,
    isHost: false,
    socket,
  };
  room.players.push(player);

  const state = sockets.get(socket);
  if (state) {
    state.playerId = playerId;
    state.roomCode = code;
  }

  const publicPlayers = room.players.map(toPublicPlayer);
  send(socket, {
    type: 'ROOM_JOINED',
    payload: { roomCode: code, players: publicPlayers, playerId },
  });
  broadcast(
    room,
    {
      type: 'PLAYER_JOINED',
      payload: { player: toPublicPlayer(player), players: publicPlayers },
    },
    socket,
  );
}

function handleStartGame(socket: WebSocket, payload: StartGameMsg['payload']): void {
  const code = payload?.roomCode?.trim().toUpperCase();
  if (!code) return sendError(socket, 'roomCode required');

  const room = rooms.get(code);
  if (!room) return sendError(socket, 'Room not found');

  const state = sockets.get(socket);
  if (!state?.playerId || state.playerId !== room.hostId) {
    return sendError(socket, 'Only the host can start the game');
  }
  if (room.status !== 'waiting') return sendError(socket, 'Game already started');
  if (room.players.length === 0) return sendError(socket, 'Need at least one player');

  room.status = 'active';
  room.currentQuestion = 0;
  broadcast(room, { type: 'GAME_STARTED', payload: { roomCode: code } });
  startGame(room, (msg) => broadcast(room, msg));
}

function handleSubmitAnswer(socket: WebSocket, payload: SubmitAnswerMsg['payload']): void {
  const state = sockets.get(socket);
  if (!state?.roomCode || !state.playerId) return sendError(socket, 'Not in a room');
  if (state.playerId !== payload?.playerId) return sendError(socket, 'playerId mismatch');

  const room = rooms.get(state.roomCode);
  if (!room) return sendError(socket, 'Room not found');
  if (room.status !== 'active' || !room.handleAnswer) {
    return sendError(socket, 'No active question');
  }
  if (typeof payload.answer !== 'string' || typeof payload.timeMs !== 'number') {
    return sendError(socket, 'Invalid answer payload');
  }
  if (!Number.isFinite(payload.timeMs) || payload.timeMs < 0) {
    return sendError(socket, 'Invalid answer payload');
  }
  room.handleAnswer(state.playerId, payload.answer, payload.timeMs);
}

function handleDisconnect(socket: WebSocket): void {
  const state = sockets.get(socket);
  if (!state?.roomCode || !state.playerId) return;
  const room = rooms.get(state.roomCode);
  if (!room) return;
  const leavingId = state.playerId;

  room.players = room.players.filter((p) => p.id !== leavingId);
  if (room.players.length === 0) {
    room.onPlayerLeft?.();
    rooms.delete(room.code);
    return;
  }
  if (leavingId === room.hostId) {
    room.players[0].isHost = true;
    room.hostId = room.players[0].id;
  }
  broadcast(room, {
    type: 'PLAYER_LEFT',
    payload: { playerId: leavingId, players: room.players.map(toPublicPlayer) },
  });
  // An in-progress question may now be complete (everyone remaining answered).
  room.onPlayerLeft?.();
}

function parseMessage(raw: string): ClientMessage | null {
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.type === 'string') return parsed as ClientMessage;
    return null;
  } catch {
    return null;
  }
}

export function attachWebSocketServer(httpServer: HttpServer): WebSocketServer {
  const wss = new WebSocketServer({ server: httpServer });

  wss.on('connection', (socket: WebSocket) => {
    sockets.set(socket, { isAlive: true });

    socket.on('pong', () => {
      const state = sockets.get(socket);
      if (state) state.isAlive = true;
    });

    socket.on('message', (data) => {
      const msg = parseMessage(data.toString());
      if (!msg) return sendError(socket, 'Invalid message');

      switch (msg.type) {
        case 'CREATE_ROOM':
          return handleCreateRoom(socket, msg.payload);
        case 'JOIN_ROOM':
          return handleJoinRoom(socket, msg.payload);
        case 'START_GAME':
          return handleStartGame(socket, msg.payload);
        case 'SUBMIT_ANSWER':
          return handleSubmitAnswer(socket, msg.payload);
        default:
          return sendError(socket, `Unknown message type`);
      }
    });

    socket.on('close', () => handleDisconnect(socket));
    socket.on('error', () => handleDisconnect(socket));
  });

  const interval = setInterval(() => {
    for (const client of wss.clients) {
      const state = sockets.get(client);
      if (!state) {
        client.terminate();
        continue;
      }
      if (!state.isAlive) {
        client.terminate();
        continue;
      }
      state.isAlive = false;
      client.ping();
    }
  }, HEARTBEAT_INTERVAL_MS);

  wss.on('close', () => clearInterval(interval));

  return wss;
}

/** Current number of live rooms — exposed for the /health endpoint. */
export function roomCount(): number {
  return rooms.size;
}
