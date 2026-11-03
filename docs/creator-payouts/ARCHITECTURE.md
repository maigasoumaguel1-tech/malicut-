# MaliCut — Manual creator payouts (design)

## Accepted product rules

- Beneficiaries: creators explicitly admitted to the MaliCut agency roster.
- Minimum withdrawal: **5,000 XOF (FCFA)**.
- First release: **manual review and manual mobile-money transfer only**.
- Planned rails: Orange Money, Wave, and Moov Money.
- No provider API call, automatic disbursement, or live money movement in this phase.

## Critical security finding

The current `public.profiles_update_own` policy permits a user to update their own profile row. The profile has a `role` column, so a client can attempt to change its own role unless the database separately blocks that column change. Do not use `profiles.role` as the source of truth for agency membership or finance-admin permissions.

The draft SQL adds a database trigger that prevents ordinary authenticated users from inserting or changing a privileged profile role. Trusted provisioning must happen through the database owner or a server-only service role. Finance authorization is kept in a separate private allowlist.

## Target architecture

1. **Agency roster** — private `agency_creators` table. A creator is eligible only when an authorized agency operator has approved the membership and the required adult/contract eligibility checks have been completed. Do not store a full date of birth; record verification status, timestamp, and verifier only.
2. **Immutable wallet ledger** — private `creator_wallet_ledger`. Gains and bonuses are append-only credit entries. A paid withdrawal is represented by a matching debit entry. Never store a mutable client-editable balance.
3. **Payout method vault** — private `payout_methods`. Store provider, last four digits, and encrypted recipient/holder fields only. The encryption key belongs in a server-side secret manager; never in the app, repository, browser, or chat.
4. **Withdrawal requests** — private `payout_requests`, with a minimum of 5,000 XOF and a state machine: `pending_review -> approved -> paid`, or `pending_review -> rejected`. A creator may cancel only while pending. Approval does not mean payment has occurred.
5. **Audit trail** — append-only `payout_audit_log` recording actor, action, request, timestamp, and a safe metadata snapshot. Do not put full phone numbers or secrets in logs.
6. **Server boundary** — all finance reads/writes go through authenticated server endpoints. The server verifies the Supabase access token, checks the private finance-admin allowlist for staff actions, and uses a server-only service-role key. Never ship the service-role key to the client.
7. **Atomic balance reservation** — when creating a request, the server/database must lock the creator wallet row, compute ledger credits minus debits and already pending/approved reservations, and reject an amount above the available balance. This prevents concurrent requests from spending the same balance twice.
8. **Manual payment proof** — after an operator transfers funds outside MaliCut, they record a provider reference and confirm the payment. Only then is the debit ledger entry appended and the request marked paid. Use idempotency keys to prevent duplicate debits.

## Screens

### Creator
- Gains and bonuses (read-only ledger summary).
- Available balance and pending withdrawal amount.
- Add/select Orange Money, Wave, or Moov Money destination.
- Request withdrawal (minimum 5,000 XOF).
- Request history with clear statuses and timestamps.

### Agency finance desk
- Pending requests queue.
- Creator eligibility and available-balance review.
- Approve/reject with reason.
- Mark paid only after manual transfer; record provider reference.
- Audit history and exportable reconciliation report.

## Required environment and operational controls

Server-only Render secrets, to be configured by the authorized adult/legal operator:
- `SUPABASE_SERVICE_ROLE_KEY`
- `MALICUT_PAYOUT_ENCRYPTION_KEY`

Do not ask anyone to paste these secrets into chat or commit them to GitHub. Existing publishable/anon keys are not sufficient for privileged finance administration.

## Go-live gates

Do not collect real recipient phone numbers or enable real balances until all gates are met:
- A legally responsible adult/entity has accepted ownership of the agency payout operation.
- Creator eligibility, age requirements, contracts, identity checks, accounting and tax treatment have been reviewed for the applicable jurisdiction.
- The agency has the appropriate merchant/enterprise agreements and documented manual-transfer procedures with each selected provider.
- The finance-admin allowlist is provisioned securely by the authorized owner.
- The database migration has been reviewed and tested on a non-production branch.
- RLS, privilege grants, concurrency, idempotency, rejection/cancellation, and audit tests pass.
- A full reconciliation test has been completed using test data only.

## Explicit non-goals for this phase

- No live provider integration or API credentials.
- No automatic payouts.
- No cash-out for ordinary users or unapproved creators.
- No self-assignment of creator/admin roles.
- No collection of real payout phone numbers in the current app.
- No promise that a displayed gain is withdrawable until the agency has funded and approved it.

## Current repository observations

- Supabase project is active and uses PostgreSQL 17.
- Existing `profiles` table has a `role` column with user/creator/moderator/admin values.
- Existing `profiles_update_own` RLS policy allows users to update their own profile row; a role-protection trigger is therefore required before role values can be trusted.
- The current MaliCut server is a small Python standard-library HTTP server. Finance endpoints and server-side service-role integration are not yet implemented.
