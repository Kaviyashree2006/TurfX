import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { HeaderComponent } from '../../../layout/header/header.component';
import { AuthService } from '../../../core/services/auth.service';
import { TurfService } from '../../../core/services/turf.service';
import { BookingService } from '../../../core/services/booking.service';
import { TournamentService } from '../../../core/services/tournament.service';
import { Turf } from '../../../core/models/turf.model';
import { Booking } from '../../../core/models/booking.model';

@Component({
  selector: 'app-owner-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, HeaderComponent],
  template: `
    <div class="app-shell">
      <app-header />
      <main class="app-main">
        <div class="container">
          <div class="page-header" style="display:flex;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;gap:16px;">
            <div>
              <h1 class="page-header__title">Owner Dashboard</h1>
              <p class="page-header__subtitle">Welcome back, {{ firstName }}. Manage your turfs and bookings.</p>
            </div>
            <a routerLink="/owner/turfs/new" class="btn btn--primary">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Add new turf
            </a>
          </div>

          <!-- Stat cards -->
          <div class="stats-grid">

            <!-- My Turfs -->
            <div class="stat-card">
              <div class="stat-card__icon stat-card__icon--green">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
              </div>
              <div class="stat-card__label">My Turfs</div>
              @if (loading()) {
                <div class="skeleton" style="height:32px;width:48px;border-radius:6px;margin-top:4px;"></div>
              } @else {
                <div class="stat-card__value">{{ turfCount() }}</div>
              }
            </div>

            <!-- Today's Bookings -->
            <div class="stat-card">
              <div class="stat-card__icon stat-card__icon--blue">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              </div>
              <div class="stat-card__label">Today's Bookings</div>
              @if (loading()) {
                <div class="skeleton" style="height:32px;width:48px;border-radius:6px;margin-top:4px;"></div>
              } @else {
                <div class="stat-card__value">{{ todayBookingCount() }}</div>
              }
            </div>

            <!-- This Month's Revenue -->
            <div class="stat-card">
              <div class="stat-card__icon stat-card__icon--amber">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
              </div>
              <div class="stat-card__label">This Month's Revenue</div>
              @if (loading()) {
                <div class="skeleton" style="height:32px;width:80px;border-radius:6px;margin-top:4px;"></div>
              } @else {
                <div class="stat-card__value">₹{{ monthRevenue() | number }}</div>
              }
            </div>

            <!-- Active Tournaments -->
            <div class="stat-card">
              <div class="stat-card__icon stat-card__icon--red">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
              </div>
              <div class="stat-card__label">Active Tournaments</div>
              @if (loading()) {
                <div class="skeleton" style="height:32px;width:48px;border-radius:6px;margin-top:4px;"></div>
              } @else {
                <div class="stat-card__value">{{ activeTournamentCount() }}</div>
              }
            </div>

          </div>

          <!-- Quick-links panels -->
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-top:8px;" class="owner-quick-links">

            <!-- My Turfs panel -->
            <div class="card">
              <div class="card__header" style="display:flex;align-items:center;justify-content:space-between;">
                <h3 style="font-size:1rem;font-weight:700;color:#111827;">My Turfs</h3>
                <a routerLink="/owner/turfs" class="btn btn--ghost btn--sm">View all</a>
              </div>
              <div class="card__body" style="padding:0;">
                @if (loading()) {
                  @for (i of [1,2,3]; track i) {
                    <div style="display:flex;align-items:center;gap:12px;padding:12px 20px;border-bottom:1px solid #f3f4f6;">
                      <div class="skeleton" style="width:40px;height:40px;border-radius:8px;flex-shrink:0;"></div>
                      <div style="flex:1;display:flex;flex-direction:column;gap:6px;">
                        <div class="skeleton skeleton--text" style="width:55%;"></div>
                        <div class="skeleton skeleton--text" style="width:35%;"></div>
                      </div>
                    </div>
                  }
                } @else if (turfs().length === 0) {
                  <div class="empty-state" style="padding:32px 16px;">
                    <svg class="empty-state__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                    <div class="empty-state__title">No turfs yet</div>
                    <p class="empty-state__description">Create your first turf listing to start accepting bookings.</p>
                    <a routerLink="/owner/turfs/new" class="btn btn--primary btn--sm" style="margin-top:8px;">Add turf</a>
                  </div>
                } @else {
                  @for (turf of turfs().slice(0, 4); track turf.id) {
                    <a [routerLink]="['/owner/turfs', turf.id, 'edit']"
                       style="display:flex;align-items:center;gap:12px;padding:12px 20px;border-bottom:1px solid #f3f4f6;text-decoration:none;transition:background 150ms;"
                       class="turf-row-link">
                      <div style="width:40px;height:40px;border-radius:8px;overflow:hidden;background:#f3f4f6;flex-shrink:0;">
                        @if (turf.images?.length) {
                          <img [src]="turf.images[0]" [alt]="turf.name" style="width:100%;height:100%;object-fit:cover;display:block;" loading="lazy"/>
                        } @else {
                          <div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" stroke-width="1.5"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
                          </div>
                        }
                      </div>
                      <div style="flex:1;min-width:0;">
                        <div style="font-weight:600;font-size:0.875rem;color:#111827;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">{{ turf.name }}</div>
                        <div style="font-size:0.75rem;color:#6b7280;margin-top:1px;">{{ turf.address?.city || 'No city' }}</div>
                      </div>
                      <span class="badge badge--{{ turf.status === 'approved' ? 'success' : turf.status === 'rejected' ? 'error' : 'pending' }}">
                        {{ turf.status }}
                      </span>
                    </a>
                  }
                }
              </div>
            </div>

            <!-- Recent Bookings panel -->
            <div class="card">
              <div class="card__header" style="display:flex;align-items:center;justify-content:space-between;">
                <h3 style="font-size:1rem;font-weight:700;color:#111827;">Recent Bookings</h3>
                <a routerLink="/owner/bookings" class="btn btn--ghost btn--sm">View all</a>
              </div>
              <div class="card__body" style="padding:0;">
                @if (loading()) {
                  @for (i of [1,2,3]; track i) {
                    <div style="display:flex;align-items:center;gap:12px;padding:12px 20px;border-bottom:1px solid #f3f4f6;">
                      <div style="flex:1;display:flex;flex-direction:column;gap:6px;">
                        <div class="skeleton skeleton--text" style="width:50%;"></div>
                        <div class="skeleton skeleton--text" style="width:30%;"></div>
                      </div>
                      <div class="skeleton" style="width:64px;height:22px;border-radius:20px;"></div>
                    </div>
                  }
                } @else if (recentBookings().length === 0) {
                  <div class="empty-state" style="padding:32px 16px;">
                    <svg class="empty-state__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                    <div class="empty-state__title">No bookings yet</div>
                    <p class="empty-state__description">Bookings will appear here once customers reserve your turfs.</p>
                  </div>
                } @else {
                  @for (b of recentBookings(); track b.id) {
                    <div style="display:flex;align-items:center;gap:12px;padding:12px 20px;border-bottom:1px solid #f3f4f6;">
                      <div style="flex:1;min-width:0;">
                        <div style="font-weight:600;font-size:0.875rem;color:#111827;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
                          {{ b.turf?.name ?? 'Turf' }}
                        </div>
                        <div style="font-size:0.75rem;color:#6b7280;margin-top:1px;">
                          {{ formatDate(b.date) }} · {{ b.startTime }}–{{ b.endTime }}
                        </div>
                      </div>
                      <div style="text-align:right;flex-shrink:0;">
                        <span class="badge badge--{{ bookingBadge(b.status) }}">{{ b.status }}</span>
                        <div style="font-size:0.75rem;color:#6b7280;margin-top:2px;">₹{{ b.amount | number }}</div>
                      </div>
                    </div>
                  }
                }
              </div>
            </div>

          </div>

          @if (loadError()) {
            <div class="alert alert--error" style="margin-top:16px;" role="alert">
              <svg class="alert__icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              Failed to load some dashboard data.
              <button class="btn btn--link" (click)="load()">Retry</button>
            </div>
          }

        </div>
      </main>
    </div>
  `,
  styles: [`
    @media (max-width: 640px) {
      .owner-quick-links { grid-template-columns: 1fr !important; }
    }
    .turf-row-link:hover { background: #f9fafb; }
    .turf-row-link:last-child { border-bottom: none !important; }
  `],
})
export class OwnerDashboardComponent implements OnInit {
  private readonly authService       = inject(AuthService);
  private readonly turfService       = inject(TurfService);
  private readonly bookingService    = inject(BookingService);
  private readonly tournamentService = inject(TournamentService);

  // ── State ──────────────────────────────────────────────────────────────────
  readonly loading   = signal(true);
  readonly loadError = signal(false);

  readonly turfs           = signal<Turf[]>([]);
  readonly allBookings     = signal<Booking[]>([]);
  readonly activeTournamentCount = signal(0);

  // ── Derived values ─────────────────────────────────────────────────────────
  readonly turfCount = computed(() => this.turfs().length);

  readonly todayBookingCount = computed(() => {
    const today = new Date().toISOString().slice(0, 10); // 'YYYY-MM-DD'
    return this.allBookings().filter(b => {
      const bDate = typeof b.date === 'string' ? b.date.slice(0, 10) : new Date(b.date).toISOString().slice(0, 10);
      return bDate === today && (b.status === 'confirmed' || b.status === 'completed');
    }).length;
  });

  readonly monthRevenue = computed(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth(); // 0-indexed
    return this.allBookings()
      .filter(b => {
        if (b.status !== 'confirmed' && b.status !== 'completed') return false;
        const d = new Date(b.date);
        return d.getFullYear() === y && d.getMonth() === m;
      })
      .reduce((sum, b) => sum + (b.amount ?? 0), 0);
  });

  readonly recentBookings = computed(() => this.allBookings().slice(0, 5));

  // ── Lifecycle ──────────────────────────────────────────────────────────────
  get user() { return this.authService.currentUser; }
  get firstName(): string { return this.user?.name?.split(' ')[0] ?? ''; }

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.loadError.set(false);

    forkJoin({
      turfs:       this.turfService.getOwnerTurfs(),
      bookings:    this.bookingService.getOwnerBookings({ limit: 100 }),
      tournaments: this.tournamentService.getOwnerTournaments(),
    }).subscribe({
      next: ({ turfs, bookings, tournaments }) => {
        this.turfs.set(turfs.turfs);
        this.allBookings.set(bookings.bookings);
        const active = tournaments.tournaments.filter(
          t => t.status === 'upcoming' || t.status === 'ongoing'
        );
        this.activeTournamentCount.set(active.length);
        this.loading.set(false);
      },
      error: () => {
        this.loadError.set(true);
        this.loading.set(false);
      },
    });
  }

  formatDate(d: string): string {
    if (!d) return '';
    const dt = new Date(d);
    return dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  }

  bookingBadge(status: string): string {
    if (status === 'confirmed')  return 'success';
    if (status === 'completed')  return 'neutral';
    if (status === 'cancelled')  return 'error';
    return 'pending';
  }
}
