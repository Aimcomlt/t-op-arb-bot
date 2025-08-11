import { WebSocketServer } from 'ws';

declare global {
  var wss: WebSocketServer | undefined;
}

export {};

