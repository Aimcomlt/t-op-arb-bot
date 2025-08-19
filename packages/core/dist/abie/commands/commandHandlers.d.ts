import { WebSocket } from 'ws';
type ABIECommand = 'adjust_slippage' | 'enable_debug_mode' | 'fetch_status' | 'clear_cache';
/**
 * Central command execution router.
 * Maps incoming ABIE command types to their logic handlers.
 */
export declare const handleCommand: (type: ABIECommand, data: any, ws: WebSocket) => Promise<void>;
export {};
//# sourceMappingURL=commandHandlers.d.ts.map