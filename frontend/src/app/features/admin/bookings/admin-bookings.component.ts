import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';

import { HeaderComponent } from '../../../layout/header/header.component';
import { BookingService } from '../../../core/services/booking.service';
import { Booking, BookingStatus } from '../../../core/models/booking.model';

type FilterStatus = 'all' | 'pending_payment' | 'confirmed' | 'completed' | 'cancelled';

@Component({
  selector: 'app-admin-bookings',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, HeaderComponent],
  template: `
    <div class="app-shell">
      <app-header />
      <main class="app-main">
        <div class="container">

          <!-- Page header -->
          <div class="page-header"
               style="display:flex;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;gap:16px;margin-bottom:32px;">
            <div>
              <h1 class="page-header__title">All Bookings</h1>
              <p class="page-header__subtitle">Platform-wide booking management.</p>
            </div>
            @if (!loading()) {
              <div class="badge badge--neutral" style="font-size:0.875rem;padding:6px 14px;">
                {{ total() }} total
              </div>
            }
          </div>

          <!-- Filters row -->
          <div class="approvals-filters">
            <!-- Search by turf ID or customer (currently turf filter) -->
            <div class="input-wrapper" style="flex:1;min-width:220px;max-width:360px;">
              <span class="input-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                     stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
              </span>
              <input
                type="search"
                class="form-control has-icon-left"
                placeholder="Filter by turf ID…"
                [(ngModel)]="turfIdFilter"
                (ngModelChange)="onFilterChange()"
                aria-label="Filter by turf ID"
              />
            </div>

            <!-- Status tabs -->
            <div class="approvals-filters__tabs" role="tablist">
              @for (tab of tabs; track tab.value) {
                <button
                  class="filter-tab"
                  [class.active]="activeStatus() === tab.value"
                  (click)="setStatus(tab.value)"
                  role="tab"
                  [attr.aria-selected]="activeStatus() === tab.value"
                >{{ tab.label }}</button>
              }
            </div>
          </div>

          <!-- Loading skeleton -->
          @if (loading()) {
            <div class="owners-table-wrap">
              @for (i of [1,2,3,4,5]; track i) {
                <div class="owner-row-skeleton">
                  <div class="skeleton" style="height:18px;width:35%;border-radius:6px;"></div>
                  <div class="skeleton" style="height:14px;width:22%;border-radius:6px;"></div>
                  <div class="skeleton" style="height:24px;width:80px;border-radius:20px;"></div>
                </div>
              }
            </div>
          }

          <!-- Error -->
          @if (!loading() && loadError()) {
            <div class="alert alert--error" role="alert">
              <svg class="alert__icon" width="18" height="18" viewBox="0 0 24 24" fill="none"
                   stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              Failed to load bookings.
              <button class="btn btn--link" style="font-size:inherit;" (click)="load()">Retry</button>
            </div>
          }

          <!-- Empty -->
          @if (!loading() && !loadError() && bookings().length === 0) {
            <div class="empty-state" style="padding:64px 24px;">
              <svg class="empty-state__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                   stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              <div class="empty-state__title">No bookings found</div>
              <p class="empty-state__description">
                @if (activeStatus() !== 'all') {
                  No {{ statusLabel(activeStatus()) }} bookings.
                } @else {
                  No bookings have been made yet.
                }
              </p>
            </div>
          }

          <!-- Table -->
          @if (!loading() && !loadError() && bookings().length > 0) {
            <div class="owners-table-wrap">
              <table class="owners-table" aria-label="All bookings">
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>Turf</th>
                    <th>Date &amp; Time</th>
                    <th>Sport</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Booked</th>
                    <th class="th-actions">Detail</th>
                  </tr>
                </thead>
                <tbody>
                  @for (b of bookings(); track b.id) {
                    <tr class="owner-row"
                        [class.owner-row--pending]="b.status === 'pending_payment'">
                      <!-- Customer -->
                      <td>
                        <div class="owner-cell__name">{{ b.customer?.name ?? '—' }}</div>
                        <div class="owner-cell__email">{{ b.customer?.email ?? '' }}</div>
                      </td>

                      <!-- Turf -->
                      <td>
                        <div class="owner-cell__name">{{ b.turf?.name ?? '—' }}</div>
                        <div class="owner-cell__email">
                          {{ b.turf?.address?.city ?? '' }}
                        </div>
                      </td>

                      <!-- Date & time -->
                      <td>
                        <div class="owner-cell__name" style="white-space:nowrap;">
                          {{ formatDate(b.date) }}
                        </div>
                        <div class="owner-cell__email">
                          {{ b.startTime }} – {{ b.endTime }}
                        </div>
                      </td>

                      <!-- Sport -->
                      <td style="font-size:0.875rem;color:#374151;">{{ b.sport }}</td>

                      <!-- Amount -->
                      <td style="font-weight:700;color:#111827;white-space:nowrap;">
                        ₹{{ b.amount }}
                      </td>

                      <!-- Status -->
                      <td>
                        <span class="badge badge--{{ statusBadge(b.status) }}">
                          {{ statusLabel(b.status) }}
                        </span>
                        @if (b.status === 'cancelled' && b.cancelledBy) {
                          <div style="font-size:0.75rem;color:#9ca3af;margin-top:3px;">
                            by {{ b.cancelledBy }}
                          </div>
                        }
                      </td>

                      <!-- Booked at -->
                      <td class="td-date">{{ formatDate(b.createdAt) }}</td>

                      <!-- Actions -->
                      <td class="td-actions">
                        <a [routerLink]="['/bookings', b.id]" class="btn btn--ghost btn--sm">
                          View
                        </a>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>

            <!-- Pagination -->
            @if (totalPages() > 1) {
              <div class="pagination" style="margin-top:24px;">
                <button
                  class="btn btn--ghost btn--sm"
                  [disabled]="page() <= 1"
                  (click)="changePage(page() - 1)"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                       stroke="currentColor" stroke-width="2"
                       stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="15 18 9 12 15 6"/>
                  </svg>
                  Prev
                </button>
                <span style="font-size:0.875rem;color:#6b7280;">
                  Page {{ page() }} of {{ totalPages() }}
                </span>
                <button
                  class="btn btn--ghost btn--sm"
                  [disabled]="page() >= totalPages()"
                  (click)="changePage(page() + 1)"
                >
                  Next
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                       stroke="currentColor" stroke-width="2"
                       stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="9 18 15 12 9 6"/>
                  </svg>
                </button>
              </div>
            }
          }

        </div>
      </main>
    </div>
  `,
  styles: [`
    /* ── Reuse admin Phase 1/2 patterns exactly ── */
    .approvals-filters {
      display: flex; align-items: center; gap: 16px; flex-wrap: wrap; margin-bottom: 24px;
    }
    .approvals-filters__tabs {
      display: flex; gap: 4px; background: #f3f4f6; padding: 4px; border-radius: 10px;
    }
    .filter-tab {
      display: flex; align-items: center; gap: 6px; padding: 6px 14px;
      font-size: 0.8125rem; font-weight: 600; font-family: inherit; color: #6b7280;
      background: none; border: none; border-radius: 7px; cursor: pointer;
      transition: background 150ms ease, color 150ms ease; white-space: nowrap;
      &:hover { background: #e5e7eb; color: #374151; }
      &.active { background: white; color: #111827; box-shadow: 0 1px 3px rgb(0 0 0 / 0.1); }
    }

    .owners-table-wrap {
      background: white; border: 1px solid #e5e7eb; border-radius: 12px;
      overflow: hidden; box-shadow: 0 1px 2px rgb(0 0 0 / 0.05);
    }
    .owners-table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
    .owners-table th {
      padding: 12px 16px; text-align: left; font-size: 0.75rem; font-weight: 600;
      color: #6b7280; text-transform: uppercase; letter-spacing: 0.04em;
      background: #f9fafb; border-bottom: 1px solid #e5e7eb;
    }
    .owners-table td {
      padding: 14px 16px; border-bottom: 1px solid #f3f4f6;
      vertical-align: middle; color: #374151;
    }
    .owner-row:last-child td { border-bottom: none; }
    .owner-row:hover td { background: #fafafa; }
    .owner-row--pending td { background: #fffbeb; }
    .owner-row--pending:hover td { background: #fef3c7; }
    .th-actions, .td-actions { text-align: right; }
    .td-date { white-space: nowrap; color: #6b7280; font-size: 0.8125rem; }
    .owner-cell__name { font-weight: 600; color: #111827; }
    .owner-cell__email { font-size: 0.8125rem; color: #6b7280; }

    .owner-row-skeleton {
      display: flex; align-items: center; gap: 24px; padding: 16px;
      border-bottom: 1px solid #f3f4f6;
      &:last-child { border-bottom: none; }
    }

    .pagination {
      display: flex; align-items: center; justify-content: center; gap: 16px;
    }

    /* Hide less-critical columns on small viewports */
    @media (max-width: 960px) {
      .owners-table th:nth-child(4), .owners-table td:nth-child(4),
      .owners-table th:nth-child(7), .owners-table td:nth-child(7) { display: none; }
    }
    @media (max-width: 640px) {
      .owners-table th:nth-child(2), .owners-table td:nth-child(2),
      .owners-table th:nth-child(5), .owners-table td:nth-child(5) { display: none; }
    }
  `],
})
export class AdminBookingsComponent implements OnInit {
  private readonly bookingService = inject(BookingService);

  readonly bookings   = signal<Booking[]>([]);
  readonly loading    = signal(true);
  readonly loadError  = signal(false);
  readonly total      = signal(0);
  readonly page       = signal(1);
  readonly totalPages = signal(1);
  readonly activeStatus = signal<FilterStatus>('all');

  turfIdFilter = '';
  private _debounce: ReturnType<typeof setTimeout> | null = null;

  readonly tabs: { label: string; value: FilterStatus }[] = [
    { label: 'All',       value: 'all' },
    { label: 'Confirmed', value: 'confirmed' },
    { label: 'Pending',   value: 'pending_payment' },
    { label: 'Completed', value: 'completed' },
    { label: 'Cancelled', value: 'cancelled' },
  ];

  ngOnInit(): void { this.load(); }

  setStatus(s: FilterStatus): void {
    this.activeStatus.set(s);
    this.page.set(1);
    this.load();
  }

  onFilterChange(): void {
    if (this._debounce) clearTimeout(this._debounce);
    this._debounce = setTimeout(() => {
      this.page.set(1);
      this.load();
    }, 400);
  }

  changePage(p: number): void {
    this.page.set(p);
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.loadError.set(false);
    const status = this.activeStatus() === 'all' ? undefined : this.activeStatus();
    this.bookingService.adminGetBookings({
      status,
      turfId: this.turfIdFilter.trim() || undefined,
      page:   this.page(),
      limit:  30,
    }).subscribe({
      next: (data) => {
        this.bookings.set(data.bookings);
        this.total.set(data.total);
        this.totalPages.set(data.pages);
        this.loading.set(false);
      },
      error: () => {
        this.loadError.set(true);
        this.loading.set(false);
      },
    });
  }

  formatDate(iso: string): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric',
    });
  }

  statusBadge(s: BookingStatus): string {
    switch (s) {
      case 'confirmed':       return 'success';
      case 'cancelled':       return 'error';
      case 'completed':       return 'neutral';
      case 'pending_payment': return 'pending';
      default:                return 'neutral';
    }
  }

  statusLabel(s: string): string {
    return s === 'pending_payment' ? 'Pending' : s.charAt(0).toUpperCase() + s.slice(1);
  }
}
