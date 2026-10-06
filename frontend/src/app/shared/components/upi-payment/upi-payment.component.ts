import { Component, Input, Output, EventEmitter, signal, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';

import { PaymentService } from '../../../core/services/payment.service';
import { UpiPaymentData } from '../../../core/models/booking.model';

/**
 * Demo UPI QR Payment panel.
 *
 * Replaces Razorpay checkout while payment gateway credentials are absent.
 * Razorpay code is preserved elsewhere; this component is additive only.
 *
 * Usage:
 *   <app-upi-payment [bookingId]="..." (confirmed)="onPaid($event)" />
 *
 * The QR code is generated via the Google Chart API which renders a QR image
 * from the UPI deep-link URI — no additional npm package required.
 */
@Component({
  selector: 'app-upi-payment',
  standalone: true,
  imports: [CommonModule],
  template: `
    <!-- Loading UPI data -->
    @if (loading()) {
      <div style="display:flex;justify-content:center;padding:24px;">
        <div class="spinner spinner--sm"></div>
      </div>
    }

    <!-- Error -->
    @if (!loading() && loadError()) {
      <div class="alert alert--error" role="alert">
        <svg class="alert__icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        {{ loadError() }}
      </div>
    }

    @if (!loading() && upiData()) {
      <div class="upi-panel">

        <!-- Demo label -->
        <div class="upi-panel__demo-badge">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          Demo Payment — not a real transaction
        </div>

        <div class="upi-panel__qr-wrap">
          <img
            [src]="qrImageUrl()"
            alt="UPI QR Code"
            class="upi-panel__qr"
            width="200"
            height="200"
            loading="eager"
            (error)="onQrError($event)"
          />
          @if (qrFailed()) {
            <div style="width:200px;height:200px;display:flex;align-items:center;justify-content:center;background:#f3f4f6;border-radius:10px;border:2px dashed #d1d5db;">
              <div style="text-align:center;padding:16px;">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="margin:0 auto 8px;display:block;"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><path d="M14 14h3v3"/><path d="M17 17h3v3"/><path d="M14 17h.01"/></svg>
                <p style="font-size:0.75rem;color:#9ca3af;margin:0;">QR unavailable — use UPI ID below</p>
              </div>
            </div>
          }
          <p class="upi-panel__qr-hint">Scan with Google Pay, PhonePe, Paytm or any UPI app</p>
        </div>

        <!-- Payment details -->
        <dl class="upi-panel__details">
          <div class="upi-panel__detail-row">
            <dt>UPI ID</dt>
            <dd>
              <code class="upi-panel__code">{{ upiData()!.upiId }}</code>
              <button class="btn btn--link btn--sm" style="font-size:0.8125rem;padding:0 0 0 8px;" (click)="copyUpiId()" [attr.aria-label]="'Copy UPI ID'">
                {{ copied() ? '✓ Copied' : 'Copy' }}
              </button>
            </dd>
          </div>
          <div class="upi-panel__detail-row">
            <dt>Booking amount</dt>
            <dd>₹{{ upiData()!.amount - upiData()!.platformFeeAmount }}</dd>
          </div>
          @if (upiData()!.platformFeeAmount > 0) {
            <div class="upi-panel__detail-row">
              <dt>Platform fee</dt>
              <dd>₹{{ upiData()!.platformFeeAmount }}</dd>
            </div>
          }
          <div class="upi-panel__detail-row upi-panel__detail-row--total">
            <dt><strong>Total payable</strong></dt>
            <dd><strong>₹{{ upiData()!.amount }}</strong></dd>
          </div>
          <div class="upi-panel__detail-row">
            <dt>Reference</dt>
            <dd><code class="upi-panel__code">{{ upiData()!.bookingRef }}</code></dd>
          </div>
        </dl>

        <!-- Open in GPay (deep link works on mobile) -->
        <a
          [href]="upiData()!.upiUri"
          class="btn btn--secondary btn--full"
          style="margin-bottom:8px;"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Open in Google Pay"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
          Open in Google Pay / UPI App
        </a>

        <!-- Manual confirm -->
        @if (!confirming()) {
          <button
            type="button"
            class="btn btn--primary btn--full"
            (click)="confirm()"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            Payment Completed — Confirm Booking
          </button>
        } @else {
          <button type="button" class="btn btn--primary btn--full loading" disabled>
            Confirming…
          </button>
        }

        @if (confirmError()) {
          <div class="alert alert--error" style="margin-top:10px;font-size:0.875rem;" role="alert">
            {{ confirmError() }}
          </div>
        }

        <p style="font-size:0.75rem;color:#9ca3af;text-align:center;margin-top:8px;line-height:1.5;">
          This is a demo flow. Click "Payment Completed" after paying to confirm your booking.
        </p>
      </div>
    }
  `,
  styles: [`
    .upi-panel {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
      padding: 20px;
      background: #fafafa;
      border: 1.5px dashed #d1d5db;
      border-radius: 12px;
      width: 100%;
    }

    .upi-panel__demo-badge {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      font-size: 0.75rem;
      font-weight: 600;
      color: #92400e;
      background: #fef3c7;
      border: 1px solid #fde68a;
      padding: 4px 10px;
      border-radius: 20px;
    }

    .upi-panel__qr-wrap {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
    }

    .upi-panel__qr {
      border: 4px solid white;
      border-radius: 10px;
      box-shadow: 0 2px 8px rgb(0 0 0 / 0.12);
    }

    .upi-panel__qr-hint {
      font-size: 0.75rem;
      color: #9ca3af;
      text-align: center;
    }

    .upi-panel__details {
      width: 100%;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .upi-panel__detail-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.875rem;
      dt { color: #6b7280; font-weight: 500; }
      dd { color: #111827; margin: 0; display: flex; align-items: center; }
      &--total {
        padding-top: 8px;
        border-top: 1px solid #e5e7eb;
        font-size: 1rem;
      }
    }

    .upi-panel__code {
      font-family: 'Courier New', monospace;
      font-size: 0.8125rem;
      background: #f3f4f6;
      padding: 2px 6px;
      border-radius: 4px;
      color: #374151;
    }
  `],
})
export class UpiPaymentComponent implements OnInit {
  private readonly paymentService = inject(PaymentService);

  @Input({ required: true }) bookingId!: string;
  /** Emitted with bookingId when demo confirmation succeeds. */
  @Output() confirmed = new EventEmitter<string>();

  readonly loading      = signal(true);
  readonly loadError    = signal('');
  readonly upiData      = signal<UpiPaymentData | null>(null);
  readonly confirming   = signal(false);
  readonly confirmError = signal('');
  readonly copied       = signal(false);
  readonly qrFailed     = signal(false);

  /** QR code via api.qrserver.com — free, no API key, stable. */
  qrImageUrl(): string {
    const uri = this.upiData()?.upiUri ?? '';
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(uri)}&format=png&margin=10`;
  }

  ngOnInit(): void {
    this.paymentService.getUpiData(this.bookingId).subscribe({
      next: (d) => { this.upiData.set(d); this.loading.set(false); },
      error: (err: HttpErrorResponse) => {
        this.loadError.set(err.error?.message ?? 'Could not load payment details.');
        this.loading.set(false);
      },
    });
  }

  copyUpiId(): void {
    const id = this.upiData()?.upiId;
    if (!id) return;
    navigator.clipboard?.writeText(id).then(() => {
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2000);
    });
  }

  onQrError(event: Event): void {
    this.qrFailed.set(true);
    // Hide the broken image element
    (event.target as HTMLImageElement).style.display = 'none';
  }

  confirm(): void {
    this.confirming.set(true);
    this.confirmError.set('');
    this.paymentService.demoConfirm(this.bookingId).subscribe({
      next: () => {
        this.confirming.set(false);
        this.confirmed.emit(this.bookingId);
      },
      error: (err: HttpErrorResponse) => {
        this.confirming.set(false);
        this.confirmError.set(err.error?.message ?? 'Confirmation failed. Please try again.');
      },
    });
  }
}
