// src/abie/commands/commandRouter.ts

import WebSocket from 'ws';
import { handleCommand } from './commandHandlers';

/**
 * Attach command-handling behavior to a WebSocket connection.
 * Enables ABIE to respond to frontend or admin dashboard inputs.
 * 
 * @param ws - The WebSocket connection to bind command handling to
 */
export function attachCommandRouter(ws: WebSocket): void {
  ws.on('message', (data) => {
    try {
      const parsed = JSON.parse(data.toString());

      if (!parsed?.type || !parsed?.data) {
        console.warn('[ABIE] Received malformed command:', data.toString());
        return;
      }

      handleCommand(parsed.type, parsed.data, ws);
    } catch (err) {
      console.error('[ABIE] Error parsing command input:', err);
    }
  });
}
