# MaliCut — Validation checklist for creator gains and withdrawals

This checklist separates a safe interface preview from a live financial service. The current release is **preview-only**.

## Current UI checks

- [x] Creator gains/withdrawals page exists.
- [x] Agency finance dashboard preview exists.
- [x] The minimum threshold is shown as 5,000 FCFA.
- [x] Orange Money, Wave, and Moov Money are shown as planned payout methods.
- [x] No fabricated balance or transaction history is displayed.
- [x] Withdrawal submission is disabled.
- [x] Approve, reject, and mark-paid actions are disabled.
- [x] Creator entry is visible from the profile; real financial data and actions remain unavailable until agency eligibility is verified.
- [x] Finance dashboard entry is not exposed in the ordinary profile screen.
- [x] No service-role secret or payout encryption key is embedded in client code.

## Required before any real financial operation

- [ ] A legally responsible adult/entity formally owns and supervises the payout operation.
- [ ] Applicable local rules, age/contract requirements, accounting, and tax treatment are reviewed by qualified adults.
- [ ] Provider agreements and manual transfer procedures are confirmed by the responsible entity.
- [ ] Finance administrators are provisioned through a trusted server-side process, not the editable profile role.
- [ ] The database design is reviewed and tested in an isolated development environment.
- [ ] The role-protection trigger is tested against user profile insert/update attempts.
- [ ] Creator enrollment requires agency approval and completed eligibility checks.
- [ ] Payout destinations are encrypted at rest; encryption keys are held only in server-side secret storage.
- [ ] Wallet credits and debits are append-only, idempotent, and auditable.
- [ ] Withdrawal requests reserve balances atomically, including concurrent-request tests.
- [ ] A request cannot exceed available balance and cannot be submitted below 5,000 XOF.
- [ ] Only an authorized finance administrator can approve/reject/record a manual payment.
- [ ] A request is marked paid only after the real transfer is independently confirmed and its provider reference is recorded.
- [ ] Duplicate payment confirmation is rejected.
- [ ] Creator and admin endpoints verify Supabase identity server-side and enforce role/ownership on every request.
- [ ] RLS, grants, function execution privileges, Supabase advisors, and server logs are reviewed.
- [ ] Test cases cover eligible/ineligible creators, unauthorized admin, rejected/cancelled requests, insufficient funds, concurrent requests, duplicate idempotency keys, and audit completeness.
- [ ] End-to-end staging test uses synthetic accounts and no real money.
- [ ] Android/WebView visual and functional tests pass.

## Environment variables (server only; do not commit or paste into chat)

- `SUPABASE_SERVICE_ROLE_KEY`
- `MALICUT_PAYOUT_ENCRYPTION_KEY`

These secrets must only be set by the authorized owner in the Render service's secret environment. Do not add them to `app.html`, JavaScript bundles, GitHub, screenshots, or messages.

## Release rule

Do not merge a live-money implementation or enable withdrawal actions until every required gate above is completed and independently reviewed. A working screen is not proof that a payout system is financially or legally ready.
