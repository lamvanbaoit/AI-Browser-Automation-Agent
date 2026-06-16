import { useState, useEffect, useRef, useCallback } from 'react';

const RECONNECT_DELAY_MS = 3000;

export function useWebSocket() {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState([]);
  const reconnectTimer = useRef(null);
  const destroyed = useRef(false);

  const connect = useCallback(() => {
    if (destroyed.current) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      setConnected(true);
      console.log('WebSocket connected');
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setMessages(prev => [...prev, data]);
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

    setSocket(ws);
  }, []);

  useEffect(() => {
    destroyed.current = false;
    connect();
    return () => {
      destroyed.current = true;
      clearTimeout(reconnectTimer.current);
      setSocket(ws => { ws?.close(); return null; });
    };
  }, [connect]);

  const send = useCallback((message) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(message));
    }
  }, [socket]);

  const subscribe = useCallback((taskId) => {
    send({ type: 'subscribe', task_id: taskId });
  }, [send]);

  return { connected, messages, send, subscribe };
}