# MaliCut Studio — Functional audit status

Audit date: 2026-11-03  
Repository: `maigasoumaguel1-tech/malicut-`  
Working branch: `fix/malicut-functional-audit-22`  
Tracking issue: #22

## Verified application architecture

- Render serves a Python standard-library HTTP server from `malicut.py`.
- The main UI is `app.html`.
- Frontend modules include `calls.js`, `messages.js`, `studio-enhancements.js`, `settings-center.js`, `ai-assistant.js`, and (added in this branch) `notifications.js`.
- The live Supabase project contains 11 public application tables: `profiles`, `videos`, `follows`, `likes`, `comments`, `notifications`, `reports`, `call_rooms`, `call_participants`, `direct_messages`, and `video_reposts`.
- RLS is enabled on all 11 public application tables.
- Storage buckets: public `videos`, public `thumbnails`, private `message-audio`.

## Changes applied to the live Supabase project

1. Restricted authenticated users' profile writes to `id`, `display_name`, `username`, and `updated_at` on insert, and `display_name`, `username`, and `updated_at` on update. Users can no longer update or insert the `role` field through the Data API.
2. Added `creator` to the allowed profile role values; assignment remains reserved to trusted database/server-side operators.
3. Revoked direct Data API execution of internal trigger/event-trigger functions.
4. Removed three redundant permissive policies from `public.videos`, preserving the remaining equivalent owner/public policies.
5. Added an owner-scoped DELETE policy for objects in the `videos` storage bucket.
6. Added eight foreign-key indexes identified by the Supabase performance advisor.
7. Rewrote 17 RLS policy expressions to wrap `auth.uid()` in a scalar subquery, removing the initialization-plan warnings.
8. Added activity notification triggers for likes, comments, follows, reposts, and direct messages.
9. Added `public.notifications` to the `supabase_realtime` publication.

The security advisor now reports only the leaked-password protection warning. The performance advisor no longer reports RLS initialization-plan warnings or unindexed foreign keys; it reports informational unused-index notices, which are expected on a low-activity project and are not a reason to delete indexes.

## Frontend changes in this branch

- Profile editing is now a separate panel shown to signed-in users; it is no longer nested inside the sign-in-only panel.
- Password reset can start from an entered email while signed out, and the recovery event displays a new-password form.
- The account settings page has a direct sign-in/create-account entry point.
- The Calls page no longer displays a logout button to signed-out users.
- The app's fallback reset control no longer clears all browser local storage (which could remove the Supabase session).
- Community autoplay now respects the saved autoplay/data-saver preferences.
- Follow and report actions are connected to the `follows` and `reports` tables.
- Community search now checks public video titles as well as the static model catalog.
- Video playback records one view per signed-in account/video pair through a private ledger; the counter increment is atomic and duplicate plays do not add another view.
- An in-app notifications page, unread indicator, read/mark-all-read actions, and Realtime refresh have been added.
- The notifications module is served by Render.
- JavaScript syntax checks passed for the edited and dependent frontend modules and all inline scripts in `app.html`.

## Remaining work — not yet complete

These are real product gaps, not cosmetic tasks. Do not describe the entire application as fully functional until they are addressed and tested.

1. **Video views:** authenticated views are now deduplicated per account/video. Anonymous view counting is intentionally not enabled; test the counter in a signed-in mobile session.
2. **Global search:** the search field now searches public video titles and the static model catalog. It does not yet search video descriptions or creator profiles.
3. **Preferences:** privacy, comments, messaging, and external-AI consent are now server-stored and enforced by RLS. Marketing preference remains local; no push-notification delivery service is configured. Autoplay is applied to the community viewer; data saver does not yet implement adaptive/low-resolution media delivery.
4. **Templates:** several catalog entries are static demo cards; AI entries are explicitly marked as coming soon. A real template registry and loading pipeline are still needed.
5. **Moderation:** users can submit reports, but there is no moderation dashboard or review workflow yet.
6. **Notifications:** in-app notifications are wired for the listed activity types; this does not provide Android push notifications or background delivery.
7. **Calls:** the UI already notes that a TURN server is required for reliable calling across all mobile/Wi-Fi networks. No TURN provider was configured or verified in this audit.
8. **OAuth:** Google and Apple sign-in remain dependent on provider setup in Supabase and their redirect configuration; they were not represented as verified.
9. **Leaked-password protection:** Supabase's Auth security advisor still reports this setting disabled. Enable it in Supabase Auth password/security settings.
10. **Migration history drift:** the live database has five migration versions whose SQL files are absent from the repository: `20260918214720_allow_authenticated_video_storage`, `20261004223427_fix_profiles_data_api_permissions`, `20261102153814_add_private_direct_messages_and_audio`, `20261102153923_restrict_direct_message_read_receipt_updates`, and `20261102192347_video_reposts`. Reconstruct and commit those exact historical migrations before relying on a clean local migration replay.
11. **Runtime validation:** JavaScript syntax checks passed for the modified inline scripts and frontend modules. Database policies, private video bucket settings, object-path conversion, preference RLS, and security advisors were inspected. A real mobile-browser end-to-end test of signup, login, password recovery, profile privacy, video signed-URL playback, profile edit, publish/delete, messages, calls, and notifications is still required. No claim of full device-level verification is made.
12. **Platform-level hardening:** Supabase's leaked-password protection remains disabled and must be enabled in Auth settings. SSL enforcement, database network restrictions, organization MFA, backup/PITR policy, and project-owner MFA must be checked in the Supabase Dashboard; they are not toggled by SQL and were not verified through available controls.

## Data safety

No application rows were truncated or reset. The profile privilege, policy, index, storage-policy, notification-trigger, and publication changes were applied as additive or access-hardening schema changes. The remaining product work should be shipped in reviewed, small increments with RLS preserved.
