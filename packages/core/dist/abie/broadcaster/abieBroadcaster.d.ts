/**
 * Broadcast a typed message to all connected ABIE listeners (e.g. frontend UI, CLI tools).
 *
 * @param eventType - A short string representing the type of event (e.g., 'arb_opportunity')
 * @param payload - Any JSON-serializable object representing the event data. Number values
 *   are converted to strings before broadcast.
 */
export declare function broadcastABIEEvent(eventType: string, payload: any): void;
//# sourceMappingURL=abieBroadcaster.d.ts.map