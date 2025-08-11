import { useEffect } from 'react';
import { tokenMetaUpdateSchema } from '../../../packages/types/src';
import { useArbStore } from '../useArbStore';

export function useWebSocket() {
  const addPair = useArbStore((s) => s.addPair);
  const setStatus = useArbStore((s) => s.setStatus);

  useEffect(() => {
    const url = import.meta.env.VITE_WS_URL;
    const ws = new WebSocket(url);

    ws.onopen = () => setStatus('connected');
    ws.onclose = () => setStatus('disconnected');
    ws.onerror = () => setStatus('disconnected');

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const parsed = tokenMetaUpdateSchema.parse(data);
        addPair({ ...parsed.payload, at: parsed.at });
      } catch (err) {
        console.error('Invalid message', err);
      }
    };

    return () => {
      ws.close();
    };
  }, [addPair, setStatus]);
}
