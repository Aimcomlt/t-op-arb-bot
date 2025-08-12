#!/usr/bin/env bash
set -euo pipefail

if [ -f .env ]; then
  set -a
  source .env
  set +a
fi

: "${RPC_ARCHIVE:?RPC_ARCHIVE is required}"
: "${FORK_BLOCK_NUMBER:?FORK_BLOCK_NUMBER is required}"

anvil --fork-url "$RPC_ARCHIVE" --fork-block-number "$FORK_BLOCK_NUMBER" >/tmp/anvil.log 2>&1 &
ANVIL_PID=$!
trap 'kill $ANVIL_PID' EXIT

echo "Anvil started at http://127.0.0.1:8545 (PID $ANVIL_PID)"
# wait a bit for anvil
sleep 3

forge script script/DeployArbExecutor.s.sol:DeployArbExecutor \
  --rpc-url http://127.0.0.1:8545 \
  --broadcast

wait $ANVIL_PID
