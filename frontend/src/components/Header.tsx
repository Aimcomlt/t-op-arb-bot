import React from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useConfig } from 'wagmi';

export default function Header() {
  const { address, isConnected, chainId } = useAccount();
  const config = useConfig();

  const shortAddress = address ? `${address.slice(0, 6)}...${address.slice(-4)}` : '';
  const chainName = config.chains.find((c) => c.id === chainId)?.name;

  return (
    <header style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
      <ConnectButton chainStatus="icon" showBalance={false} />
      {isConnected && (
        <div>
          <span>{shortAddress}</span>
          {chainName && <span className="chain-badge">{chainName}</span>}
        </div>
      )}
    </header>
  );
}
