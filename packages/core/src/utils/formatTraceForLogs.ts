// src/utils/formatTraceForLogs.ts

import type { TraceResult } from '@t-op-arb-bot/types';

export function formatTraceForLogs(trace: TraceResult, indent = 0): string {
  const prefix = " ".repeat(indent * 2);
  let output = `${prefix}- Method: ${trace.method}\n`;
  output += `${prefix}  Contract: ${trace.contract}\n`;
  output += `${prefix}  Args: ${JSON.stringify(trace.args)}\n`;
  output += `${prefix}  ETH Sent: ${trace.ethTransferred}\n`;
  output += `${prefix}  Gas Used: ${trace.gasUsed}\n`;

  if (trace.children.length) {
    output += `${prefix}  Subcalls:\n`;
    for (const child of trace.children) {
      output += formatTraceForLogs(child, indent + 1);
    }
  }

  return output;
}
