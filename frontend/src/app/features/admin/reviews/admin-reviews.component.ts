import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { HeaderComponent } from '../../../layout/header/header.component';
import { ReviewService } from '../../../core/services/review.service';
import { ToastService } from '../../../core/services/toast.service';
import { Review } from '../../../core/models/review.model';

@Component({
  selector: 'app-admin-reviews',
  standalone: true,
  imports: [CommonModule, RouterLink, HeaderComponent],
  template: `
    <div class="app-shell">
      <app-header />
      <main class="app-main">
        <div class="container">

          <div class="page-header" style="display:flex;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;gap:16px;margin-bottom:32px;">
            <div>
              <h1 class="page-header__title">Reviews</h1>
              <p class="page-header__subtitle">All platform reviews. Delete inappropriate content if required.</p>
            </div>
            @if (!loading()) {
              <div class="badge badge--neutral" style="font-size:0.875rem;padding:6px 14px;">{{ total() }} total</div>
            }
          </div>

          @if (loading()) {
            <div class="owners-table-wrap">
              @for (i of [1,2,3,4]; track i) {
                <div style="display:flex;align-items:center;gap:16px;padding:16px;border-bottom:1px solid #f3f4f6;">
                  <div class="skeleton" style="height:14px;width:20%;border-radius:6px;"></div>
                  <div class="skeleton" style="height:14px;width:40%;border-radius:6px;"></div>
                  <div class="skeleton" style="height:24px;width:60px;border-radius:20px;margin-left:auto;"></div>
                </div>
              }
            </div>
          }

          @if (!loading() && loadError()) {
            <div class="alert alert--error" role="alert">
              Failed to load reviews.
              <button class="btn btn--link" (click)="load()">Retry</button>
            </div>
          }

          @if (!loading() && !loadError() && reviews().length === 0) {
            <div class="empty-state" style="padding:64px 24px;">
              <svg class="empty-state__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
              <div class="empty-state__title">No reviews yet</div>
              <p class="empty-state__description">Customer reviews will appear here.</p>
            </div>
          }

          @if (!loading() && !loadError() && reviews().length > 0) {
            <div class="owners-table-wrap">
              <table class="owners-table" aria-label="Reviews">
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>Turf</th>
                    <th>Rating</th>
                    <th>Comment</th>
                    <th>Date</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  @for (r of reviews(); track r.id) {
                    <tr class="owner-row">
                      <td style="font-size:0.875rem;color:#374151;">{{ r.customer?.name ?? '—' }}</td>
                      <td style="font-size:0.875rem;color:#374151;">{{ turfName(r) }}</td>
                      <td>
                        <div style="display:flex;gap:1px;font-size:1rem;">
                          @for (s of [1,2,3,4,5]; track s) {
                            <span [style.color]="s <= r.rating ? '#f59e0b' : '#e5e7eb'">★</span>
                          }
                        </div>
                      </td>
                      <td style="font-size:0.8125rem;color:#6b7280;max-width:260px;">
                        {{ r.comment || '—' }}
                      </td>
                      <td style="font-size:0.8125rem;color:#9ca3af;white-space:nowrap;">{{ formatDate(r.createdAt) }}</td>
                      <td>
                        <button class="btn btn--danger btn--sm"
                          [class.loading]="deletingId() === r.id"
                          [disabled]="!!deletingId()"
                          (click)="deleteReview(r)">
                          Delete
                        </button>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>

            @if (totalPages() > 1) {
              <div style="display:flex;align-items:center;justify-content:center;gap:16px;margin-top:24px;">
                <button class="btn btn--ghost btn--sm" [disabled]="page() <= 1" (click)="changePage(page()-1)">Prev</button>
                <span style="font-size:0.875rem;color:#6b7280;">Page {{ page() }} of {{ totalPages() }}</span>
                <button class="btn btn--ghost btn--sm" [disabled]="page() >= totalPages()" (click)="changePage(page()+1)">Next</button>
              </div>
            }
          }
        </div>
      </main>
    </div>
  `,
  styles: [`
    .owners-table-wrap { background:white;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;box-shadow:0 1px 2px rgb(0 0 0/.05); }
    .owners-table { width:100%;border-collapse:collapse;font-size:0.875rem; }
    .owners-table th { padding:12px 16px;text-align:left;font-size:0.75rem;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.04em;background:#f9fafb;border-bottom:1px solid #e5e7eb; }
    .owners-table td { padding:14px 16px;border-bottom:1px solid #f3f4f6;vertical-align:top; }
    .owner-row:last-child td { border-bottom:none; }
    .owner-row:hover td { background:#fafafa; }
    @media(max-width:768px) {
      .owners-table th:nth-child(4),.owners-table td:nth-child(4) { display:none; }
    }
  `],
})
export class AdminReviewsComponent implements OnInit {
  private readonly reviewService = inject(ReviewService);
  private readonly toastService  = inject(ToastService);

  readonly reviews    = signal<Review[]>([]);
  readonly loading    = signal(true);
  readonly loadError  = signal(false);
  readonly total      = signal(0);
  readonly page       = signal(1);
  readonly totalPages = signal(1);
  readonly deletingId = signal<string | null>(null);

  ngOnInit(): void { this.load(); }

  changePage(p: number): void { this.page.set(p); this.load(); }

  load(): void {
    this.loading.set(true);
    this.loadError.set(false);
    this.reviewService.adminGetReviews({ page: this.page() }).subscribe({
      next: (d) => {
        this.reviews.set(d.reviews);
        this.total.set(d.total);
        this.totalPages.set(d.pages);
        this.loading.set(false);
      },
      error: () => { this.loadError.set(true); this.loading.set(false); },
    });
  }

  deleteReview(r: Review): void {
    if (!confirm(`Delete this review by ${r.customer?.name ?? 'customer'}?`)) return;
    this.deletingId.set(r.id);
    this.reviewService.adminDelete(r.id).subscribe({
      next: () => {
        this.deletingId.set(null);
        this.toastService.success('Review deleted');
        this.reviews.update(list => list.filter(x => x.id !== r.id));
        this.total.update(n => n - 1);
      },
      error: (err: HttpErrorResponse) => {
        this.deletingId.set(null);
        this.toastService.error('Delete failed', err.error?.message);
      },
    });
  }

  turfName(r: any): string { return r.turf?.name ?? '—'; }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  }
}
