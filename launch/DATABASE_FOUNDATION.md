# Database Foundation Plan

This repo is ready to move from browser-local state to a real database-backed core.

## Included in this scaffold
- Reversible SQL migrations in `migrations/`
- Initial core schema for accounts, sessions, roles, loads, requests, lane alerts, notifications, carrier verification, trusted partners, disputes, claims, verification records, fraud flags, and audit log
- Verified-event tables for trust/reputation history
- Verified transaction history for completed-load records
- Auth token tables for email verification and password resets
- Community storage tables for bulletin posts and the communication hub
- A shared audit helper in `functions/lib/audit.js`
- D1-backed session, auth-token, account, leaderboard, bulletin, and communication helpers with KV fallback during cutover

## Recommended next implementation step
1. Continue moving remaining KV-only surfaces to D1, starting with load records and trust history writes.
2. Apply migrations `0001_core_schema`, `0002_verified_event_history`, `0003_auth_tokens`, `0004_community_surfaces`, and `0005_verified_transactions`.
3. Keep KV only as a compatibility bridge while the cutover is tested.

## Traceability rule
Any trust-score change, badge unlock, reward unlock, dispute update, or fraud flag should write an immutable audit row that includes a verified event reference.
