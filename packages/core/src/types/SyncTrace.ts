export interface SyncTrace {
  pairSymbol: string;
  dex: string;
  reservesAfter: [number, number];
  timestamp: number;
}

export interface SyncEventLog {
  [key: string]: any;
}
