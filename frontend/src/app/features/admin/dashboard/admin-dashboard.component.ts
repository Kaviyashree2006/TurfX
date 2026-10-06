import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HeaderComponent } from '../../../layout/header/header.component';
import { AdminService } from '../../../core/services/admin.service';

interface AdminStats {
  pendingOwners:       number;
  activeTurfs:         number;
  totalBookings:       number;
  platformRevenue:     number;
  upcomingTournaments: number;
}

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, HeaderComponent],
  template: `
    <div class="app-shell">
      <app-header />
      <main class="app-main">
        <div class="container">
          <div class="page-header">
            <h1 class="page-header__title">Admin Dashboard</h1>
            <p class="page-header__subtitle">Platform overview and management tools.</p>
          </div>

          @if (loadError()) {
            <div class="alert alert--error" style="margin-bottom:24px;" role="alert">
              <svg class="alert__icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              Failed to load dashboard stats.
              <button class="btn btn--link" (click)="load()">Retry</button>
            </div>
          }

          <div class="stats-grid">

            <!-- Pending Owner Approvals -->
            <div class="stat-card">
              <div class="stat-card__icon stat-card__icon--amber">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              </div>
              <div class="stat-card__label">Pending Owner Approvals</div>
              @if (loading()) {
                <div class="skeleton" style="height:32px;width:48px;border-radius:6px;margin-top:4px;"></div>
              } @else {
                <div class="stat-card__value">{{ stats()?.pendingOwners ?? '—' }}</div>
              }
            </div>

            <!-- Active Turfs -->
            <div class="stat-card">
              <div class="stat-card__icon stat-card__icon--green">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
              </div>
              <div class="stat-card__label">Active Turfs</div>
              @if (loading()) {
                <div class="skeleton" style="height:32px;width:48px;border-radius:6px;margin-top:4px;"></div>
              } @else {
                <div class="stat-card__value">{{ stats()?.activeTurfs ?? '—' }}</div>
              }
            </div>

            <!-- Total Bookings -->
            <div class="stat-card">
              <div class="stat-card__icon stat-card__icon--blue">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              </div>
              <div class="stat-card__label">Total Bookings</div>
              @if (loading()) {
                <div class="skeleton" style="height:32px;width:48px;border-radius:6px;margin-top:4px;"></div>
              } @else {
                <div class="stat-card__value">{{ stats()?.totalBookings ?? '—' }}</div>
              }
            </div>

            <!-- Platform Revenue -->
            <div class="stat-card">
              <div class="stat-card__icon stat-card__icon--red">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
              </div>
              <div class="stat-card__label">Platform Revenue</div>
              @if (loading()) {
                <div class="skeleton" style="height:32px;width:80px;border-radius:6px;margin-top:4px;"></div>
              } @else {
                <div class="stat-card__value">
                  {{ stats() ? ('₹' + (stats()!.platformRevenue | number)) : '—' }}
                </div>
              }
            </div>

          </div>

          <!-- Quick actions (unchanged UI) -->
          <div class="card" style="margin-top:8px;">
            <div class="card__header"><h2 style="font-size:1rem;font-weight:700;color:#111827;">Quick Actions</h2></div>
            <div class="card__body" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px;">

              <a routerLink="/admin/owners/pending" class="btn btn--ghost" style="justify-content:flex-start;gap:10px;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                Review owner applications
                @if (!loading() && (stats()?.pendingOwners ?? 0) > 0) {
                  <span class="badge badge--warning" style="margin-left:auto;">{{ stats()!.pendingOwners }}</span>
                }
              </a>

              <a routerLink="/admin/turfs/pending" class="btn btn--ghost" style="justify-content:flex-start;gap:10px;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
                Review turf listings
              </a>

              <a routerLink="/admin/bookings" class="btn btn--ghost" style="justify-content:flex-start;gap:10px;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                View all bookings
              </a>

              <a routerLink="/admin/tournaments" class="btn btn--ghost" style="justify-content:flex-start;gap:10px;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 21l4-4 4 4M12 17V3M3 9l9 3 9-3"/></svg>
                Manage tournaments
                @if (!loading() && (stats()?.upcomingTournaments ?? 0) > 0) {
                  <span class="badge badge--info" style="margin-left:auto;">{{ stats()!.upcomingTournaments }}</span>
                }
              </a>

              <a routerLink="/admin/settings" class="btn btn--ghost" style="justify-content:flex-start;gap:10px;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93l-1.41 1.41M12 2v2M4.93 4.93l1.41 1.41M2 12h2M4.93 19.07l1.41-1.41M12 20v2M19.07 19.07l-1.41-1.41M20 12h2"/></svg>
                Platform settings
              </a>

              <a routerLink="/admin/payouts" class="btn btn--ghost" style="justify-content:flex-start;gap:10px;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                Manage payouts
              </a>

            </div>
          </div>
        </div>
      </main>
    </div>
  `,
})
export class AdminDashboardComponent implements OnInit {
  private readonly adminService = inject(AdminService);

  readonly stats     = signal<AdminStats | null>(null);
  readonly loading   = signal(true);
  readonly loadError = signal(false);

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.loadError.set(false);
    this.adminService.getStats().subscribe({
      next: (data) => { this.stats.set(data); this.loading.set(false); },
      error: ()    => { this.loadError.set(true); this.loading.set(false); },
    });
  }
}
