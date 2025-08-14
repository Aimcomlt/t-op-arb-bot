// Ambient global types for runtime singletons
// Adjust types to your actual WebSocket server/client implementations.

export {};

type WsLike = { clients?: Set<unknown> } | undefined;

declare global {
  /**
   * Global WS server/client handle used by command handlers.
   * Prefer a typed singleton module; this is a minimal unblock for builds that reference `globalThis.wss`.
   */
  // eslint-disable-next-line no-var
  var wss: WsLike;
}

/**
 * Ensure this file is included by tsconfig.json (include src/**).
 */
