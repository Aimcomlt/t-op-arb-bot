import React from 'react';
import { useWebSocket } from './hooks/useWebSocket';
import LivePairsTable from './components/LivePairsTable';

export default function App() {
  useWebSocket();
  return (
    <div>
      <h1>Frontend</h1>
      <LivePairsTable />
    </div>
  );
}
