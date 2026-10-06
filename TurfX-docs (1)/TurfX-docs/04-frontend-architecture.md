# TurfX — Angular Frontend Architecture

## Approach
Standalone-components Angular (Angular 17+ style, no NgModules needed), feature-folder structure. Kept deliberately simple — plain services + RxJS for state, no NgRx unless a feature (likely booking flow or tournament bracket) proves it's genuinely needed later.

## Folder structure
```
src/app/
  core/
    guards/          authGuard, roleGuard, ownerApprovedGuard
    interceptors/    jwtInterceptor, errorInterceptor
    services/        auth.service, token.service
    models/          user.model, turf.model, booking.model, tournament.model, ...
  shared/
    components/      turf-card, slot-picker, rating-stars, empty-state, ...
    pipes/, directives/
  features/
    auth/            login, register, register-owner, forgot-password
    turfs/           turf-list, turf-detail, turf-search-filters
    booking/         booking-flow (slot select → review → payment), booking-list, booking-detail
    tournaments/     tournament-list, tournament-detail, team-register
    owner/
      turfs/         turf-form (splits fields into major/minor edit groups), turf-list, slot-config, pending-review/
      bookings/      owner-booking-list
      tournaments/   tournament-form, tournament-manage (bracket + scores)
      dashboard/, revenue/ (payout ledger view), pending-approval/ (includes resubmit form when rejected)
    admin/
      owners-pending/, turfs-pending/, users/, bookings/, tournaments/, reports/, payouts/, settings/ (cancellation policy + platform fee %)
  layout/
    header, footer, sidenav (role-aware), shell components per role
  app.routes.ts       lazy-loaded feature routes
  app.config.ts       providers (HttpClient w/ interceptors, router)
```

## Routing
- Lazy-loaded routes per feature area (`loadChildren`/`loadComponent`) to keep bundle size down.
- Route guards composed as functional guards (`CanActivateFn`): `authGuard`, `roleGuard(['owner'])`, `ownerApprovedGuard`.

## State management
- `AuthService`: holds current user + role as a `BehaviorSubject`, exposes `isAuthenticated$`, `role$`. **Access token is stored in memory only** (a module-level variable inside `TokenService`) — never written to `localStorage` or `sessionStorage` (locked decision #18). The refresh token travels exclusively as an httpOnly, Secure, SameSite=Strict cookie set by the server (locked decision #19) and is never readable by JavaScript. On a full page reload, `AuthService` automatically calls `GET /api/auth/refresh` (the cookie is sent automatically by the browser) to silently recover the access token; if the refresh token is expired or absent the user is redirected to `/login`.
- The token itself carries no approval flag (locked decision #11) — `ownerApprovedGuard` calls `GET /api/auth/me` (or a dedicated status endpoint) to read live approval status rather than decoding the JWT.
- Feature services (`TurfService`, `BookingService`, `TournamentService`) call the API and expose data via RxJS; components subscribe via `async` pipe — no global store needed for v1.
- Booking flow state (selected turf/date/slot) held in a small `BookingFlowService` scoped to that feature, cleared on completion/exit.

## HTTP layer
- `jwtInterceptor`: attaches `Authorization: Bearer <token>` to outgoing requests using the in-memory access token from `TokenService`; on `401`, attempts silent refresh once by calling `/api/auth/refresh` (the httpOnly refresh-token cookie is sent automatically by the browser), stores the new access token in memory, then retries the original request once — else redirects to `/login`.
- `errorInterceptor`: centralizes API error → toast/snackbar messaging.

## Forms
- Reactive Forms throughout (matches complex needs: slot grids, pricing rules, tournament setup, multi-step booking wizard) — this is exactly why Angular was chosen for this project.

## Key reusable components (to match Stitch screens once available)
- `SlotPickerComponent` — calendar + time-grid, shows booked/available/blocked slots.
- `TurfCardComponent` — used in listing, search results, owner's turf list.
- `BracketViewComponent` — renders knockout tree or round-robin table from tournament data.
- `PaymentButtonComponent` — wraps Razorpay checkout invocation.
- `ApprovalStatusBannerComponent` — shown to pending owners.

## Styling
- Component-scoped styles; a shared design-tokens file (colors, spacing, typography) so the Stitch visual language can be dropped in directly once screenshots are available — see `frontend-design` considerations when screens are shared.

## Note on visual design
Per locked decision #15, no Stitch screenshots are required — this document set is the source of truth. Visual styling/layout decisions (e.g. whether the booking flow is one page with steps, or separate routes per step) are made directly against these docs; a `frontend-design`-style pass can be applied for visual polish once the functional build is in place.

## Note on email verification
Email verification on signup is **not included in v1** (locked decision #16). There is no verify-email route, no `emailVerified` flag on the User model, and no verification-pending UI state. Accounts (customer and owner) are usable immediately after registration.
