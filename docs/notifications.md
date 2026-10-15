# Notifications

The personal inbox is available at `/notifications` in all five authenticated layouts. Every active, verified user can access their own inbox without an administrative permission. Login and public pages do not display a bell.

## Delivery and storage

Run `php artisan migrate` before deploying the application code that reads notification storage. The additive migration creates Laravel's database notifications table with recipient, read-status, and chronological indexes. No backfill, queue worker, WebSocket service, or email configuration is required.

`AccessNotification` sends only through the database channel. Registration submission notifies active, verified registration reviewers, including owners. Actual changes to an existing user's role notify that user through the shared role assignment action. Initial assignments and no-op assignments do not notify. Notifications are written inside the business transaction and roll back with it.

For future events, create a notification with curated title/body fields and invoke it inside the business transaction. Do not store credentials or complete models. New destinations must be resolved server-side with a current permission and resource-existence check in `ReadNotificationInbox`; arbitrary client-provided URLs are never accepted.

## Contracts

- `GET /notifications`: Inertia page with `inbox` pagination (20 rows) and `filter` (`all`, `unread`, or `read`).
- `GET /notifications/summary`: private, non-cacheable JSON `{ total, unread, items }`, with the five newest items.
- `PATCH /notifications/{uuid}`: validated `{ read: boolean }`; updates only the authenticated recipient's notification, then redirects back. Repeated read requests preserve the original read timestamp.
- `PATCH /notifications/read-all`: marks that recipient's currently unread notifications read and redirects back.
- Shared Inertia `notifications`: the same summary shape. Each item exposes `id`, `type`, `title`, `body`, `createdAt`, `readAt`, and nullable `actionUrl`. Timestamps are ISO 8601; the interface formats them using the configured system timezone.

`NotificationProvider` mounts once above the selected shell. It refreshes every 60 seconds while the tab is visible, on focus, and when the bell opens. Inbox refreshes preserve the current filter/page. Server mutation responses synchronize read state and counts. Summary requests do not report user activity or renew the inactivity cookie. Authentication failures stop polling; transient failures preserve the previous preview and expose Retry.

Opening the bell never marks notifications read. View details sends the read mutation before navigating; the destination retains its own authorization. Notifications remain in history if their target is removed or permission is revoked, with their action disabled. There is no deletion or automatic retention limit in this version.

## Verification

Run `php artisan test --filter=NotificationTest` and `npm run test:unit -- --run tests/Frontend/notifications.test.tsx`, followed by the repository CI checks. The browser matrix is `npx playwright test tests/e2e/notifications.spec.ts` and expects an isolated database with `APP_ENV=testing`, migrated and seeded using `php artisan db:seed --class="Tests\Fixtures\NotificationBrowserSeeder"`. Set `E2E_BASE_URL` to that test server. It temporarily changes the shared layout and restores the original afterward; use a test database, not an operational environment. Screenshots are written to Playwright's test output for each layout and appearance at mobile, tablet, and desktop sizes.
