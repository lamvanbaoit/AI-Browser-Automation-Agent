import { useState, useEffect, useRef, useCallback } from 'react';

const RECONNECT_DELAY_MS = 3000;

export function useWebSocket() {
  const [connected, setConnected] = useState(false);
  // Only the most recent frame is kept — each task_update is a full snapshot,
  // so there's no need to accumulate (and leak) an ever-growing array.
  const [lastMessage, setLastMessage] = useState(null);
  const wsRef = useRef(null);
  const reconnectTimer = useRef(null);
  const destroyed = useRef(false);

  const connect = useCallback(() => {
    if (destroyed.current) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      console.log('WebSocket connected');
    };

    ws.onmessage = (event) => {
      try {
        setLastMessage(JSON.parse(event.data));
      } catch (e) {
        console.warn('WS parse error:', e);
      }
    };

    ws.onclose = () => {
      setConnected(false);
      console.log('WebSocket disconnected — reconnecting in 3s...');
      if (!destroyed.current) {
        reconnectTimer.current = setTimeout(connect, RECONNECT_DELAY_MS);
      }
    };

    ws.onerror = () => {
      ws.close();
    };
  }, []);

  useEffect(() => {
    destroyed.current = false;
    connect();
    return () => {
      destroyed.current = true;
      clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [connect]);

  return { connected, lastMessage };
}
