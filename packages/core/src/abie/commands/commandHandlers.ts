// src/abie/commands/commandHandlers.ts

import WebSocket from 'ws';
import { updateSlippageTolerance } from '../../config/arbitrageConfig';
import { emitSystemLog } from '../broadcaster/broadcastHooks';

type ABIECommand =
  | 'adjust_slippage'
  | 'enable_debug_mode'
  | 'fetch_status'
  | 'clear_cache';

interface CommandHandler {
  (data: any, ws: WebSocket): void | Promise<void>;
}

/**
 * Central command execution router.
 * Maps incoming ABIE command types to their logic handlers.
 */
export const handleCommand = async (
  type: ABIECommand,
  data: any,
  ws: WebSocket
) => {
  const handler = COMMAND_REGISTRY[type];
  if (!handler) {
    emitSystemLog({
      message: `Unrecognized command: ${type}`,
      level: 'warn'
    });
    return;
  }

  await handler(data, ws);
};

/**
 * Registered ABIE command functions.
 * Extend this as new controls become available.
 */
const COMMAND_REGISTRY: Record<ABIECommand, CommandHandler> = {
  adjust_slippage: (data, ws) => {
    const { pairSymbol, newTolerance } = data;
    updateSlippageTolerance(pairSymbol, newTolerance);

    emitSystemLog({
      message: `Slippage for ${pairSymbol} updated to ${newTolerance} bps`,
      level: 'info'
    });
  },

  enable_debug_mode: (_data, _ws) => {
    process.env.DEBUG_MODE = 'true';
    emitSystemLog({
      message: `ABIE debug mode enabled.`,
      level: 'info'
    });
  },

  fetch_status: (_data, ws) => {
    const status = {
      uptime: process.uptime(),
      connectedClients: WebSocketServerSnapshot(),
      debug: process.env.DEBUG_MODE === 'true'
    };

    ws.send(
      JSON.stringify({
        type: 'status_report',
        data: status
      })
    );
  },

  clear_cache: (_data, _ws) => {
    // Hook into cache-clearing utilities if needed
    emitSystemLog({
      message: 'Cache cleared manually.',
      level: 'warn'
    });
  }
};

/**
 * Utility snapshot for reporting how many clients are connected.
 */
function WebSocketServerSnapshot() {
  return {
    time: Date.now(),
    connected: globalThis['wss']?.clients?.size ?? 'unknown'
  };
}
