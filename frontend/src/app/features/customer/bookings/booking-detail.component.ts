import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { HeaderComponent } from '../../../layout/header/header.component';
import { UpiPaymentComponent } from '../../../shared/components/upi-payment/upi-payment.component';
import { BookingService } from '../../../core/services/booking.service';
import { ReviewService } from '../../../core/services/review.service';
import { PaymentService } from '../../../core/services/payment.service';
import { ToastService } from '../../../core/services/toast.service';
import { Booking, BookingStatus } from '../../../core/models/booking.model';
import { Review } from '../../../core/models/review.model';
import { SPORT_TYPE_LABELS, SportType } from '../../../core/models/turf.model';

@Component({
  selector: 'app-booking-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, HeaderComponent, UpiPaymentComponent],
  template: `
    <div class="app-shell">
      <app-header />
      <main class="app-main">
        <div class="container" style="max-width:680px;">

          <a routerLink="/bookings/my"
             style="display:inline-flex;align-items:center;gap:6px;font-size:0.875rem;font-weight:500;color:#6b7280;text-decoration:none;margin-bottom:20px;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
            My Bookings
          </a>

          @if (loading()) {
            <div style="display:flex;justify-content:center;padding:64px;"><div class="spinner"></div></div>
          }

          @if (!loading() && !booking()) {
            <div class="empty-state">
              <div class="empty-state__title">Booking not found</div>
              <p class="empty-state__description">This booking may have been removed or is not accessible.</p>
              <a routerLink="/bookings/my" class="btn btn--primary" style="margin-top:8px;">View my bookings</a>
            </div>
          }

          @if (!loading() && booking()) {
            <!-- Status header -->
            <div class="booking-detail-header">
              <div class="booking-status-icon booking-status-icon--{{ statusColor(booking()!.status) }}">
                @switch (booking()!.status) {
                  @case ('confirmed') {
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                  }
                  @case ('pending_payment') {
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  }
                  @case ('cancelled') {
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                  }
                  @default {
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                  }
                }
              </div>
              <div>
                <div style="font-size:1.375rem;font-weight:800;color:#111827;margin-bottom:4px;">
                  Booking {{ statusLabel(booking()!.status) }}
                </div>
                <span class="badge badge--{{ statusBadge(booking()!.status) }}" style="font-size:0.8125rem;">
                  {{ statusLabel(booking()!.status) }}
                </span>
              </div>
            </div>

            <!-- Expiry countdown for pending_payment -->
            @if (booking()!.status === 'pending_payment' && booking()!.pendingExpiresAt) {
              <div class="alert alert--warning" style="margin-bottom:20px;">
                <svg class="alert__icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                <span>Slot reserved — expires {{ timeLeft(booking()!.pendingExpiresAt!) }}. Payment required to confirm.</span>
              </div>
            }

            <!-- Turf info card -->
            <div class="card" style="margin-bottom:20px;">
              <div class="card__body" style="display:flex;gap:16px;align-items:center;">
                @if (booking()!.turf?.images?.length) {
                  <img [src]="booking()!.turf!.images[0]" [alt]="booking()!.turf?.name"
                       style="width:72px;height:72px;border-radius:10px;object-fit:cover;flex-shrink:0;" loading="lazy"/>
                }
                <div>
                  <div style="font-weight:700;color:#111827;font-size:1rem;margin-bottom:4px;">{{ booking()!.turf?.name ?? '—' }}</div>
                  @if (booking()!.turf?.address) {
                    <div style="font-size:0.875rem;color:#6b7280;">
                      {{ booking()!.turf?.address?.city }}{{ booking()!.turf?.address?.state ? ', ' + booking()!.turf?.address?.state : '' }}
                    </div>
                  }
                  <a [routerLink]="['/turfs', booking()!.turfId]" class="btn btn--link" style="font-size:0.8125rem;padding:4px 0 0;">
                    View turf →
                  </a>
                </div>
              </div>
            </div>

            <!-- Booking details -->
            <div class="card" style="margin-bottom:20px;">
              <div class="card__header"><h2 style="font-size:0.9375rem;font-weight:700;color:#111827;">Booking Details</h2></div>
              <div class="card__body">
                <dl class="detail-dl">
                  <div class="detail-dl__row">
                    <dt>Date</dt><dd>{{ formatDate(booking()!.date) }}</dd>
                  </div>
                  <div class="detail-dl__row">
                    <dt>Time</dt><dd>{{ booking()!.startTime }} – {{ booking()!.endTime }}</dd>
                  </div>
                  <div class="detail-dl__row">
                    <dt>Sport</dt><dd>{{ sportLabel(booking()!.sport) }}</dd>
                  </div>
                  <!-- Payment breakdown -->
                  <div class="detail-dl__row">
                    <dt>Booking amount</dt><dd>₹{{ booking()!.amount }}</dd>
                  </div>
                  @if (platformFeePercent() > 0) {
                    <div class="detail-dl__row">
                      <dt>Platform fee ({{ platformFeePercent() }}%)</dt>
                      <dd>₹{{ feeAmount(booking()!.amount) }}</dd>
                    </div>
                  }
                  <div class="detail-dl__row detail-dl__row--total">
                    <dt>Total paid</dt>
                    <dd style="font-size:1.125rem;font-weight:800;color:#16a34a;">
                      ₹{{ booking()!.amount + feeAmount(booking()!.amount) }}
                    </dd>
                  </div>
                  <div class="detail-dl__row">
                    <dt>Booking ID</dt><dd style="font-family:monospace;font-size:0.8125rem;">{{ booking()!.id }}</dd>
                  </div>
                  <div class="detail-dl__row">
                    <dt>Booked on</dt><dd>{{ formatDate(booking()!.createdAt) }}</dd>
                  </div>
                  @if (booking()!.status === 'cancelled') {
                    <div class="detail-dl__row">
                      <dt>Cancelled by</dt><dd>{{ booking()!.cancelledBy ?? '—' }}</dd>
                    </div>
                    @if (booking()!.cancellationReason) {
                      <div class="detail-dl__row">
                        <dt>Reason</dt><dd>{{ booking()!.cancellationReason }}</dd>
                      </div>
                    }
                    @if (booking()!.paymentId) {
                      <div class="detail-dl__row" style="color:#16a34a;">
                        <dt>Refund</dt><dd><strong>Full refund processed</strong></dd>
                      </div>
                    }
                  }
                </dl>
              </div>
            </div>

            <!-- Actions -->
            @if (booking()!.status === 'pending_payment') {
              @if (!paymentDone()) {
                <div class="alert alert--warning" style="margin-bottom:16px;">
                  <svg class="alert__icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  <span>Slot reserved — expires {{ timeLeft(booking()!.pendingExpiresAt!) }}. Complete payment to confirm.</span>
                </div>
                <app-upi-payment
                  [bookingId]="booking()!.id"
                  (confirmed)="onPaymentConfirmed()"
                />
              } @else {
                <div class="alert alert--success">
                  <svg class="alert__icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                  <span><strong>Payment confirmed!</strong> Your booking is now active.</span>
                </div>
              }
            }

            @if (booking()!.status === 'confirmed' && !paying()) {
              <div class="alert alert--success" style="margin-bottom:16px;">
                <svg class="alert__icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                <span>This booking is confirmed and paid.</span>
              </div>
            }

            @if (paymentError()) {
              <div class="alert alert--error" style="margin-top:12px;" role="alert">{{ paymentError() }}</div>
            }

            <!-- Cancel button -->
            @if (booking()!.status === 'pending_payment' || booking()!.status === 'confirmed') {
              <div style="margin-top:16px;display:flex;gap:12px;flex-wrap:wrap;align-items:center;">
                <button
                  class="btn btn--danger"
                  [class.loading]="cancelling()"
                  [disabled]="cancelling() || paying()"
                  (click)="cancel()"
                >
                  Cancel booking
                </button>
                <!-- Review button for past confirmed+paid bookings -->
                @if (isEligibleForReview()) {
                  <button class="btn btn--secondary" (click)="openReviewModal()">
                    {{ existingReview() ? '✏ Edit review' : '★ Write a review' }}
                  </button>
                }
              </div>
            }

            @if (serverError()) {
              <div class="alert alert--error" style="margin-top:16px;" role="alert">{{ serverError() }}</div>
            }
          }

        </div>
      </main>
    </div>

    <!-- Review modal -->
    @if (showReviewModal()) {
      <div class="modal-overlay" (click)="closeReviewModal()" role="dialog" aria-modal="true">
        <div class="modal-box" (click)="$event.stopPropagation()">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
            <h2 style="font-size:1rem;font-weight:700;color:#111827;">
              {{ existingReview() ? 'Edit review' : 'Write a review' }}
            </h2>
            <button class="btn btn--ghost btn--sm" (click)="closeReviewModal()" aria-label="Close">✕</button>
          </div>
          <p style="font-size:0.875rem;color:#6b7280;margin-bottom:16px;">
            {{ booking()!.turf?.name }} · {{ formatDate(booking()!.date) }}
          </p>

          <div class="star-picker" style="margin-bottom:14px;">
            @for (star of [1,2,3,4,5]; track star) {
              <button type="button" class="star-btn" [class.active]="reviewRating() >= star"
                (click)="reviewRating.set(star)"
                [attr.aria-label]="star + ' star' + (star > 1 ? 's' : '')">★</button>
            }
          </div>

          <div class="form-group" style="margin-bottom:16px;">
            <label class="form-label">Comment <span style="color:#9ca3af;font-weight:400;">(optional)</span></label>
            <textarea class="form-control" rows="3" [(ngModel)]="reviewComment"
              placeholder="Describe your experience…" maxlength="1000" style="resize:vertical;"></textarea>
          </div>

          @if (reviewError()) {
            <div class="alert alert--error" style="font-size:0.875rem;margin-bottom:12px;">{{ reviewError() }}</div>
          }

          <div style="display:flex;gap:10px;flex-wrap:wrap;">
            <button class="btn btn--primary"
              [class.loading]="reviewSubmitting()"
              [disabled]="reviewSubmitting() || reviewRating() === 0"
              (click)="saveReview()">
              @if (!reviewSubmitting()) { {{ existingReview() ? 'Save changes' : 'Submit review' }} }
              @else { Saving… }
            </button>
            @if (existingReview()) {
              <button class="btn btn--danger"
                [class.loading]="reviewSubmitting()"
                [disabled]="reviewSubmitting()"
                (click)="deleteReview()">Delete</button>
            }
            <button class="btn btn--ghost" (click)="closeReviewModal()">Cancel</button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .booking-detail-header {
      display: flex; align-items: center; gap: 16px;
      margin-bottom: 24px; padding: 20px;
      background: white; border: 1px solid #e5e7eb; border-radius: 12px;
    }

    .booking-status-icon {
      width: 56px; height: 56px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center; flex-shrink: 0;
      &--green  { background: #f0fdf4; color: #16a34a; }
      &--amber  { background: #fffbeb; color: #d97706; }
      &--red    { background: #fef2f2; color: #dc2626; }
      &--gray   { background: #f3f4f6; color: #6b7280; }
    }

    .detail-dl { display: flex; flex-direction: column; gap: 12px; }
    .detail-dl__row {
      display: flex; justify-content: space-between; align-items: baseline; gap: 16px;
      font-size: 0.875rem;
      dt { color: #6b7280; font-weight: 500; flex-shrink: 0; }
      dd { color: #111827; font-weight: 500; text-align: right; margin: 0; }
    }
    .detail-dl__row--total { padding-top: 12px; border-top: 1px solid #f3f4f6; }

    /* Review modal */
    .modal-overlay { position:fixed;inset:0;background:rgb(0 0 0/.5);z-index:400;display:flex;align-items:center;justify-content:center;padding:16px; }
    .modal-box { background:white;border-radius:16px;padding:24px;width:100%;max-width:480px;box-shadow:0 20px 40px rgb(0 0 0/.15);max-height:90vh;overflow-y:auto; }
    .star-picker { display:flex;gap:4px; }
    .star-btn { background:none;border:none;font-size:2rem;cursor:pointer;color:#e5e7eb;line-height:1;padding:0 2px;transition:color 150ms;
      &.active { color:#f59e0b; }
      &:hover  { color:#fbbf24; }
    }
  `],
})
export class BookingDetailComponent implements OnInit {
  private readonly bookingService = inject(BookingService);
  private readonly reviewService  = inject(ReviewService);
  private readonly paymentService = inject(PaymentService);
  private readonly toastService   = inject(ToastService);
  private readonly route          = inject(ActivatedRoute);

  readonly loading      = signal(true);
  readonly booking      = signal<Booking | null>(null);
  readonly cancelling   = signal(false);
  readonly serverError  = signal('');
  readonly paying       = signal(false);
  readonly paymentDone  = signal(false);
  readonly paymentError = signal('');

  // ── Platform fee ──────────────────────────────────────────────────────────
  readonly platformFeePercent = signal(0);

  // ── Review state ─────────────────────────────────────────────────────────
  readonly existingReview   = signal<Review | null>(null);
  readonly showReviewModal  = signal(false);
  readonly reviewRating     = signal(0);
  readonly reviewSubmitting = signal(false);
  readonly reviewError      = signal('');
  reviewComment = '';

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.bookingService.getBookingById(id).subscribe({
      next: (b) => {
        this.booking.set(b);
        this.loading.set(false);
        // Load review if eligible
        if (b.paymentId) this.loadExistingReview();
      },
      error: () => { this.booking.set(null); this.loading.set(false); },
    });
    // Fetch platform fee (non-blocking)
    this.bookingService.getPlatformFeePercent().subscribe({
      next: (pct) => this.platformFeePercent.set(pct),
      error: () => {},
    });
  }

  private loadExistingReview(): void {
    this.reviewService.getMyReviews().subscribe({
      next: (d) => {
        const b = this.booking();
        if (!b) return;
        const mine = d.reviews.find(r => r.bookingId === b.id) ?? null;
        this.existingReview.set(mine);
      },
    });
  }

  /** Platform fee in rupees for a given base amount. */
  feeAmount(base: number): number {
    return Math.round(base * (this.platformFeePercent() / 100));
  }

  /**
   * Eligible to review if booking is paid (paymentId set) AND
   * status is 'confirmed' or 'completed'.
   */
  isEligibleForReview(): boolean {
    const b = this.booking();
    if (!b || !b.paymentId) return false;
    return b.status === 'confirmed' || b.status === 'completed';
  }

  openReviewModal(): void {
    const r = this.existingReview();
    this.reviewRating.set(r?.rating ?? 0);
    this.reviewComment = r?.comment ?? '';
    this.reviewError.set('');
    this.showReviewModal.set(true);
  }

  closeReviewModal(): void { this.showReviewModal.set(false); }

  saveReview(): void {
    const b = this.booking();
    if (!b || this.reviewRating() === 0) return;
    this.reviewSubmitting.set(true);
    this.reviewError.set('');

    const op$ = this.existingReview()
      ? this.reviewService.update(this.existingReview()!.id, { rating: this.reviewRating(), comment: this.reviewComment })
      : this.reviewService.create({ bookingId: b.id, rating: this.reviewRating(), comment: this.reviewComment });

    op$.subscribe({
      next: (saved) => {
        this.reviewSubmitting.set(false);
        this.existingReview.set(saved);
        this.closeReviewModal();
        this.toastService.success(this.existingReview() ? 'Review updated' : 'Review submitted!');
      },
      error: (err: HttpErrorResponse) => {
        this.reviewSubmitting.set(false);
        this.reviewError.set(err.error?.message ?? 'Something went wrong.');
      },
    });
  }

  deleteReview(): void {
    const r = this.existingReview();
    if (!r || !confirm('Delete your review?')) return;
    this.reviewSubmitting.set(true);
    this.reviewService.delete(r.id).subscribe({
      next: () => {
        this.reviewSubmitting.set(false);
        this.existingReview.set(null);
        this.closeReviewModal();
        this.toastService.success('Review deleted');
      },
      error: () => this.reviewSubmitting.set(false),
    });
  }

  /** Translate raw DB sport value to human-readable label. */
  sportLabel(sport: string): string {
    return SPORT_TYPE_LABELS[sport as SportType] ?? sport;
  }

  formatDate(iso: string): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  }

  statusBadge(s: BookingStatus): string {
    return s === 'confirmed' ? 'success' : s === 'cancelled' ? 'error' : s === 'completed' ? 'neutral' : 'pending';
  }

  statusColor(s: BookingStatus): string {
    return s === 'confirmed' || s === 'completed' ? 'green' : s === 'cancelled' ? 'red' : 'amber';
  }

  statusLabel(s: BookingStatus): string {
    return s === 'pending_payment' ? 'Pending payment' : s.charAt(0).toUpperCase() + s.slice(1);
  }

  timeLeft(expiresAt: string): string {
    const diff = new Date(expiresAt).getTime() - Date.now();
    if (diff <= 0) return 'very soon';
    const mins = Math.floor(diff / 60000);
    const secs = Math.floor((diff % 60000) / 1000);
    return mins > 0 ? `in ${mins}m ${secs}s` : `in ${secs}s`;
  }

  onPaymentConfirmed(): void {
    this.paymentDone.set(true);
    this.booking.update(b => b ? { ...b, status: 'confirmed' } : b);
    this.toastService.success('Booking confirmed!', 'Your payment has been recorded.');
  }

  pay(): void {
    const b = this.booking();
    if (!b) return;
    this.paying.set(true);
    this.paymentError.set('');
    this.paymentService.createOrder(b.id).subscribe({
      next: (order) => {
        this.paymentService.openCheckout(order).subscribe({
          next: (dto) => {
            this.paymentService.verifyPayment(dto).subscribe({
              next: () => {
                this.paying.set(false);
                this.paymentDone.set(true);
                this.booking.update(bk => bk ? { ...bk, status: 'confirmed' } : bk);
                this.toastService.success('Payment successful!', 'Your booking is confirmed.');
              },
              error: (err: HttpErrorResponse) => {
                this.paying.set(false);
                this.paymentError.set(err.error?.message ?? 'Verification failed. Contact support.');
              },
            });
          },
          error: (err: { code?: string; message?: string }) => {
            this.paying.set(false);
            if (err?.code !== 'PAYMENT_DISMISSED') {
              this.paymentError.set(err?.message ?? 'Payment failed. Please try again.');
            }
          },
        });
      },
      error: (err: HttpErrorResponse) => {
        this.paying.set(false);
        this.paymentError.set(err.error?.message ?? 'Could not initiate payment.');
      },
    });
  }

  cancel(): void {
    const b = this.booking();
    if (!b) return;
    const wasPaid = b.status === 'confirmed' && !!b.paymentId;
    if (!confirm('Are you sure you want to cancel this booking?' +
        (wasPaid ? '\n\nA full refund will be simulated.' : ''))) return;
    this.cancelling.set(true);
    this.serverError.set('');
    this.bookingService.cancelBooking(b.id).subscribe({
      next: (updated) => {
        this.booking.set(updated);
        this.cancelling.set(false);
        if (wasPaid) {
          this.toastService.success('Booking cancelled', 'A full refund has been processed.');
        } else {
          this.toastService.success('Booking cancelled');
        }
      },
      error: (err) => {
        this.cancelling.set(false);
        this.serverError.set(err.error?.message ?? 'Cancellation failed.');
      },
    });
  }
}
