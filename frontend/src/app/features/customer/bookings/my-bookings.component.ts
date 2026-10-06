import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { HeaderComponent } from '../../../layout/header/header.component';
import { BookingService } from '../../../core/services/booking.service';
import { ReviewService } from '../../../core/services/review.service';
import { ToastService } from '../../../core/services/toast.service';
import { Booking, BookingStatus } from '../../../core/models/booking.model';
import { Review } from '../../../core/models/review.model';

type FilterTab = 'all' | 'pending_payment' | 'confirmed' | 'completed' | 'cancelled';

@Component({
  selector: 'app-my-bookings',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, HeaderComponent],
  template: `
    <div class="app-shell">
      <app-header />
      <main class="app-main">
        <div class="container">

          <div class="page-header" style="display:flex;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;gap:16px;">
            <div>
              <h1 class="page-header__title">My Bookings</h1>
              <p class="page-header__subtitle">Your upcoming and past turf sessions.</p>
            </div>
            <a routerLink="/turfs" class="btn btn--primary">Book a turf</a>
          </div>

          <!-- Filter tabs -->
          <div class="filter-tabs-row">
            @for (tab of tabs; track tab.value) {
              <button
                class="filter-tab"
                [class.active]="activeTab() === tab.value"
                (click)="setTab(tab.value)"
                [attr.aria-selected]="activeTab() === tab.value"
              >{{ tab.label }}</button>
            }
          </div>

          <!-- Loading -->
          @if (loading()) {
            <div style="display:flex;flex-direction:column;gap:12px;">
              @for (i of [1,2,3]; track i) {
                <div class="booking-row-skeleton">
                  <div class="skeleton" style="width:72px;height:72px;border-radius:10px;flex-shrink:0;"></div>
                  <div style="flex:1;display:flex;flex-direction:column;gap:8px;">
                    <div class="skeleton skeleton--title" style="max-width:280px;"></div>
                    <div class="skeleton skeleton--text" style="width:180px;"></div>
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
              <p class="empty-state__description">
                @if (activeTab() === 'all') { You haven't booked any sessions yet. } @else { No {{ activeTab().replace('_', ' ') }} bookings. }
              </p>
              <a routerLink="/turfs" class="btn btn--primary" style="margin-top:8px;">Find turfs</a>
            </div>
          }

          <!-- Booking list -->
          @if (!loading() && !loadError() && bookings().length > 0) {
            <div style="display:flex;flex-direction:column;gap:12px;">
              @for (b of bookings(); track b.id) {
                <div class="booking-card" [class.booking-card--cancelled]="b.status === 'cancelled'">
                  <!-- Thumbnail -->
                  <div class="booking-card__thumb">
                    @if (b.turf?.images?.length) {
                      <img [src]="b.turf!.images[0]" [alt]="b.turf?.name" loading="lazy"/>
                    } @else {
                      <div class="booking-card__thumb-placeholder">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
                      </div>
                    }
                  </div>

                  <!-- Info -->
                  <div class="booking-card__info">
                    <div class="booking-card__turf">{{ b.turf?.name ?? 'Turf' }}</div>
                    <div class="booking-card__slot">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                      {{ formatDate(b.date) }}
                    </div>
                    <div class="booking-card__slot">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                      {{ b.startTime }} – {{ b.endTime }} · {{ b.sport }}
                    </div>
                    <div style="margin-top:6px;display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
                      <span class="badge badge--{{ statusBadge(b.status) }}">{{ statusLabel(b.status) }}</span>
                      @if (b.status === 'pending_payment' && b.pendingExpiresAt) {
                        <span class="countdown-badge" [class.countdown-badge--urgent]="isUrgent(b.pendingExpiresAt)">
                          Expires {{ timeLeft(b.pendingExpiresAt) }}
                        </span>
                      }
                    </div>
                  </div>

                  <!-- Price + actions -->
                  <div class="booking-card__right">
                    <div class="booking-card__amount">₹{{ b.amount }}</div>
                    <div style="display:flex;flex-direction:column;gap:6px;align-items:flex-end;">
                      <a [routerLink]="['/bookings', b.id]" class="btn btn--ghost btn--sm">View</a>
                      @if (b.status === 'pending_payment' || b.status === 'confirmed') {
                        <button
                          class="btn btn--danger btn--sm"
                          [class.loading]="cancellingId() === b.id"
                          [disabled]="!!cancellingId()"
                          (click)="cancel(b)"
                        >Cancel</button>
                      }
                      @if (b.status === 'completed' || isEligibleForReview(b)) {
                        <button class="btn btn--secondary btn--sm" (click)="openReviewModal(b)">
                          {{ reviewedIds().has(b.id) ? '✏ Edit review' : '★ Review' }}
                        </button>
                      }
                    </div>
                  </div>
                </div>
              }
            </div>

            <!-- Pagination -->
            @if (totalPages() > 1) {
              <div class="pagination" style="margin-top:32px;">
                <button class="btn btn--ghost btn--sm" [disabled]="page() <= 1" (click)="changePage(page() - 1)">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
                  Prev
                </button>
                <span style="font-size:0.875rem;color:#6b7280;">Page {{ page() }} of {{ totalPages() }}</span>
                <button class="btn btn--ghost btn--sm" [disabled]="page() >= totalPages()" (click)="changePage(page() + 1)">
                  Next
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                </button>
              </div>
            }
          }

        </div>
      </main>
    </div>

    <!-- ── Review modal (Phase 6) ─────────────────────────────────────────── -->
    @if (reviewModal()) {
      <div class="modal-overlay" (click)="closeReviewModal()" role="dialog" aria-modal="true" aria-label="Write a review">
        <div class="modal-box" (click)="$event.stopPropagation()">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
            <h2 style="font-size:1rem;font-weight:700;color:#111827;">{{ reviewModal()!.existingReview ? 'Edit review' : 'Write a review' }}</h2>
            <button class="btn btn--ghost btn--sm" (click)="closeReviewModal()" aria-label="Close">✕</button>
          </div>
          <p style="font-size:0.875rem;color:#6b7280;margin-bottom:16px;">
            {{ reviewModal()!.booking.turf?.name }} · {{ formatDate(reviewModal()!.booking.date) }}
          </p>

          <!-- Star picker -->
          <div class="star-picker" style="margin-bottom:14px;">
            @for (star of [1,2,3,4,5]; track star) {
              <button type="button" class="star-btn"
                [class.active]="modalRating() >= star"
                (click)="modalRating.set(star)"
                [attr.aria-label]="star + ' star' + (star > 1 ? 's' : '')">★</button>
            }
          </div>

          <div class="form-group" style="margin-bottom:16px;">
            <label class="form-label">Comment <span style="color:#9ca3af;font-weight:400;">(optional)</span></label>
            <textarea class="form-control" rows="3" [(ngModel)]="modalComment"
              placeholder="Describe your experience…" maxlength="1000" style="resize:vertical;"></textarea>
          </div>

          @if (modalError()) {
            <div class="alert alert--error" style="font-size:0.875rem;margin-bottom:12px;">{{ modalError() }}</div>
          }

          <div style="display:flex;gap:10px;flex-wrap:wrap;">
            <button class="btn btn--primary"
              [class.loading]="modalSubmitting()"
              [disabled]="modalSubmitting() || modalRating() === 0"
              (click)="saveReview()">
              @if (!modalSubmitting()) { {{ reviewModal()!.existingReview ? 'Save changes' : 'Submit review' }} }
              @else { Saving… }
            </button>
            @if (reviewModal()!.existingReview) {
              <button class="btn btn--danger"
                [class.loading]="modalSubmitting()"
                [disabled]="modalSubmitting()"
                (click)="deleteReview()">Delete</button>
            }
            <button class="btn btn--ghost" (click)="closeReviewModal()">Cancel</button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .filter-tabs-row {
      display: flex; gap: 4px; background: #f3f4f6; padding: 4px;
      border-radius: 10px; flex-wrap: wrap; margin-bottom: 24px;
      width: fit-content;
    }
    .filter-tab {
      padding: 6px 14px; font-size: 0.8125rem; font-weight: 600; font-family: inherit;
      color: #6b7280; background: none; border: none; border-radius: 7px; cursor: pointer;
      transition: background 150ms ease, color 150ms ease; white-space: nowrap;
      &:hover { background: #e5e7eb; color: #374151; }
      &.active { background: white; color: #111827; box-shadow: 0 1px 3px rgb(0 0 0/.1); }
    }

    .booking-card {
      display: flex; align-items: center; gap: 16px;
      background: white; border: 1px solid #e5e7eb; border-radius: 12px;
      padding: 16px; box-shadow: 0 1px 2px rgb(0 0 0/.04);
      transition: box-shadow 200ms ease;
      &:hover { box-shadow: 0 4px 8px rgb(0 0 0/.07); }
      &--cancelled { opacity: 0.65; }
      @media (max-width: 640px) { flex-wrap: wrap; }
    }
    .booking-card__thumb {
      width: 72px; height: 72px; border-radius: 10px; overflow: hidden; flex-shrink: 0;
      background: #f3f4f6;
      img { width: 100%; height: 100%; object-fit: cover; display: block; }
    }
    .booking-card__thumb-placeholder {
      width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;
    }
    .booking-card__info { flex: 1; min-width: 0; }
    .booking-card__turf { font-weight: 700; color: #111827; font-size: 0.9375rem; margin-bottom: 4px; }
    .booking-card__slot { font-size: 0.8125rem; color: #6b7280; display: flex; align-items: center; gap: 5px; margin-bottom: 2px; }
    .booking-card__right { display: flex; flex-direction: column; align-items: flex-end; gap: 8px; flex-shrink: 0; }
    .booking-card__amount { font-size: 1.0625rem; font-weight: 800; color: #111827; }

    .countdown-badge {
      font-size: 0.6875rem; font-weight: 700; padding: 2px 8px; border-radius: 20px;
      background: #fffbeb; color: #92400e; border: 1px solid #fde68a;
      &--urgent { background: #fef2f2; color: #991b1b; border-color: #fecaca; }
    }

    .booking-row-skeleton { display: flex; align-items: center; gap: 16px; padding: 16px; background: white; border: 1px solid #e5e7eb; border-radius: 12px; }

    .pagination { display: flex; align-items: center; justify-content: center; gap: 16px; }

    /* Review modal */
    .modal-overlay { position:fixed;inset:0;background:rgb(0 0 0/.5);z-index:400;display:flex;align-items:center;justify-content:center;padding:16px; }
    .modal-box { background:white;border-radius:16px;padding:24px;width:100%;max-width:480px;box-shadow:0 20px 40px rgb(0 0 0/.15);max-height:90vh;overflow-y:auto; }
    .star-picker { display:flex;gap:4px; }
    .star-btn { background:none;border:none;font-size:2rem;cursor:pointer;color:#e5e7eb;line-height:1;padding:0 2px;transition:color 150ms;
      &.active { color:#f59e0b; }
      &:hover { color:#fbbf24; }
    }
  `],
})
export class MyBookingsComponent implements OnInit {
  private readonly bookingService = inject(BookingService);
  private readonly reviewService  = inject(ReviewService);
  private readonly toastService   = inject(ToastService);

  readonly bookings     = signal<Booking[]>([]);
  readonly loading      = signal(true);
  readonly loadError    = signal(false);
  readonly cancellingId = signal<string | null>(null);
  readonly activeTab    = signal<FilterTab>('all');
  readonly page         = signal(1);
  readonly totalPages   = signal(1);

  // ── Review modal state ────────────────────────────────────────────────────
  readonly reviewedIds     = signal<Set<string>>(new Set());
  readonly myReviews       = signal<Review[]>([]);
  readonly reviewModal     = signal<{ booking: Booking; existingReview: Review | null } | null>(null);
  readonly modalRating     = signal(0);
  readonly modalSubmitting = signal(false);
  readonly modalError      = signal('');
  modalComment             = '';

  readonly tabs: { label: string; value: FilterTab }[] = [
    { label: 'All',       value: 'all' },
    { label: 'Upcoming',  value: 'confirmed' },
    { label: 'Pending',   value: 'pending_payment' },
    { label: 'Done',      value: 'completed' },
    { label: 'Cancelled', value: 'cancelled' },
  ];

  ngOnInit(): void {
    this.load();
    this.loadMyReviews();
  }

  setTab(t: FilterTab): void { this.activeTab.set(t); this.page.set(1); this.load(); }
  changePage(p: number): void { this.page.set(p); this.load(); }

  load(): void {
    this.loading.set(true);
    this.loadError.set(false);
    const status = this.activeTab() === 'all' ? undefined : this.activeTab();
    this.bookingService.getMyBookings({ status, page: this.page() }).subscribe({
      next: (data) => {
        this.bookings.set(data.bookings);
        this.totalPages.set(data.pages);
        this.loading.set(false);
      },
      error: () => { this.loadError.set(true); this.loading.set(false); },
    });
  }

  loadMyReviews(): void {
    this.reviewService.getMyReviews().subscribe({
      next: (d) => {
        this.myReviews.set(d.reviews);
        this.reviewedIds.set(new Set(d.reviews.map(r => r.bookingId)));
      },
    });
  }

  openReviewModal(b: Booking): void {
    const existing = this.myReviews().find(r => r.bookingId === b.id) ?? null;
    this.modalRating.set(existing?.rating ?? 0);
    this.modalComment = existing?.comment ?? '';
    this.modalError.set('');
    this.reviewModal.set({ booking: b, existingReview: existing });
  }

  closeReviewModal(): void { this.reviewModal.set(null); }

  saveReview(): void {
    const modal = this.reviewModal();
    if (!modal || this.modalRating() === 0) return;
    this.modalSubmitting.set(true);
    this.modalError.set('');

    const op$ = modal.existingReview
      ? this.reviewService.update(modal.existingReview.id, { rating: this.modalRating(), comment: this.modalComment })
      : this.reviewService.create({ bookingId: modal.booking.id, rating: this.modalRating(), comment: this.modalComment });

    op$.subscribe({
      next: (saved) => {
        this.modalSubmitting.set(false);
        this.closeReviewModal();
        this.toastService.success(modal.existingReview ? 'Review updated' : 'Review submitted!');
        this.loadMyReviews();
      },
      error: (err: HttpErrorResponse) => {
        this.modalSubmitting.set(false);
        this.modalError.set(err.error?.message ?? 'Something went wrong.');
      },
    });
  }

  deleteReview(): void {
    const modal = this.reviewModal();
    if (!modal?.existingReview || !confirm('Delete your review?')) return;
    this.modalSubmitting.set(true);
    this.reviewService.delete(modal.existingReview.id).subscribe({
      next: () => {
        this.modalSubmitting.set(false);
        this.closeReviewModal();
        this.toastService.success('Review deleted');
        this.loadMyReviews();
      },
      error: () => this.modalSubmitting.set(false),
    });
  }

  formatDate(iso: string): string {
    if (!iso) return '';
    return new Date(iso).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  }

  statusBadge(s: BookingStatus): string {
    switch (s) {
      case 'confirmed':      return 'success';
      case 'cancelled':      return 'error';
      case 'completed':      return 'neutral';
      case 'pending_payment': return 'pending';
      default:               return 'neutral';
    }
  }

  statusLabel(s: BookingStatus): string {
    return s === 'pending_payment' ? 'Pending payment' : s.charAt(0).toUpperCase() + s.slice(1);
  }

  timeLeft(expiresAt: string): string {
    const diff = new Date(expiresAt).getTime() - Date.now();
    if (diff <= 0) return 'soon';
    const mins = Math.floor(diff / 60000);
    const secs = Math.floor((diff % 60000) / 1000);
    return mins > 0 ? `in ${mins}m ${secs}s` : `in ${secs}s`;
  }

  isUrgent(expiresAt: string): boolean {
    return new Date(expiresAt).getTime() - Date.now() < 2 * 60 * 1000;
  }

  /**
   * A booking is eligible for review if it has been paid (paymentId is set)
   * and status is 'completed' or 'confirmed'.
   * Pending, cancelled bookings are excluded.
   */
  isEligibleForReview(b: Booking): boolean {
    if (!b.paymentId) return false;
    return b.status === 'completed' || b.status === 'confirmed';
  }

  cancel(b: Booking): void {
    if (!confirm(`Cancel your booking at ${b.turf?.name ?? 'this turf'} on ${this.formatDate(b.date)}?`)) return;
    this.cancellingId.set(b.id);
    this.bookingService.cancelBooking(b.id).subscribe({
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
