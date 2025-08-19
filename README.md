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
2. Install the frontend wallet dependencies (only needed once):
   ```sh
   pnpm --filter frontend add wagmi @rainbow-me/rainbowkit viem @tanstack/react-query
   ```
3. Start the fork and deploy `ArbExecutor`:
   ```sh
   ./scripts/start-fork.sh
   ```
4. Run the backend against the local fork:
   ```sh
   RPC_HTTP_URL=http://127.0.0.1:8545 \
   RPC_WSS_URL=ws://127.0.0.1:8545 \
   pnpm --filter backend dev
   ```
5. Start the frontend and connect your wallet via RainbowKit:
   ```sh
   pnpm --filter frontend dev
   ```
   Navigate to http://localhost:5173 and click **Connect Wallet**.

## ⚙️ Environment Variables

| Key | Description | Default |
| --- | ----------- | ------- |
| `WS_AUTH_TOKEN` | Shared secret for WebSocket auth; send via subprotocol or `Authorization` header. | – |
| `FRONTEND_ORIGINS` | Comma-separated list of allowed `Origin` values for WebSocket upgrades. | (allow all) |
| `WS_PORT` | Port for the backend WebSocket server. | `8081` |
| `RPC_HTTP_URL` | HTTP endpoint for the target chain. | – |
| `RPC_WSS_URL` | WebSocket endpoint for the target chain. | – |

## 🔌 WebSocket Access

### Connecting with `wscat`

```bash
# Using subprotocol
npx wscat -c ws://localhost:8081 -o http://localhost:5173 -s "token:MY_TOKEN"

# Using Authorization header
npx wscat -c ws://localhost:8081 -o http://localhost:5173 -H "Authorization: Bearer MY_TOKEN"
```

### Troubleshooting

| Browser symptom | Likely cause | Fix |
| ---------------- | ----------- | --- |
| Close code `1006` | Handshake failed (blocked origin or wrong `WS_PORT`). | Ensure your origin is allowed and the server is listening on `WS_PORT`. |
| HTTP `401` | Missing or invalid `WS_AUTH_TOKEN`. | Supply the correct token via subprotocol or `Authorization` header. |

## 📡 HTTP API

### `GET /quote`

Retrieve current router quotes between two tokens:

```txt
/quote?tokenIn=<address>&tokenOut=<address>&amountIn=<wei>[&blockTag=<block>]
```

Returns Uniswap and Sushiswap amounts for the provided `amountIn`.

### `POST /simulate`

Simulate a two-hop trade and estimate profit:

```json
{
  "pair": "WETH/USDC",
  "amount": "1000000000000000000",
  "slippageBps": 100,
  "routerOrder": "uniToSushi"
}
```

The response includes the `quote`, `minOut` after applying `slippageBps`,
`priceImpactBps`, and the backend records the expected profit for guard checks.

## ⚖️ Slippage & Profit

- `slippageBps` represents the maximum price impact (in basis points) tolerated
  during simulation.
- A trade only executes when the simulated profit exceeds the configured
  `profitFloor` in `backend/src/config/guard.ts`.

## 🛡️ Security Recommendations

- **Profit floor:** tune `profitFloor` to ensure each trade meets a minimum
  return.
- **Kill switch:** set `KILL_SWITCH=true` in the backend environment to disable
  `/execute` and halt live trading when needed.

## 📈 Observability

The backend exposes Prometheus metrics on the port defined by `METRICS_PORT` (default `9108`).
Start the backend and visit `http://localhost:<METRICS_PORT>/metrics` to view
the current metrics:

```sh
METRICS_PORT=9108 pnpm --filter backend dev
```

Sample Grafana dashboards and alerting rules are provided in the `observability/`
directory. Import `observability/dashboard.json` through **Grafana → Dashboards → Import**
and load alert rules from `observability/alerts.yml` via **Alerting → Import**.

## 🚢 Release & Deployment

Pushing a git tag triggers a release pipeline that runs type checks, linting,
unit and integration tests, Foundry tests, Slither analysis, and a Docker
build with image scanning. Successful runs publish a Docker image tagged with
the pushed ref to GitHub Container Registry.

### Tagging flow

1. Create a semantic version tag:
   ```sh
   git tag v0.1.0
   git push origin v0.1.0
   ```
2. GitHub Actions builds and scans the image, then pushes
   `ghcr.io/<OWNER>/t-op-arb-bot:<tag>`.

### Deployment artifacts

- Docker image: `ghcr.io/<OWNER>/t-op-arb-bot:<tag>`
- CI logs and scan reports available in the tagged workflow run
