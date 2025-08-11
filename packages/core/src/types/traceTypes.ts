export interface TraceResult {
  contract: string;
  from: string;
  method: string;
  args: any[];
  ethTransferred: string;
  gasUsed: string;
  input: string;
  depth: number;
  children: TraceResult[];
}
