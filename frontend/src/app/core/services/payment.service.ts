import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, from, throwError } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';

import { environment } from '../../../environments/environment';
import {
  PaymentOrder, VerifyPaymentDto, Payment, PaymentsResponse, UpiPaymentData,
} from '../models/booking.model';

/** Extends Window with Razorpay checkout constructor injected via script tag. */
declare global {
  interface Window { Razorpay: new (opts: RazorpayOptions) => RazorpayInstance; }
}
interface RazorpayOptions {
  key: string; amount: number; currency: string; order_id: string;
  name: string; description?: string; image?: string;
  prefill?: { name?: string; email?: string; contact?: string };
  theme?: { color?: string };
  handler: (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => void;
  modal?: { ondismiss?: () => void };
}
interface RazorpayInstance { open(): void; on(event: string, handler: (resp: unknown) => void): void; }

@Injectable({ providedIn: 'root' })
export class PaymentService {
  private readonly http = inject(HttpClient);
  private readonly api  = `${environment.apiUrl}/payments`;

  /** Load Razorpay checkout.js once — returns a resolved Promise when ready. */
  private _scriptLoaded = false;
  loadRazorpayScript(): Promise<void> {
    if (this._scriptLoaded || typeof window.Razorpay !== 'undefined') {
      this._scriptLoaded = true;
      return Promise.resolve();
    }
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://checkout.razorpay.com/v1/checkout.js';
      s.onload  = () => { this._scriptLoaded = true; resolve(); };
      s.onerror = () => reject(new Error('Failed to load Razorpay script.'));
      document.head.appendChild(s);
    });
  }

  /** Create a Razorpay order for the given booking. */
  createOrder(bookingId: string): Observable<PaymentOrder> {
    return this.http
      .post<{ success: true; data: PaymentOrder }>(`${this.api}/create-order`, { bookingId })
      .pipe(map(r => r.data));
  }

  /** Verify the Razorpay signature server-side after checkout. */
  verifyPayment(dto: VerifyPaymentDto): Observable<{ bookingStatus: string; bookingId: string; payment: Payment }> {
    return this.http
      .post<{ success: true; data: { bookingStatus: string; bookingId: string; payment: Payment } }>(
        `${this.api}/verify`, dto
      )
      .pipe(map(r => r.data));
  }

  getPayment(id: string): Observable<Payment> {
    return this.http
      .get<{ success: true; data: { payment: Payment } }>(`${this.api}/${id}`)
      .pipe(map(r => r.data.payment));
  }

  adminGetPayments(params?: { status?: string; page?: number }): Observable<PaymentsResponse> {
    const p: Record<string, string> = {};
    if (params?.status) p['status'] = params.status;
    if (params?.page)   p['page']   = String(params.page);
    return this.http
      .get<{ success: true; data: PaymentsResponse }>(`${environment.apiUrl}/admin/payments`, { params: p })
      .pipe(map(r => r.data));
  }

  // ── Demo UPI methods ─────────────────────────────────────────────────────────

  /** Fetch UPI URI + metadata for the QR panel. */
  getUpiData(bookingId: string): Observable<UpiPaymentData> {
    return this.http
      .get<{ success: true; data: UpiPaymentData }>(`${this.api}/upi-data/${bookingId}`)
      .pipe(map(r => r.data));
  }

  /** Manual "I paid" confirmation for the demo flow. */
  demoConfirm(bookingId: string): Observable<{ bookingStatus: string; bookingId: string; payment: Payment }> {
    return this.http
      .post<{ success: true; data: { bookingStatus: string; bookingId: string; payment: Payment } }>(
        `${this.api}/demo-confirm`, { bookingId }
      )
      .pipe(map(r => r.data));
  }

  /**
   * Open Razorpay checkout and return the payment response via a Promise.
   * Loads the script lazily on first call.
   */
  openCheckout(order: PaymentOrder, prefill?: { name?: string; email?: string }): Observable<VerifyPaymentDto> {
    return from(this.loadRazorpayScript()).pipe(
      switchMap(() => {
        if (typeof window.Razorpay === 'undefined') {
          return throwError(() => new Error('Razorpay SDK not available.'));
        }
        return new Observable<VerifyPaymentDto>(observer => {
          // Use keyId from server response; fallback to environment config
          const key = order.keyId || environment.razorpayKeyId;
          const rzp = new window.Razorpay({
            key,
            amount:   order.amount,
            currency: order.currency,
            order_id: order.orderId,
            name:     'TurfX',
            description: 'Turf Booking',
            prefill,
            theme: { color: '#16a34a' },
            handler: (resp) => {
              observer.next({
                orderId:           resp.razorpay_order_id,
                razorpayPaymentId: resp.razorpay_payment_id,
                razorpaySignature: resp.razorpay_signature,
              });
              observer.complete();
            },
            modal: {
              ondismiss: () => {
                observer.error({ code: 'PAYMENT_DISMISSED', message: 'Payment was cancelled.' });
              },
            },
          });
          rzp.open();
        });
      })
    );
  }
}
