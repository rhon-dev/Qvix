import { useCallback, useEffect, useRef, useState } from 'react';
import type { ClientMessageType, ConnectionStatus, ServerMessage } from '../types';

const RECONNECT_DELAY_MS = 1500;
const DEFAULT_WS_URL = 'ws://localhost:4000';

export const WS_URL: string = import.meta.env.VITE_WS_URL || DEFAULT_WS_URL;

export function useWebSocket(url: string = WS_URL) {
  const [lastMessage, setLastMessage] = useState<ServerMessage | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>('connecting');
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);
  const closedByUserRef = useRef(false);

  const connect = useCallback(() => {
    setStatus('connecting');
    const ws = new WebSocket(url);
    socketRef.current = ws;

    ws.onopen = () => setStatus('open');
    ws.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data) as ServerMessage;
        setLastMessage(parsed);
      } catch {
        // ignore non-JSON
      }
    };
    ws.onclose = () => {
      setStatus('closed');
      socketRef.current = null;
      if (closedByUserRef.current) return;
      if (reconnectTimerRef.current) window.clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = window.setTimeout(connect, RECONNECT_DELAY_MS);
    };
    ws.onerror = () => {
      ws.close();
    };
  }, [url]);

  useEffect(() => {
    closedByUserRef.current = false;
    connect();
    return () => {
      closedByUserRef.current = true;
      if (reconnectTimerRef.current) window.clearTimeout(reconnectTimerRef.current);
      socketRef.current?.close();
    };
  }, [connect]);

  const sendMessage = useCallback(
    (type: ClientMessageType, payload: Record<string, unknown>) => {
      const ws = socketRef.current;
      if (!ws || ws.readyState !== WebSocket.OPEN) return false;
      ws.send(JSON.stringify({ type, payload }));
      return true;
    },
    [],
  );

  return { lastMessage, sendMessage, status };
}
