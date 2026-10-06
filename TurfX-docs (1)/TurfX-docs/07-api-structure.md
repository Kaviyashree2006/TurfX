# TurfX — REST API Structure

Convention: `/api/<resource>`, JSON in/out, JWT via `Authorization: Bearer <token>`. Role required is noted; "own" means the controller must additionally verify resource ownership.

## Auth
| Method | Path | Role |
|---|---|---|
| POST | /api/auth/register | public (customer) |
| POST | /api/auth/register/owner | public → creates owner (`approvalStatus: 'pending'`) |
| PUT | /api/auth/owner/resubmit | owner (own, `approvalStatus === 'rejected'`) — edits profile, resets to `pending` |
| POST | /api/auth/login | public |
| POST | /api/auth/refresh | public (valid refresh token) |
| GET | /api/auth/me | authenticated |
| POST | /api/auth/forgot-password | public — rate-limited per account/IP; issues a token with a short fixed expiry |
| POST | /api/auth/reset-password | public — rate-limited; rejects expired or already-used tokens |

## Turfs
| Method | Path | Role |
|---|---|---|
| GET | /api/turfs | public (filters: sport, city, date, price range) |
| GET | /api/turfs/:id | public |
| GET | /api/turfs/:id/availability?date= | public |
| POST | /api/turfs | owner (approved) |
| PUT | /api/turfs/:id | owner (own) — server determines major vs minor edit; major edit resets `status` to `pending` |
| DELETE | /api/turfs/:id | owner (own) |
| PATCH | /api/turfs/:id/slots | owner (own) — blackout dates, hours |

## Bookings
| Method | Path | Role |
|---|---|---|
| POST | /api/bookings | customer — rate-limited to prevent slot-holding abuse |
| GET | /api/bookings/my | customer |
| GET | /api/bookings/:id | customer (own) / owner (of turf) / admin |
| PATCH | /api/bookings/:id/cancel | customer (own) / admin — refund computed from the current Admin-configured cancellation policy, not a hard-coded rule |
| GET | /api/owner/bookings | owner (approved, own turfs) — includes both `sourceType: 'customer'` and `'tournament'` entries |

No reschedule endpoint exists (locked decision #8) — a client cancels via the endpoint above, then creates a new booking via `POST /api/bookings`.

## Payments
| Method | Path | Role |
|---|---|---|
| POST | /api/payments/create-order | customer — Razorpay only; amount includes current platform fee % for turf bookings, no fee for tournament entry |
| POST | /api/payments/verify | customer |
| POST | /api/payments/webhook | Razorpay (signature-verified, no user auth) |
| POST | /api/bookings/:id/refund | owner (own) / admin — amount computed from `Settings.cancellationPolicy` |
| GET | /api/owner/payouts | owner (approved, own) — ledger of earnings/fees/payout status |
| GET | /api/admin/payouts | admin — platform-wide ledger |
| PATCH | /api/admin/payouts/:id/mark-paid | admin |

## Tournaments
| Method | Path | Role |
|---|---|---|
| GET | /api/tournaments | public |
| GET | /api/tournaments/:id | public |
| POST | /api/tournaments | owner (approved) |
| PUT | /api/tournaments/:id | owner (own, before registration closes) |
| POST | /api/tournaments/:id/teams | customer (register team + pay entry fee, no platform fee) — rate-limited to prevent registration-slot abuse |
| GET | /api/tournaments/:id/teams | public |
| POST | /api/tournaments/:id/generate-bracket | owner (own) — for each match, also creates a `Booking` (`sourceType: 'tournament'`) reserving the turf slot, subject to the same double-booking guard as customer bookings |
| GET | /api/tournaments/:id/fixtures | public |
| PATCH | /api/matches/:id/score | owner (own tournament) |
| GET | /api/tournaments/:id/standings | public |

## Reviews
| Method | Path | Role |
|---|---|---|
| POST | /api/turfs/:id/reviews | customer (post-completed-booking only) |
| GET | /api/turfs/:id/reviews | public |

## Admin
| Method | Path | Role |
|---|---|---|
| GET | /api/admin/owners/pending | admin |
| PATCH | /api/admin/owners/:id/approve | admin |
| PATCH | /api/admin/owners/:id/reject | admin |
| GET | /api/admin/turfs/pending | admin — includes both first-time submissions and turfs pending re-review after a major edit |
| PATCH | /api/admin/turfs/:id/approve | admin |
| PATCH | /api/admin/turfs/:id/reject | admin |
| PATCH | /api/admin/owners/:id/reject | admin — sets `rejectionReason`; owner can edit and resubmit via `PUT /api/auth/owner/resubmit` |
| GET | /api/admin/users | admin |
| PATCH | /api/admin/users/:id/deactivate | admin |
| GET | /api/admin/bookings | admin |
| GET | /api/admin/tournaments | admin |
| GET | /api/admin/reports | admin |
| GET/PUT | /api/admin/settings | admin — the single `Settings` document: `cancellationPolicy` tiers and `platformFeePercent` |

## Response shape (consistent envelope)
```json
{ "success": true, "data": { ... }, "message": "optional" }
{ "success": false, "message": "error description", "code": "SLOT_UNAVAILABLE" }
```
