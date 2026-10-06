import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';

import { HeaderComponent } from '../../../layout/header/header.component';
import { SlotPickerComponent } from '../../../shared/components/slot-picker/slot-picker.component';
import { UpiPaymentComponent } from '../../../shared/components/upi-payment/upi-payment.component';
import { TurfService } from '../../../core/services/turf.service';
import { BookingService } from '../../../core/services/booking.service';
import { PaymentService } from '../../../core/services/payment.service';
import { ToastService } from '../../../core/services/toast.service';
import { Turf, SPORT_TYPE_LABELS, SportType } from '../../../core/models/turf.model';
import { Slot, Booking } from '../../../core/models/booking.model';

@Component({
  selector: 'app-booking-form',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, HeaderComponent, SlotPickerComponent, UpiPaymentComponent],
  template: `
    <div class="app-shell">
      <app-header />
      <main class="app-main">
        <div class="container" style="max-width:900px;">

          <!-- Back -->
          <a [routerLink]="['/turfs', turfId]"
             style="display:inline-flex;align-items:center;gap:6px;font-size:0.875rem;font-weight:500;color:#6b7280;text-decoration:none;margin-bottom:20px;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
            Back to turf
          </a>

          <!-- Loading turf -->
          @if (loadingTurf()) {
            <div style="display:flex;justify-content:center;padding:64px;">
              <div class="spinner"></div>
            </div>
          }

          @if (!loadingTurf() && !turf()) {
            <div class="alert alert--error" role="alert">
              <svg class="alert__icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              Turf not found.
              <a routerLink="/turfs" class="btn btn--link" style="font-size:inherit;">Browse turfs</a>
            </div>
          }

          @if (!loadingTurf() && turf()) {
            <div class="page-header">
              <h1 class="page-header__title">Book a slot</h1>
              <p class="page-header__subtitle">{{ turf()!.name }}</p>
            </div>

            <!-- Booking confirmed state -->
            @if (booking()) {
              <div class="booking-confirmed-card">
                <div style="display:flex;flex-direction:column;align-items:center;text-align:center;gap:16px;padding:40px 24px;">
                  <div style="width:72px;height:72px;background:#f0fdf4;border-radius:50%;display:flex;align-items:center;justify-content:center;">
                    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                  </div>
                  <div>
                    <h2 style="font-size:1.5rem;font-weight:800;color:#111827;margin-bottom:6px;">Slot reserved!</h2>
                    <p style="color:#6b7280;line-height:1.6;max-width:400px;margin:0 auto;">
                      Your slot has been reserved for 10 minutes.
                      Complete payment to confirm your booking.
                    </p>
                  </div>

                  <div class="booking-receipt">
                    <div class="booking-receipt__row">
                      <span>Turf</span><strong>{{ turf()!.name }}</strong>
                    </div>
                    <div class="booking-receipt__row">
                      <span>Date</span><strong>{{ formatDate(booking()!.date) }}</strong>
                    </div>
                    <div class="booking-receipt__row">
                      <span>Time</span><strong>{{ booking()!.startTime }} – {{ booking()!.endTime }}</strong>
                    </div>
                    <div class="booking-receipt__row">
                      <span>Sport</span><strong>{{ booking()!.sport }}</strong>
                    </div>
                    <div class="booking-receipt__row booking-receipt__row--total">
                      <span>Booking amount</span><strong>₹{{ booking()!.amount }}</strong>
                    </div>
                    @if (platformFeePercent() > 0) {
                      <div class="booking-receipt__row" style="font-size:0.8125rem;">
                        <span>Platform fee ({{ platformFeePercent() }}%)</span>
                        <span>₹{{ feeAmount(booking()!.amount) }}</span>
                      </div>
                      <div class="booking-receipt__row" style="font-weight:700;border-top:1px solid #e5e7eb;padding-top:8px;">
                        <span>Total payable</span>
                        <strong style="color:#16a34a;">₹{{ booking()!.amount + feeAmount(booking()!.amount) }}</strong>
                      </div>
                    }
                    <div class="booking-receipt__row" style="font-size:0.8125rem;color:#9ca3af;">
                      <span>Platform fee</span><span>Shown on payment screen</span>
                    </div>
                    <div class="booking-receipt__row">
                      <span>Status</span>
                      <span class="badge badge--warning">Pending payment</span>
                    </div>
                  </div>

                  <!-- Payment: Demo UPI panel (replaces Razorpay while credentials absent) -->
                  @if (booking()!.status === 'pending_payment') {
                    @if (!paymentDone()) {
                      <app-upi-payment
                        [bookingId]="booking()!.id"
                        (confirmed)="onPaymentConfirmed()"
                      />
                    }
                  }

                  @if (booking()!.status === 'confirmed' || paymentDone()) {
                    <div class="alert alert--success">
                      <svg class="alert__icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                      <span><strong>Payment confirmed!</strong> Your booking is now active.</span>
                    </div>
                  }

                  <div style="display:flex;gap:12px;flex-wrap:wrap;justify-content:center;">
                    <a [routerLink]="['/bookings', booking()!.id]" class="btn btn--primary">View booking</a>
                    <a routerLink="/bookings/my" class="btn btn--ghost">My bookings</a>
                  </div>
                </div>
              </div>
            }

            <!-- Booking form -->
            @if (!booking()) {
              <div class="booking-layout">

                <!-- Left: slot picker -->
                <div class="booking-layout__slots">
                  <div class="card">
                    <div class="card__header">
                      <h2 style="font-size:0.9375rem;font-weight:700;color:#111827;">Select a slot</h2>
                    </div>
                    <div class="card__body">
                      <app-slot-picker
                        [turfId]="turfId"
                        (slotSelected)="onSlotSelected($event)"
                      />
                    </div>
                  </div>
                </div>

                <!-- Right: booking summary card -->
                <aside class="booking-layout__summary">
                  <div class="card" style="position:sticky;top:80px;">
                    <div class="card__header">
                      <h2 style="font-size:0.9375rem;font-weight:700;color:#111827;">Booking summary</h2>
                    </div>
                    <div class="card__body" style="display:flex;flex-direction:column;gap:16px;">

                      <!-- Turf info -->
                      <div style="display:flex;gap:12px;align-items:center;">
                        @if (turf()!.images.length) {
                          <img [src]="turf()!.images[0]" [alt]="turf()!.name"
                               style="width:56px;height:56px;border-radius:8px;object-fit:cover;flex-shrink:0;" loading="lazy"/>
                        }
                        <div>
                          <div style="font-weight:700;color:#111827;font-size:0.9375rem;">{{ turf()!.name }}</div>
                          <div style="font-size:0.8125rem;color:#6b7280;">
                            {{ turf()!.address.city }}{{ turf()!.address.state ? ', ' + turf()!.address.state : '' }}
                          </div>
                        </div>
                      </div>

                      <div class="divider"></div>

                      <!-- Slot info -->
                      @if (selectedSlot()) {
                        <div class="summary-rows">
                          <div class="summary-row">
                            <span>Date</span>
                            <strong>{{ formatDate(selectedDate()) }}</strong>
                          </div>
                          <div class="summary-row">
                            <span>Time</span>
                            <strong>{{ selectedSlot()!.startTime }} – {{ selectedSlot()!.endTime }}</strong>
                          </div>
                          <div class="summary-row">
                            <span>Duration</span>
                            <strong>{{ turf()!.slotDurationMinutes }} min</strong>
                          </div>
                          <div class="summary-row summary-row--total">
                            <span>Slot price</span>
                            <strong style="color:#16a34a;font-size:1.25rem;">₹{{ selectedSlot()!.price }}</strong>
                          </div>
                          @if (platformFeePercent() > 0) {
                            <div class="summary-row" style="font-size:0.8125rem;">
                              <span>Platform fee ({{ platformFeePercent() }}%)</span>
                              <span style="color:#374151;">₹{{ feeAmount(selectedSlot()!.price) }}</span>
                            </div>
                          }
                          <div class="summary-row" style="font-size:1rem;border-top:2px solid #e5e7eb;padding-top:10px;margin-top:2px;">
                            <span style="font-weight:600;color:#111827;">Total payable</span>
                            <strong style="color:#16a34a;font-size:1.25rem;">₹{{ selectedSlot()!.price + feeAmount(selectedSlot()!.price) }}</strong>
                          </div>
                        </div>
                      } @else {
                        <p style="color:#9ca3af;font-size:0.875rem;text-align:center;padding:12px 0;">
                          Select a date and time slot to continue.
                        </p>
                      }

                      <!-- Sport selector -->
                      @if (selectedSlot()) {
                        <div class="form-group">
                          <label class="form-label">Sport <span class="required">*</span></label>
                          <select class="form-control" [(ngModel)]="selectedSport" (ngModelChange)="onSportChange($event)" aria-label="Select sport">
                            @for (sport of turf()!.sportTypes; track sport) {
                              <option [value]="sport">{{ sportLabel(sport) }}</option>
                            }
                          </select>
                        </div>
                        @if (selectedSport === 'other') {
                          <div class="form-group">
                            <label class="form-label">Specify sport <span class="required">*</span></label>
                            <input class="form-control" type="text" [(ngModel)]="customSport"
                                   placeholder="e.g. Volleyball, Hockey…" maxlength="50"
                                   aria-label="Specify sport name" />
                            @if (showCustomSportError()) {
                              <span class="form-error" role="alert">Please specify the sport name.</span>
                            }
                          </div>
                        }
                      }

                      <!-- Server error -->
                      @if (serverError()) {
                        <div class="alert alert--error" role="alert" style="font-size:0.875rem;">
                          <svg class="alert__icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                          {{ serverError() }}
                        </div>
                      }

                      <button
                        type="button"
                        class="btn btn--primary btn--full btn--lg"
                        [class.loading]="submitting()"
                        [disabled]="!selectedSlot() || submitting() || (selectedSport === 'other' && !customSport.trim())"
                        (click)="reserve()"
                      >
                        @if (!submitting()) {
                          Reserve slot · ₹{{ (selectedSlot()?.price ?? 0) + feeAmount(selectedSlot()?.price ?? 0) }}
                        } @else {
                          Reserving…
                        }
                      </button>

                      <p style="font-size:0.75rem;color:#9ca3af;text-align:center;line-height:1.5;">
                        Your slot will be held for 10 minutes after reservation.
                      </p>
                    </div>
                  </div>
                </aside>
              </div>
            }
          }

        </div>
      </main>
    </div>
  `,
  styles: [`
    .booking-layout {
      display: grid;
      grid-template-columns: 1fr 340px;
      gap: 32px;
      align-items: start;
      @media (max-width: 900px) {
        grid-template-columns: 1fr;
      }
    }

    .booking-layout__summary {
      @media (max-width: 900px) { order: -1; }
    }

    .summary-rows { display: flex; flex-direction: column; gap: 10px; }
    .summary-row {
      display: flex; justify-content: space-between; align-items: center;
      font-size: 0.875rem; color: #6b7280;
      strong { color: #111827; }
    }
    .summary-row--total {
      padding-top: 10px; border-top: 1px solid #f3f4f6;
      font-size: 0.9375rem;
    }

    .booking-confirmed-card {
      background: white; border: 1px solid #e5e7eb; border-radius: 16px;
      box-shadow: 0 1px 3px rgb(0 0 0/.05);
    }

    .booking-receipt {
      width: 100%; max-width: 440px;
      background: #f9fafb; border-radius: 10px; padding: 16px;
      display: flex; flex-direction: column; gap: 10px;
    }
    .booking-receipt__row {
      display: flex; justify-content: space-between; align-items: center;
      font-size: 0.875rem; color: #6b7280;
      strong { color: #111827; }
    }
    .booking-receipt__row--total {
      padding-top: 10px; border-top: 1px solid #e5e7eb;
      font-size: 1rem;
    }
  `],
})
export class BookingFormComponent implements OnInit {
  private readonly turfService    = inject(TurfService);
  private readonly bookingService = inject(BookingService);
  private readonly paymentService = inject(PaymentService);
  private readonly toastService   = inject(ToastService);
  private readonly route          = inject(ActivatedRoute);
  private readonly router         = inject(Router);

  turfId = '';

  readonly loadingTurf = signal(true);
  readonly turf        = signal<Turf | null>(null);
  readonly submitting  = signal(false);
  readonly serverError = signal('');
  readonly booking     = signal<Booking | null>(null);
  readonly paying      = signal(false);
  readonly paymentDone = signal(false);
  readonly paymentError = signal('');

  /** Platform fee percent loaded from /api/settings/public */
  readonly platformFeePercent = signal(0);

  private _selectedSlot: { date: string; slot: Slot } | null = null;
  readonly selectedSlot = signal<Slot | null>(null);
  readonly selectedDate = signal<string>('');
  selectedSport = '';
  customSport   = '';
  readonly showCustomSportError = signal(false);

  ngOnInit(): void {
    this.turfId = this.route.snapshot.paramMap.get('id')!;
    this.turfService.getPublicTurfById(this.turfId).subscribe({
      next: (t) => {
        this.turf.set(t);
        this.selectedSport = t.sportTypes[0] ?? '';
        this.loadingTurf.set(false);
      },
      error: () => { this.turf.set(null); this.loadingTurf.set(false); },
    });
    // Fetch platform fee (non-blocking — defaults to 0 if it fails)
    this.bookingService.getPlatformFeePercent().subscribe({
      next: (pct) => this.platformFeePercent.set(pct),
      error: () => {},
    });
  }

  /** Compute platform fee amount for a given base price. */
  feeAmount(base: number): number {
    return Math.round(base * (this.platformFeePercent() / 100));
  }

  onSlotSelected(e: { date: string; slot: Slot } | null): void {
    this._selectedSlot = e;
    this.selectedSlot.set(e?.slot ?? null);
    this.selectedDate.set(e?.date ?? '');
    this.serverError.set('');
    this.showCustomSportError.set(false);
  }

  onSportChange(value: string): void {
    this.selectedSport = value;
    if (value !== 'other') {
      this.customSport = '';
      this.showCustomSportError.set(false);
    }
  }

  /** Returns the actual sport value to store — custom text when 'other' is selected. */
  private effectiveSport(): string {
    if (this.selectedSport === 'other') {
      return this.customSport.trim();
    }
    return this.selectedSport;
  }

  sportLabel(s: SportType): string { return SPORT_TYPE_LABELS[s]; }

  formatDate(iso: string): string {
    if (!iso) return '';
    const d = new Date(iso.includes('T') ? iso : iso + 'T00:00:00');
    return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  }

  reserve(): void {
    if (!this._selectedSlot || !this.selectedSport) return;

    // Validate custom sport when 'other' is selected
    if (this.selectedSport === 'other' && !this.customSport.trim()) {
      this.showCustomSportError.set(true);
      return;
    }
    this.showCustomSportError.set(false);

    this.submitting.set(true);
    this.serverError.set('');

    this.bookingService.createBooking({
      turfId:    this.turfId,
      date:      this._selectedSlot.date,
      startTime: this._selectedSlot.slot.startTime,
      sport:     this.effectiveSport(),
    }).subscribe({
      next: (b) => {
        this.submitting.set(false);
        this.booking.set(b);
        this.toastService.success('Slot reserved!', 'Complete payment within 10 minutes to confirm.');
      },
      error: (err: HttpErrorResponse) => {
        this.submitting.set(false);
        const code = err.error?.code;
        if (code === 'SLOT_UNAVAILABLE') {
          this.serverError.set('This slot was just taken. Please choose a different time.');
        } else {
          this.serverError.set(err.error?.message ?? 'Reservation failed. Please try again.');
        }
      },
    });
  }

  onPaymentConfirmed(): void {
    this.paymentDone.set(true);
    this.booking.update(b => b ? { ...b, status: 'confirmed' } : b);
    this.toastService.success('Booking confirmed!', 'Your payment has been recorded.');
  }

  /** Razorpay pay() — preserved for when credentials are restored */
  pay(): void {
    const b = this.booking();
    if (!b) return;
    this.paying.set(true);
    this.paymentError.set('');

    this.paymentService.createOrder(b.id).subscribe({
      next: (order) => {
        this.paymentService.openCheckout(order).subscribe({
          next: (verifyDto) => {
            this.paymentService.verifyPayment(verifyDto).subscribe({
              next: () => {
                this.paying.set(false);
                this.paymentDone.set(true);
                this.booking.update(bk => bk ? { ...bk, status: 'confirmed' } : bk);
                this.toastService.success('Payment successful!', 'Your booking is confirmed.');
              },
              error: (err: HttpErrorResponse) => {
                this.paying.set(false);
                this.paymentError.set(err.error?.message ?? 'Payment verification failed. Please contact support.');
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
        this.paymentError.set(err.error?.message ?? 'Could not initiate payment. Please try again.');
      },
    });
  }
}
