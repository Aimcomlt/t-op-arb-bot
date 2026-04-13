# Codebase Audit: Proposed Fix Tasks

## 1) Typo fix task
**Task:** Update the frontend success toast text from `ws auth ok` to `WS auth OK` for consistent user-facing copy style.

- **Why:** This message is displayed directly to users and currently uses inconsistent capitalization/abbreviation style compared with other UI labels.
- **Location:** `frontend/src/components/PreflightButton.tsx` (success notification message).
- **Acceptance criteria:** The notification text is capitalized consistently and related tests (if any) are updated.

## 2) Bug fix task
**Task:** Prevent double-decrement of `wsClientsActiveGauge` when heartbeat terminates stale WebSocket clients.

- **Why:** In heartbeat cleanup, stale clients are removed and the gauge is decremented; then the socket `close` handler also decrements the same gauge. This can drive the metric below zero.
- **Locations:**
  - heartbeat stale-client branch decrements gauge in `backend/src/server/wsServer.ts`
  - `close` event handler also decrements gauge in `backend/src/server/wsServer.ts`
- **Acceptance criteria:** `ws_clients_active` never goes negative during stale-client termination; a regression test covers this flow.

## 3) Documentation discrepancy task
**Task:** Align README defaults and structure docs with the actual codebase.

- **Why:**
  - README says default `WS_PORT` is `8081`, but runtime fallback in env setup is `8080`.
  - README project structure references files like `frontend/src/hooks/useABIE.ts` and `frontend/src/store/abieSlice.ts` that are not present in this repo.
- **Locations:**
  - `README.md` (environment table + project structure)
  - `backend/src/config/env.ts` (`WS_PORT` fallback)
- **Acceptance criteria:** README accurately reflects current defaults and existing paths, or code defaults are changed to match documented behavior.

## 4) Test improvement task
**Task:** Strengthen WebSocket heartbeat tests to validate metrics behavior (not only client count).

- **Why:** Existing heartbeat test checks disconnection but does not assert that metrics remain valid (e.g., gauge does not underflow), so the double-decrement bug can slip through.
- **Locations:**
  - Existing heartbeat test in `backend/src/server/wsServer.test.ts`
  - Metrics instrumentation in `backend/src/monitoring/metrics.ts`
- **Acceptance criteria:** Add/extend test(s) to assert `ws_clients_active` remains non-negative and correctly returns to zero after stale-client cleanup.
