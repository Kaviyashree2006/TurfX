import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HeaderComponent } from '../../../layout/header/header.component';
import { BookingService } from '../../../core/services/booking.service';
import { TurfService } from '../../../core/services/turf.service';
import { ToastService } from '../../../core/services/toast.service';
import { Booking, BookingStatus } from '../../../core/models/booking.model';
import { Turf } from '../../../core/models/turf.model';

type FilterStatus = 'all' | 'pending_payment' | 'confirmed' | 'completed' | 'cancelled';

@Component({
  selector: 'app-owner-bookings',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, HeaderComponent],
  template: `
    <div class="app-shell">
      <app-header />
      <main class="app-main">
        <div class="container">

          <div class="page-header" style="display:flex;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;gap:16px;">
            <div>
              <h1 class="page-header__title">Bookings</h1>
              <p class="page-header__subtitle">All bookings across your turfs.</p>
            </div>
          </div>

          <!-- Filters -->
          <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:center;margin-bottom:24px;">
            <!-- Turf filter -->
            <div style="min-width:180px;">
              <select class="form-control" [(ngModel)]="selectedTurfId" (ngModelChange)="onFilterChange()">
                <option value="">All turfs</option>
                @for (t of turfs(); track t.id) {
                  <option [value]="t.id">{{ t.name }}</option>
                }
              </select>
            </div>

            <!-- Status tabs -->
            <div class="filter-tabs-row">
              @for (tab of tabs; track tab.value) {
                <button class="filter-tab" [class.active]="activeStatus() === tab.value"
                  (click)="setStatus(tab.value)">{{ tab.label }}</button>
              }
            </div>
          </div>

          <!-- Loading -->
          @if (loading()) {
            <div style="display:flex;flex-direction:column;gap:12px;">
              @for (i of [1,2,3,4]; track i) {
                <div class="booking-row-skeleton">
                  <div class="skeleton" style="width:56px;height:56px;border-radius:8px;flex-shrink:0;"></div>
                  <div style="flex:1;display:flex;flex-direction:column;gap:8px;">
                    <div class="skeleton skeleton--title" style="max-width:260px;"></div>
                    <div class="skeleton skeleton--text" style="width:160px;"></div>
                  </div>
                </div>
              }
            </div>
          }

          <!-- Error -->
          @if (!loading() && loadError()) {
            <div class="alert alert--error" role="alert">
              <svg class="alert__icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              Failed to load bookings.
              <button class="btn btn--link" style="font-size:inherit;" (click)="load()">Retry</button>
            </div>
          }

          <!-- Empty -->
          @if (!loading() && !loadError() && bookings().length === 0) {
            <div class="empty-state">
              <svg class="empty-state__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              <div class="empty-state__title">No bookings yet</div>
              <p class="empty-state__description">Bookings from customers will appear here once your turfs are approved and live.</p>
            </div>
          }

          <!-- Bookings table -->
          @if (!loading() && !loadError() && bookings().length > 0) {
            <div class="owners-table-wrap">
              <table class="owners-table" aria-label="Bookings">
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>Turf</th>
                    <th>Date &amp; Time</th>
                    <th>Sport</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th class="th-actions">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  @for (b of bookings(); track b.id) {
                    <tr class="owner-row">
                      <td>
                        <div class="owner-cell__name">{{ b.customer?.name ?? '—' }}</div>
                        <div class="owner-cell__email">{{ b.customer?.email ?? '' }}</div>
                      </td>
                      <td class="owner-cell__name">{{ b.turf?.name ?? '—' }}</td>
                      <td>
                        <div class="owner-cell__name" style="white-space:nowrap;">{{ formatDate(b.date) }}</div>
                        <div class="owner-cell__email">{{ b.startTime }} – {{ b.endTime }}</div>
                      </td>
                      <td style="font-size:0.875rem;color:#374151;">{{ b.sport }}</td>
                      <td style="font-weight:700;color:#111827;white-space:nowrap;">₹{{ b.amount }}</td>
                      <td><span class="badge badge--{{ statusBadge(b.status) }}">{{ statusLabel(b.status) }}</span></td>
                      <td class="td-actions">
                        <div class="row-actions">
                          <a [routerLink]="['/bookings', b.id]" class="btn btn--ghost btn--sm">View</a>
                          @if (b.status === 'confirmed' || b.status === 'pending_payment') {
                            <button
                              class="btn btn--danger btn--sm"
                              [class.loading]="cancellingId() === b.id"
                              [disabled]="!!cancellingId()"
                              (click)="cancel(b)"
                            >Cancel</button>
                          }
                        </div>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>

            <!-- Pagination -->
            @if (totalPages() > 1) {
              <div class="pagination" style="margin-top:24px;">
                <button class="btn btn--ghost btn--sm" [disabled]="page() <= 1" (click)="changePage(page()-1)">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg> Prev
                </button>
                <span style="font-size:0.875rem;color:#6b7280;">Page {{ page() }} of {{ totalPages() }}</span>
                <button class="btn btn--ghost btn--sm" [disabled]="page() >= totalPages()" (click)="changePage(page()+1)">
                  Next <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                </button>
              </div>
            }
          }

        </div>
      </main>
    </div>
  `,
  styles: [`
    .filter-tabs-row { display:flex; gap:4px; background:#f3f4f6; padding:4px; border-radius:10px; flex-wrap:wrap; }
    .filter-tab {
      padding:6px 14px; font-size:0.8125rem; font-weight:600; font-family:inherit; color:#6b7280;
      background:none; border:none; border-radius:7px; cursor:pointer; transition:background 150ms ease, color 150ms ease; white-space:nowrap;
      &:hover { background:#e5e7eb; color:#374151; }
      &.active { background:white; color:#111827; box-shadow:0 1px 3px rgb(0 0 0/.1); }
    }

    .owners-table-wrap { background:white; border:1px solid #e5e7eb; border-radius:12px; overflow:hidden; box-shadow:0 1px 2px rgb(0 0 0/.05); }
    .owners-table { width:100%; border-collapse:collapse; font-size:0.875rem; }
    .owners-table th { padding:12px 16px; text-align:left; font-size:0.75rem; font-weight:600; color:#6b7280; text-transform:uppercase; letter-spacing:0.04em; background:#f9fafb; border-bottom:1px solid #e5e7eb; }
    .owners-table td { padding:14px 16px; border-bottom:1px solid #f3f4f6; vertical-align:middle; }
    .owner-row:last-child td { border-bottom:none; }
    .owner-row:hover td { background:#fafafa; }
    .th-actions, .td-actions { text-align:right; }
    .owner-cell__name { font-weight:600; color:#111827; }
    .owner-cell__email { font-size:0.8125rem; color:#6b7280; }
    .row-actions { display:flex; align-items:center; justify-content:flex-end; gap:8px; }
    .booking-row-skeleton { display:flex; align-items:center; gap:16px; padding:16px; background:white; border:1px solid #e5e7eb; border-radius:12px; }
    .pagination { display:flex; align-items:center; justify-content:center; gap:16px; }

    @media (max-width:900px) {
      .owners-table th:nth-child(4), .owners-table td:nth-child(4) { display:none; }
    }
    @media (max-width:640px) {
      .owners-table th:nth-child(2), .owners-table td:nth-child(2),
      .owners-table th:nth-child(5), .owners-table td:nth-child(5) { display:none; }
    }
  `],
})
export class OwnerBookingsComponent implements OnInit {
  private readonly bookingService = inject(BookingService);
  private readonly turfService    = inject(TurfService);
  private readonly toastService   = inject(ToastService);

  readonly bookings    = signal<Booking[]>([]);
  readonly turfs       = signal<Turf[]>([]);
  readonly loading     = signal(true);
  readonly loadError   = signal(false);
  readonly cancellingId = signal<string | null>(null);
  readonly activeStatus = signal<FilterStatus>('all');
  readonly page        = signal(1);
  readonly totalPages  = signal(1);

  selectedTurfId = '';

  readonly tabs: { label: string; value: FilterStatus }[] = [
    { label: 'All',       value: 'all' },
    { label: 'Confirmed', value: 'confirmed' },
    { label: 'Pending',   value: 'pending_payment' },
    { label: 'Done',      value: 'completed' },
    { label: 'Cancelled', value: 'cancelled' },
  ];

  ngOnInit(): void {
    // Load turf list for the filter dropdown
    this.turfService.getOwnerTurfs().subscribe({
      next: (d) => this.turfs.set(d.turfs),
      error: () => {},
    });
    this.load();
  }

  setStatus(s: FilterStatus): void { this.activeStatus.set(s); this.page.set(1); this.load(); }
  onFilterChange(): void { this.page.set(1); this.load(); }
  changePage(p: number): void { this.page.set(p); this.load(); }

  load(): void {
    this.loading.set(true);
    this.loadError.set(false);
    const status = this.activeStatus() === 'all' ? undefined : this.activeStatus();
    this.bookingService.getOwnerBookings({
      status,
      turfId: this.selectedTurfId || undefined,
      page:   this.page(),
    }).subscribe({
      next: (d) => { this.bookings.set(d.bookings); this.totalPages.set(d.pages); this.loading.set(false); },
      error: () => { this.loadError.set(true); this.loading.set(false); },
    });
  }

  formatDate(iso: string): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  statusBadge(s: BookingStatus): string {
    return s === 'confirmed' ? 'success' : s === 'cancelled' ? 'error' : s === 'completed' ? 'neutral' : 'pending';
  }

  statusLabel(s: BookingStatus): string {
    return s === 'pending_payment' ? 'Pending' : s.charAt(0).toUpperCase() + s.slice(1);
  }

  cancel(b: Booking): void {
    if (!confirm(`Cancel booking for ${b.customer?.name ?? 'customer'} on ${this.formatDate(b.date)}?`)) return;
    this.cancellingId.set(b.id);
    this.bookingService.ownerCancelBooking(b.id).subscribe({
      next: (updated) => {
        this.cancellingId.set(null);
        this.bookings.update(list => list.map(x => x.id === updated.id ? updated : x));
        this.toastService.success('Booking cancelled');
      },
      error: (err) => {
        this.cancellingId.set(null);
        this.toastService.error('Cancellation failed', err.error?.message);
      },
    });
  }
}
