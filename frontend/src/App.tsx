import React from 'react';
import { useWebSocket } from './hooks/useWebSocket';
import LivePairsTable from './components/LivePairsTable';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useConfig } from 'wagmi';

export default function App() {
  const { address, isConnected, chainId } = useAccount();
  const config = useConfig();
  useWebSocket(isConnected);

  const shortAddress = address
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : '';
  const chainName = config.chains.find((c) => c.id === chainId)?.name;

  return (
    <div>
      <header style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <ConnectButton chainStatus="icon" showBalance={false} />
        {isConnected && (
          <div>
            <span>{shortAddress}</span>
            {chainName && <span className="chain-badge">{chainName}</span>}
          </div>
        )}
      </header>
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
