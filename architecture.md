# Architecture
Explanation of modules, data flow, and bundling process.

## Clients & Tracing
The bot uses two separate RPC clients. A `publicClient` handles standard read operations, while a `debugClient` is dedicated to tracing.

When tracing, `debugClient.traceTransaction` delegates its JSON-RPC calls to `publicClient.request`, allowing traces to reuse the same transport as regular reads.
