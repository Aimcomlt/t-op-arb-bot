import React from 'react';
import { useWebSocket } from './hooks/useWebSocket';
import LivePairsTable from './components/LivePairsTable';
import Header from './components/Header';
import NotificationArea from './components/NotificationArea';
import { useAccount } from 'wagmi';

export default function App() {
  const { isConnected } = useAccount();
  useWebSocket(isConnected);

  return (
    <div>
      <Header />
      <NotificationArea />
      {isConnected ? (
        <div>
          <h1>Frontend</h1>
          <LivePairsTable />
        </div>
      ) : (
        <p>Please connect your wallet to use simulation features.</p>
      )}
    </div>
  );
}
