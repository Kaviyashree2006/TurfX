import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { guestGuard } from './core/guards/guest.guard';
import { roleGuard } from './core/guards/role.guard';
import { ownerApprovedGuard } from './core/guards/owner-approved.guard';

export const routes: Routes = [
  // ── Root redirect ────────────────────────────────────────────────────────
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () =>
      import('./features/public/landing/landing.component').then((m) => m.LandingComponent),
  },

  // ── Auth (guest only — redirect away if already logged in) ───────────────
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/auth/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'register',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/auth/register/register.component').then((m) => m.RegisterComponent),
  },
  {
    path: 'register/owner',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/auth/register-owner/register-owner.component').then(
        (m) => m.RegisterOwnerComponent
      ),
  },
  {
    path: 'forgot-password',
    loadComponent: () =>
      import('./features/auth/forgot-password/forgot-password.component').then(
        (m) => m.ForgotPasswordComponent
      ),
  },
  {
    path: 'reset-password/:token',
    loadComponent: () =>
      import('./features/auth/reset-password/reset-password.component').then(
        (m) => m.ResetPasswordComponent
      ),
  },

  // ── Public turf pages ────────────────────────────────────────────────────
  {
    path: 'turfs',
    loadComponent: () =>
      import('./features/public/turfs/turf-list.component').then((m) => m.TurfListComponent),
  },
  {
    path: 'turfs/:id',
    loadComponent: () =>
      import('./features/public/turfs/turf-detail.component').then((m) => m.TurfDetailComponent),
  },

  // ── Public tournament pages (Phase 5) ────────────────────────────────────
  {
    path: 'tournaments',
    loadComponent: () =>
      import('./features/public/tournaments/tournament-list.component').then(
        (m) => m.TournamentListComponent
      ),
  },
  {
    path: 'tournaments/:id',
    loadComponent: () =>
      import('./features/public/tournaments/tournament-detail.component').then(
        (m) => m.TournamentDetailComponent
      ),
  },

  // ── Customer ─────────────────────────────────────────────────────────────
  {
    path: 'dashboard',
    canActivate: [authGuard, roleGuard(['customer'])],
    loadComponent: () =>
      import('./features/customer/dashboard/customer-dashboard.component').then(
        (m) => m.CustomerDashboardComponent
      ),
  },
  // ── Customer bookings (Phase 3) ───────────────────────────────────────────
  {
    path: 'turfs/:id/book',
    canActivate: [authGuard, roleGuard(['customer'])],
    loadComponent: () =>
      import('./features/customer/bookings/booking-form.component').then(
        (m) => m.BookingFormComponent
      ),
  },
  {
    path: 'bookings/my',
    canActivate: [authGuard, roleGuard(['customer'])],
    loadComponent: () =>
      import('./features/customer/bookings/my-bookings.component').then(
        (m) => m.MyBookingsComponent
      ),
  },
  {
    path: 'bookings/:id',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/customer/bookings/booking-detail.component').then(
        (m) => m.BookingDetailComponent
      ),
  },
  // ── Notifications (Phase 6) ──────────────────────────────────────────────
  {
    path: 'notifications',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/customer/notifications/notifications.component').then(
        (m) => m.NotificationsComponent
      ),
  },
  // ── Customer profile (redirects to my-bookings for now — placeholder) ───
  {
    path: 'profile',
    canActivate: [authGuard, roleGuard(['customer'])],
    loadComponent: () =>
      import('./features/customer/dashboard/customer-dashboard.component').then(
        (m) => m.CustomerDashboardComponent
      ),
  },

  // ── Owner ─────────────────────────────────────────────────────────────────
  {
    path: 'owner',
    canActivate: [authGuard, roleGuard(['owner'])],
    children: [
      {
        path: 'pending-approval',
        loadComponent: () =>
          import('./features/owner/pending-approval/pending-approval.component').then(
            (m) => m.PendingApprovalComponent
          ),
      },
      {
        path: 'profile',
        loadComponent: () =>
          import('./features/owner/profile/owner-profile.component').then(
            (m) => m.OwnerProfileComponent
          ),
      },
      {
        path: 'dashboard',
        canActivate: [ownerApprovedGuard],
        loadComponent: () =>
          import('./features/owner/dashboard/owner-dashboard.component').then(
            (m) => m.OwnerDashboardComponent
          ),
      },
      // ── Owner Turf Management (Phase 2) — all require ownerApprovedGuard ──
      {
        path: 'turfs',
        canActivate: [ownerApprovedGuard],
        loadComponent: () =>
          import('./features/owner/turfs/owner-turf-list.component').then(
            (m) => m.OwnerTurfListComponent
          ),
      },
      {
        path: 'turfs/new',
        canActivate: [ownerApprovedGuard],
        loadComponent: () =>
          import('./features/owner/turfs/owner-turf-form.component').then(
            (m) => m.OwnerTurfFormComponent
          ),
      },
      {
        path: 'turfs/:id/edit',
        canActivate: [ownerApprovedGuard],
        loadComponent: () =>
          import('./features/owner/turfs/owner-turf-form.component').then(
            (m) => m.OwnerTurfFormComponent
          ),
      },
      {
        path: 'turfs/:id/pending-review',
        canActivate: [ownerApprovedGuard],
        loadComponent: () =>
          import('./features/owner/turfs/owner-turf-pending-review.component').then(
            (m) => m.OwnerTurfPendingReviewComponent
          ),
      },
      // ── Owner Turf Reviews (Phase 6) ──────────────────────────────────────
      {
        path: 'turfs/:id/reviews',
        canActivate: [ownerApprovedGuard],
        loadComponent: () =>
          import('./features/owner/turfs/owner-turf-reviews.component').then(
            (m) => m.OwnerTurfReviewsComponent
          ),
      },
      // ── Owner Bookings (Phase 3) ──────────────────────────────────────────
      {
        path: 'bookings',
        canActivate: [ownerApprovedGuard],
        loadComponent: () =>
          import('./features/owner/bookings/owner-bookings.component').then(
            (m) => m.OwnerBookingsComponent
          ),
      },
      // ── Owner Tournaments (Phase 5) ───────────────────────────────────────
      {
        path: 'tournaments',
        canActivate: [ownerApprovedGuard],
        loadComponent: () =>
          import('./features/owner/tournaments/owner-tournament-list.component').then(
            (m) => m.OwnerTournamentListComponent
          ),
      },
      {
        path: 'tournaments/new',
        canActivate: [ownerApprovedGuard],
        loadComponent: () =>
          import('./features/owner/tournaments/owner-tournament-form.component').then(
            (m) => m.OwnerTournamentFormComponent
          ),
      },
      {
        path: 'tournaments/:id/edit',
        canActivate: [ownerApprovedGuard],
        loadComponent: () =>
          import('./features/owner/tournaments/owner-tournament-form.component').then(
            (m) => m.OwnerTournamentFormComponent
          ),
      },
      {
        path: 'tournaments/:id/participants',
        canActivate: [ownerApprovedGuard],
        loadComponent: () =>
          import('./features/owner/tournaments/owner-tournament-participants.component').then(
            (m) => m.OwnerTournamentParticipantsComponent
          ),
      },
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'dashboard',
      },
    ],
  },

  // ── Admin ─────────────────────────────────────────────────────────────────
  {
    path: 'admin',
    canActivate: [authGuard, roleGuard(['admin'])],
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/admin/dashboard/admin-dashboard.component').then(
            (m) => m.AdminDashboardComponent
          ),
      },
      {
        path: 'owners/pending',
        loadComponent: () =>
          import('./features/admin/owners/owner-approvals.component').then(
            (m) => m.OwnerApprovalsComponent
          ),
      },
      {
        path: 'owners',
        loadComponent: () =>
          import('./features/admin/owners/owner-approvals.component').then(
            (m) => m.OwnerApprovalsComponent
          ),
      },
      // ── Admin Turf Management (Phase 2) ──────────────────────────────────
      {
        path: 'turfs/pending',
        loadComponent: () =>
          import('./features/admin/turfs/admin-turf-approvals.component').then(
            (m) => m.AdminTurfApprovalsComponent
          ),
      },
      {
        path: 'turfs',
        loadComponent: () =>
          import('./features/admin/turfs/admin-turf-approvals.component').then(
            (m) => m.AdminTurfApprovalsComponent
          ),
      },
      // ── Admin Bookings (Phase 3) ──────────────────────────────────────────
      {
        path: 'bookings',
        loadComponent: () =>
          import('./features/admin/bookings/admin-bookings.component').then(
            (m) => m.AdminBookingsComponent
          ),
      },
      // ── Admin Payments (Phase 4) ──────────────────────────────────────────
      {
        path: 'payments',
        loadComponent: () =>
          import('./features/admin/payments/admin-payments.component').then(
            (m) => m.AdminPaymentsComponent
          ),
      },
      // ── Admin Tournaments (Phase 5) ───────────────────────────────────────
      {
        path: 'tournaments',
        loadComponent: () =>
          import('./features/admin/tournaments/admin-tournaments.component').then(
            (m) => m.AdminTournamentsComponent
          ),
      },
      // ── Admin Reviews (Phase 6) ───────────────────────────────────────────
      {
        path: 'reviews',
        loadComponent: () =>
          import('./features/admin/reviews/admin-reviews.component').then(
            (m) => m.AdminReviewsComponent
          ),
      },
      // ── Admin profile placeholder ─────────────────────────────────────────
      {
        path: 'profile',
        loadComponent: () =>
          import('./features/admin/dashboard/admin-dashboard.component').then(
            (m) => m.AdminDashboardComponent
          ),
      },
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'dashboard',
      },
    ],
  },

  // ── Error pages ───────────────────────────────────────────────────────────
  {
    path: 'unauthorized',
    loadComponent: () =>
      import('./features/errors/unauthorized/unauthorized.component').then(
        (m) => m.UnauthorizedComponent
      ),
  },
  {
    path: '**',
    loadComponent: () =>
      import('./features/errors/not-found/not-found.component').then((m) => m.NotFoundComponent),
  },
];
