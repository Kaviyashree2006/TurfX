import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { HeaderComponent } from '../../../layout/header/header.component';
import { ReviewService } from '../../../core/services/review.service';
import { Review } from '../../../core/models/review.model';

@Component({
  selector: 'app-owner-turf-reviews',
  standalone: true,
  imports: [CommonModule, RouterLink, HeaderComponent],
  template: `
    <div class="app-shell">
      <app-header />
      <main class="app-main">
        <div class="container" style="max-width:760px;">

          <a routerLink="/owner/turfs"
             style="display:inline-flex;align-items:center;gap:6px;font-size:0.875rem;font-weight:500;color:#6b7280;text-decoration:none;margin-bottom:20px;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
            My Turfs
          </a>

          @if (loading()) {
            <div style="display:flex;justify-content:center;padding:64px;"><div class="spinner"></div></div>
          }

          @if (!loading()) {
            <div class="page-header" style="margin-bottom:24px;">
              <h1 class="page-header__title">{{ turfName() }}</h1>
              <p class="page-header__subtitle">
                @if (ratingCount() > 0) {
                  ★ {{ ratingAvg().toFixed(1) }} average · {{ ratingCount() }} review{{ ratingCount() !== 1 ? 's' : '' }}
                } @else {
                  No reviews yet.
                }
              </p>
            </div>

            @if (reviews().length === 0) {
              <div class="empty-state">
                <svg class="empty-state__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                <div class="empty-state__title">No reviews yet</div>
                <p class="empty-state__description">Reviews from customers will appear here after they complete a booking.</p>
              </div>
            } @else {
              <div style="display:flex;flex-direction:column;gap:12px;">
                @for (r of reviews(); track r.id) {
                  <div class="review-card">
                    <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:8px;">
                      <div style="display:flex;align-items:center;gap:10px;">
                        <div class="review-avatar">{{ initials(r.customer?.name) }}</div>
                        <div>
                          <div style="font-weight:600;font-size:0.875rem;color:#111827;">{{ r.customer?.name ?? 'Customer' }}</div>
                          <div style="font-size:0.75rem;color:#9ca3af;">{{ formatDate(r.createdAt) }}</div>
                        </div>
                      </div>
                      <div style="display:flex;gap:2px;font-size:1.25rem;">
                        @for (s of [1,2,3,4,5]; track s) {
                          <span [style.color]="s <= r.rating ? '#f59e0b' : '#e5e7eb'">★</span>
                        }
                      </div>
                    </div>
                    @if (r.comment) {
                      <p style="font-size:0.875rem;color:#4b5563;line-height:1.6;margin:0;">{{ r.comment }}</p>
                    }
                  </div>
                }
              </div>

              @if (totalPages() > 1) {
                <div style="display:flex;align-items:center;justify-content:center;gap:16px;margin-top:24px;">
                  <button class="btn btn--ghost btn--sm" [disabled]="page() <= 1" (click)="loadPage(page()-1)">Prev</button>
                  <span style="font-size:0.875rem;color:#6b7280;">{{ page() }}/{{ totalPages() }}</span>
                  <button class="btn btn--ghost btn--sm" [disabled]="page() >= totalPages()" (click)="loadPage(page()+1)">Next</button>
                </div>
              }
            }
          }

          @if (loadError()) {
            <div class="alert alert--error" role="alert">
              Failed to load reviews.
              <button class="btn btn--link" (click)="loadPage(1)">Retry</button>
            </div>
          }
        </div>
      </main>
    </div>
  `,
  styles: [`
    .review-card { background:white;border:1px solid #e5e7eb;border-radius:12px;padding:16px;box-shadow:0 1px 2px rgb(0 0 0/.04); }
    .review-avatar { width:32px;height:32px;border-radius:50%;background:#e5e7eb;color:#6b7280;font-size:0.75rem;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0; }
  `],
})
export class OwnerTurfReviewsComponent implements OnInit {
  private readonly reviewService = inject(ReviewService);
  private readonly route         = inject(ActivatedRoute);

  readonly reviews    = signal<Review[]>([]);
  readonly turfName   = signal('Reviews');
  readonly ratingAvg  = signal(0);
  readonly ratingCount = signal(0);
  readonly loading    = signal(true);
  readonly loadError  = signal(false);
  readonly page       = signal(1);
  readonly totalPages = signal(1);

  private turfId = '';

  ngOnInit(): void {
    this.turfId = this.route.snapshot.paramMap.get('id')!;
    this.loadPage(1);
  }

  loadPage(p: number): void {
    this.page.set(p);
    this.loading.set(true);
    this.loadError.set(false);
    this.reviewService.getOwnerTurfReviews(this.turfId, p).subscribe({
      next: (d) => {
        this.reviews.set(d.reviews);
        this.totalPages.set(d.pages);
        this.turfName.set((d as any).turfName ?? 'Reviews');
        this.ratingAvg.set((d as any).ratingAvg ?? 0);
        this.ratingCount.set((d as any).ratingCount ?? 0);
        this.loading.set(false);
      },
      error: () => { this.loadError.set(true); this.loading.set(false); },
    });
  }

  initials(name?: string | null): string {
    return (name ?? '?').split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();
  }
  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  }
}
