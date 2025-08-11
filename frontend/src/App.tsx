import React from 'react';
import { useWebSocket } from './hooks/useWebSocket';
import { useArbStore } from './useArbStore';

export default function App() {
  useWebSocket();
  const status = useArbStore((s) => s.status);
  return (
    <div>
      <h1>Frontend</h1>
      <p>Status: {status}</p>
    </div>
  );
}
