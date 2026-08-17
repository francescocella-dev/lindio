# PWA and reminder notifications

## Scope

Lindio is a mobile-first web application that can be installed as a Progressive Web App. M7 hardens the application shell and the browser reminder path without introducing capabilities the product does not currently have.

The current model is deliberately privacy-first and device-local:

- the service worker caches only the application shell and same-origin static assets;
- Supabase and every external origin remain network-only;
- reminder eligibility is evaluated by the running React application;
- the service worker can display a notification, but it does not schedule reminders independently;
- there is no Web Push subscription, VAPID key, push backend, periodic background sync or offline mutation queue.

This distinction is part of the product contract and should remain visible in UI and documentation.

## Service-worker registration

The service worker is registered only in production builds. Development mode intentionally avoids service-worker registration so local frontend iteration cannot be confused by stale caches.

`src/services/pwaService.js` owns registration and exposes a small observable status event:

`lindio:pwa-status`

Registration uses:

- scope `/`;
- `updateViaCache: "none"` so service-worker update checks are not satisfied by an HTTP cache entry;
- failure-safe behavior: registration or update-check failures are logged but never block React from rendering.

The browser acceptance test runs against `vite preview`, not the Vite development server, specifically so this production-only path is exercised.

## Cache model

M7 uses two explicitly versioned caches:

- `lindio-app-shell-v2`
- `lindio-static-runtime-v2`

During install, the service worker precaches the SPA HTML shell plus manifest and first-party brand/install assets. On activation, obsolete Lindio-owned caches are removed deterministically.

### Navigation requests

Same-origin document navigations are network-first.

When online:

1. the requested route goes to the network;
2. a successful same-origin HTML response refreshes the cached `/index.html` shell;
3. the network response is returned to the browser.

When the network fails:

1. the service worker returns the cached `/index.html` application shell;
2. React Router resolves the requested client-side route;
3. static JS/CSS required by the already-warmed production build can be served from the runtime cache.

This means Lindio has an offline **application-shell** guarantee after a successful online warm-up. It is not a promise that every product feature or remote dataset works offline.

## What is intentionally not cached

The service worker exits immediately for every request whose origin differs from the Lindio origin. Supabase, third-party APIs and remote services are therefore never written into Lindio's Cache Storage.

The runtime cache is also deliberately narrow. It stores only:

- Vite build assets under `/assets/`;
- first-party brand files under `/brand/`;
- known manifest/icon assets.

It does not cache arbitrary same-origin fetch responses. This prevents a future same-origin API or customer-media endpoint from silently entering the PWA cache just because its response type happens to be an image or JSON resource.

Authenticated database responses remain a network concern. M7 does not introduce a local replica of Supabase data.

## Offline behavior by execution mode

### Demo mode

Demo data is already stored in browser local storage. After the production shell has been warmed, the demo can therefore retain meaningful local behavior offline because its data source is local to the device.

### Real Supabase workspace

The application shell can render offline, but Supabase reads and writes still require network access. A cached shell must never be confused with a full offline database mode.

M7 intentionally does not add:

- an offline write queue;
- automatic replay of mutations;
- background conflict resolution;
- cached authenticated query responses.

Those features would change Lindio's consistency model and require a dedicated product/architecture decision.

## Reminder model

Reminder preferences are stored on the user profile, while the browser permission remains device-specific.

The running application evaluates reminders:

- when the authenticated/demo workspace is active;
- every 30 seconds while the relevant React effect is mounted;
- when the window regains focus;
- when the document becomes visible again.

The deterministic policy lives in `src/domain/reminderPolicy.ts`. It decides whether a lead is eligible using:

- lead status;
- follow-up timestamp;
- configured minutes-before value;
- a 10-minute late tolerance;
- the local sent-reminder registry.

Final leads (`Vinta`, `Persa`) and leads without a valid follow-up do not generate notifications.

## Deduplication

Sent reminder identifiers use:

`<lead-id>:<follow-up-timestamp>`

The browser stores successfully sent identifiers in local storage. Changing the follow-up timestamp creates a new reminder identity; reopening the app does not resend the same unchanged reminder on the same browser profile.

This deduplication is local to the device. It is not a cross-device delivery ledger.

## Notification delivery and deep links

When the browser permission is granted, Lindio prefers `ServiceWorkerRegistration.showNotification()` and falls back to the direct Notification API where necessary.

Lead reminders include a same-origin destination such as:

`/leads/<lead-id>`

The service worker validates the destination against Lindio's own origin before using it. A notification click then:

1. closes the notification;
2. finds an existing Lindio window when possible;
3. navigates that window to the destination and focuses it;
4. otherwise opens a new Lindio window at that destination.

Invalid or cross-origin notification destinations fall back to `/today`.

## What reminders do not guarantee

Current Lindio reminders are **not server push**.

If Lindio is completely closed and the browser does not keep the page/runtime active, there is no scheduler that independently wakes the application at the follow-up time. The UI therefore states that reminders are browser/device-local and checked while Lindio is open or returning to the foreground.

The service worker's ability to display a notification must not be described as proof of background scheduling.

## Future Web Push extension point

If product evidence later justifies guaranteed closed-app reminders, that work should be introduced as a separate capability with an explicit server-side design. At minimum it would require:

- Push API subscription lifecycle;
- VAPID/server credentials stored outside the browser bundle;
- a backend scheduler or job system;
- tenant-safe subscription ownership;
- delivery retry/expiry policy;
- revoked subscription cleanup;
- privacy review for notification payloads;
- cross-device deduplication semantics;
- service-worker `push` handling;
- user-visible opt-in and revocation behavior.

M7 does not pre-implement that infrastructure merely to make the product appear more advanced.

## Install assets

The previous repository state used identical 859×859 PNG bytes for files declared in the manifest as 192×192 and 512×512. M7 regenerates the two PNG install assets from the already-versioned `public/icon.svg` source at the dimensions declared by the manifest.

The production PWA acceptance test verifies both the manifest declarations and the decoded PNG dimensions.

## Automated acceptance boundary

`npm run test:pwa` builds the production application, serves it with `vite preview` and verifies in Chromium that:

- the manifest is reachable and contains the expected core metadata;
- the 192px and 512px PNG assets match their declared dimensions;
- the service worker becomes active and controls the page;
- the current versioned shell/runtime caches exist;
- cached URLs are first-party only;
- `/index.html` is present in the application-shell cache;
- after an online warm-up, `/login` renders while the browser context is offline.

This test complements the normal M6 browser journeys, which intentionally continue to run against the development server with service workers disabled.
