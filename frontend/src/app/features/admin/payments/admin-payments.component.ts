import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HeaderComponent } from '../../../layout/header/header.component';
import { PaymentService } from '../../../core/services/payment.service';
import { Payment, PaymentStatus } from '../../../core/models/booking.model';

type FilterStatus = 'all' | 'created' | 'paid' | 'failed' | 'refunded';

@Component({
  selector: 'app-admin-payments',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, HeaderComponent],
  template: `
    <div class="app-shell">
      <app-header />
      <main class="app-main">
        <div class="container">

          <div class="page-header" style="display:flex;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;gap:16px;margin-bottom:32px;">
            <div>
              <h1 class="page-header__title">Payments</h1>
              <p class="page-header__subtitle">Platform-wide payment transactions.</p>
            </div>
            @if (!loading()) {
              <div class="badge badge--neutral" style="font-size:0.875rem;padding:6px 14px;">{{ total() }} total</div>
            }
          </div>

          <!-- Status tabs -->
          <div class="approvals-filters" style="margin-bottom:24px;">
            <div class="approvals-filters__tabs" role="tablist">
              @for (tab of tabs; track tab.value) {
                <button class="filter-tab" [class.active]="activeStatus() === tab.value"
                  (click)="setStatus(tab.value)" role="tab">{{ tab.label }}</button>
              }
            </div>
          </div>

          @if (loading()) {
            <div class="owners-table-wrap">
              @for (i of [1,2,3,4]; track i) {
                <div class="owner-row-skeleton">
                  <div class="skeleton" style="height:16px;width:38%;border-radius:6px;"></div>
                  <div class="skeleton" style="height:14px;width:20%;border-radius:6px;"></div>
                  <div class="skeleton" style="height:24px;width:70px;border-radius:20px;"></div>
                </div>
              }
            </div>
          }

          @if (!loading() && loadError()) {
            <div class="alert alert--error" role="alert">
              Failed to load payments.
              <button class="btn btn--link" style="font-size:inherit;" (click)="load()">Retry</button>
            </div>
          }

          @if (!loading() && !loadError() && payments().length === 0) {
            <div class="empty-state" style="padding:64px 24px;">
              <svg class="empty-state__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
              <div class="empty-state__title">No payments found</div>
              <p class="empty-state__description">No {{ activeStatus() === 'all' ? '' : activeStatus() + ' ' }}payment records.</p>
            </div>
          }

          @if (!loading() && !loadError() && payments().length > 0) {
            <div class="owners-table-wrap">
              <table class="owners-table" aria-label="Payments">
                <thead>
                  <tr>
                    <th>Order ID</th>
                    <th>Razorpay Payment ID</th>
                    <th>Amount</th>
                    <th>Platform Fee</th>
                    <th>Status</th>
                    <th>Verified</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  @for (p of payments(); track p.id) {
                    <tr class="owner-row">
                      <td><code style="font-size:0.8125rem;color:#374151;">{{ p.orderId ?? '—' }}</code></td>
                      <td><code style="font-size:0.8125rem;color:#374151;">{{ p.razorpayPaymentId ?? '—' }}</code></td>
                      <td style="font-weight:700;color:#111827;">₹{{ p.amount | number }}</td>
                      <td style="color:#6b7280;">₹{{ p.platformFeeAmount | number }}</td>
                      <td><span class="badge badge--{{ statusBadge(p.status) }}">{{ p.status }}</span></td>
                      <td>
                        @if (p.signatureVerified) {
                          <span style="color:#16a34a;font-size:0.875rem;font-weight:600;">✓ Yes</span>
                        } @else {
                          <span style="color:#9ca3af;font-size:0.875rem;">—</span>
                        }
                      </td>
                      <td class="td-date">{{ formatDate(p.createdAt) }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>

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
    .approvals-filters { display:flex; align-items:center; gap:16px; flex-wrap:wrap; }
    .approvals-filters__tabs { display:flex; gap:4px; background:#f3f4f6; padding:4px; border-radius:10px; }
    .filter-tab { padding:6px 14px; font-size:0.8125rem; font-weight:600; font-family:inherit; color:#6b7280; background:none; border:none; border-radius:7px; cursor:pointer; transition:background 150ms,color 150ms; white-space:nowrap; &:hover{background:#e5e7eb;color:#374151;} &.active{background:white;color:#111827;box-shadow:0 1px 3px rgb(0 0 0/.1);} }
    .owners-table-wrap{background:white;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;box-shadow:0 1px 2px rgb(0 0 0/.05);}
    .owners-table{width:100%;border-collapse:collapse;font-size:0.875rem;}
    .owners-table th{padding:12px 16px;text-align:left;font-size:0.75rem;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.04em;background:#f9fafb;border-bottom:1px solid #e5e7eb;}
    .owners-table td{padding:14px 16px;border-bottom:1px solid #f3f4f6;vertical-align:middle;}
    .owner-row:last-child td{border-bottom:none;} .owner-row:hover td{background:#fafafa;}
    .td-date{white-space:nowrap;color:#6b7280;font-size:0.8125rem;}
    .owner-row-skeleton{display:flex;align-items:center;gap:24px;padding:16px;border-bottom:1px solid #f3f4f6;&:last-child{border-bottom:none;}}
    .pagination{display:flex;align-items:center;justify-content:center;gap:16px;}
    @media(max-width:768px){.owners-table th:nth-child(2),.owners-table td:nth-child(2),.owners-table th:nth-child(4),.owners-table td:nth-child(4){display:none;}}
  `],
})
export class AdminPaymentsComponent implements OnInit {
  private readonly paymentService = inject(PaymentService);

  readonly payments   = signal<Payment[]>([]);
  readonly loading    = signal(true);
  readonly loadError  = signal(false);
  readonly total      = signal(0);
  readonly page       = signal(1);
  readonly totalPages = signal(1);
  readonly activeStatus = signal<FilterStatus>('all');

  readonly tabs: { label: string; value: FilterStatus }[] = [
    { label: 'All',      value: 'all' },
    { label: 'Paid',     value: 'paid' },
    { label: 'Created',  value: 'created' },
    { label: 'Failed',   value: 'failed' },
    { label: 'Refunded', value: 'refunded' },
  ];

  ngOnInit(): void { this.load(); }

  setStatus(s: FilterStatus): void { this.activeStatus.set(s); this.page.set(1); this.load(); }
  changePage(p: number): void { this.page.set(p); this.load(); }

  load(): void {
    this.loading.set(true);
    this.loadError.set(false);
    const status = this.activeStatus() === 'all' ? undefined : this.activeStatus();
    this.paymentService.adminGetPayments({ status, page: this.page() }).subscribe({
      next: (d) => {
        this.payments.set(d.payments);
        this.total.set(d.total);
        this.totalPages.set(d.pages);
        this.loading.set(false);
      },
      error: () => { this.loadError.set(true); this.loading.set(false); },
    });
  }

  statusBadge(s: PaymentStatus): string {
    return s === 'paid' ? 'success' : s === 'failed' ? 'error' : s === 'refunded' ? 'warning' : 'neutral';
  }

  formatDate(iso: string): string {
    return iso ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
  }
}
