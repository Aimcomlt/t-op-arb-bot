# T-OP-Arb-Bot
A modular, optimized arbitrage engine focused on backend precision and future-ready architecture.

# T-OP-Arb-Bot — Turbo-Optimized Arbitrage Bot

**Real-time, modular DeFi arbitrage detection and execution system**  
Powered by the ABIE Core (Arbitrage Bot Intelligent Engine)

---

## 🚀 Overview

T-OP-Arb-Bot is a TypeScript-based, event-driven backend built to scan for profitable arbitrage opportunities across decentralized exchanges like **Uniswap** and **Sushiswap**. It features real-time Sync event listeners, ABI-independent transaction simulation, slippage-aware strategy building, and Flashbots-secure trade execution.
It now includes a Solidity `ArbExecutor` contract leveraging Aave V3 flash loans and V2 router swaps for on-chain arbitrage experiments.

---

## 🧠 ABIE — Arbitrage Bot Intelligent Engine

**ABIE** is the broadcast and decision-making core of the system — the "eyes" of the bot. It detects DeFi behaviors, formulates them into actionable strategies, and broadcasts results to the frontend or command listeners.

### ABIE Features:
- WebSocket broadcast of opportunities, execution results, and system logs
- Command intake from frontend/admin dashboard (e.g., adjust slippage in real-time)
- Modular event handlers for post-sync, post-trade, and discrepancy analysis

---

## ⚙️ Project Structure

```plaintext
/src
  ├── abie/                    # ABIE Broadcast Layer (WebSocket, command router)
  ├── core/                    # Core logic (strategy builder, scanner, simulator)
  ├── hooks/                   # Post-sync and post-trade orchestration
  ├── tracing/                 # SyncTrace builders and transaction decoders
  ├── abi-cache/               # Preloaded router + pair ABIs (Uniswap/Sushiswap)
  ├── types/                   # Shared TypeScript interfaces
  ├── utils/                   # Generic tools (slippage calc, profit guard, etc.)
  └── config/                  # Slippage, gas, and execution parameters

/frontend
  ├── src/hooks/useABIE.ts     # Frontend WebSocket listener hook
  ├── src/store/abieSlice.ts   # Redux slice for real-time strategy/event updates
```

## 🔧 Local Fork Simulation

1. Copy `.env.example` to `.env` and fill `RPC_ARCHIVE` with an archive node URL and `FORK_BLOCK_NUMBER` with a recent block.
2. Start the fork and deploy `ArbExecutor`:
   ```sh
   ./scripts/start-fork.sh
   ```
3. Run the backend against the local fork:
   ```sh
   RPC_HTTP_URL=http://127.0.0.1:8545 \
   RPC_WSS_URL=ws://127.0.0.1:8545 \
   pnpm --filter backend dev
   ```
