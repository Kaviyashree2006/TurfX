import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { HeaderComponent } from '../../../layout/header/header.component';
import { TurfService } from '../../../core/services/turf.service';
import { ReviewService } from '../../../core/services/review.service';
import { BookingService } from '../../../core/services/booking.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { Turf, SPORT_TYPE_LABELS, SportType } from '../../../core/models/turf.model';
import { Review } from '../../../core/models/review.model';

@Component({
  selector: 'app-turf-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, HeaderComponent],
  template: `
    <div class="app-shell">
      <app-header />
      <main class="app-main" style="padding-top:0;">

        @if (loading()) {
          <div class="container" style="padding-top:48px;">
            <div style="display:flex;flex-direction:column;gap:16px;">
              <div class="skeleton" style="height:400px;border-radius:16px;"></div>
              <div class="skeleton skeleton--title" style="max-width:400px;"></div>
              <div class="skeleton skeleton--text" style="max-width:250px;"></div>
            </div>
          </div>
        }

        @if (!loading() && !turf()) {
          <div class="container" style="padding-top:80px;text-align:center;">
            <div style="font-size:4rem;font-weight:800;color:#e5e7eb;">404</div>
            <h1 style="font-size:1.5rem;font-weight:700;color:#111827;margin-bottom:8px;">Turf not found</h1>
            <p style="color:#6b7280;margin-bottom:24px;">This turf may have been removed or is no longer available.</p>
            <a routerLink="/turfs" class="btn btn--primary">Browse turfs</a>
          </div>
        }

        @if (!loading() && turf()) {
          <!-- Image gallery -->
          <div class="turf-gallery">
            @if (turf()!.images.length > 0) {
              <div class="turf-gallery__main">
                <img [src]="heroImageUrl()" [alt]="turf()!.name" class="turf-gallery__main-img" loading="eager"/>
              </div>
              @if (turf()!.images.length > 1) {
                <div class="turf-gallery__thumbs">
                  @for (img of turf()!.images.slice(0, 5); track img; let i = $index) {
                    <button
                      class="turf-gallery__thumb"
                      [class.active]="activeImageIdx() === i"
                      (click)="activeImageIdx.set(i)"
                      [attr.aria-label]="'View photo ' + (i + 1)"
                    >
                      <img [src]="img" [alt]="'Photo ' + (i + 1)" loading="lazy"/>
                    </button>
                  }
                </div>
              }
            } @else {
              <div class="turf-gallery__placeholder">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                <span style="color:#9ca3af;font-size:0.875rem;">No photos available</span>
              </div>
            }
          </div>

          <div class="container">
            <div class="turf-detail-layout">

              <!-- Left: info -->
              <div class="turf-detail-info">
                <!-- Back -->
                <a routerLink="/turfs" style="display:inline-flex;align-items:center;gap:6px;font-size:0.875rem;font-weight:500;color:#6b7280;text-decoration:none;margin-bottom:20px;">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
                  Back to turfs
                </a>

                <h1 class="turf-detail-info__name">{{ turf()!.name }}</h1>

                <div class="turf-detail-info__meta">
                  <span class="turf-meta-item">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                    {{ turf()!.address.city }}{{ turf()!.address.state ? ', ' + turf()!.address.state : '' }}
                  </span>
                  @if (turf()!.ratingCount > 0) {
                    <span class="turf-meta-item">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="#f59e0b" stroke="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                      {{ turf()!.ratingAvg.toFixed(1) }} <span style="color:#9ca3af;">({{ turf()!.ratingCount }} reviews)</span>
                    </span>
                  }
                  <span class="turf-meta-item">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                    {{ turf()!.operatingHours.open }} – {{ turf()!.operatingHours.close }}
                  </span>
                </div>

                <!-- Sports -->
                <div class="turf-detail-section">
                  <div style="display:flex;flex-wrap:wrap;gap:8px;">
                    @for (sport of turf()!.sportTypes; track sport) {
                      <span class="badge badge--info">{{ sportLabel(sport) }}</span>
                    }
                  </div>
                </div>

                <!-- Description -->
                @if (turf()!.description) {
                  <div class="turf-detail-section">
                    <h2 class="turf-detail-section__title">About this turf</h2>
                    <p style="color:#6b7280;line-height:1.7;">{{ turf()!.description }}</p>
                  </div>
                }

                <!-- Amenities -->
                @if (turf()!.amenities.length > 0) {
                  <div class="turf-detail-section">
                    <h2 class="turf-detail-section__title">Facilities</h2>
                    <div class="amenities-grid">
                      @for (a of turf()!.amenities; track a) {
                        <div class="amenity-item">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                          {{ a }}
                        </div>
                      }
                    </div>
                  </div>
                }

                <!-- Address -->
                @if (turf()!.address.line1 || turf()!.address.city) {
                  <div class="turf-detail-section">
                    <h2 class="turf-detail-section__title">Location</h2>
                    <address style="font-style:normal;color:#6b7280;line-height:1.7;">
                      @if (turf()!.address.line1) { {{ turf()!.address.line1 }}<br> }
                      {{ turf()!.address.city }}{{ turf()!.address.state ? ', ' + turf()!.address.state : '' }}
                      @if (turf()!.address.pincode) { – {{ turf()!.address.pincode }} }
                    </address>
                  </div>
                }

                <!-- ── Reviews section (Phase 6) ─────────────────────────── -->
                <div class="turf-detail-section">
                  <h2 class="turf-detail-section__title">
                    Reviews
                    @if (turf()!.ratingCount > 0) {
                      <span style="font-weight:400;font-size:0.875rem;color:#6b7280;margin-left:8px;">
                        ★ {{ turf()!.ratingAvg.toFixed(1) }} · {{ turf()!.ratingCount }} review{{ turf()!.ratingCount !== 1 ? 's' : '' }}
                      </span>
                    }
                  </h2>

                  <!-- Write-review form (customers only) -->
                  @if (isCustomer()) {
                    @if (!myReview()) {
                      <div class="review-form-card">
                        <p style="font-size:0.875rem;font-weight:600;color:#111827;margin-bottom:10px;">Leave a review</p>
                        <!-- Star picker -->
                        <div class="star-picker" style="margin-bottom:12px;">
                          @for (star of [1,2,3,4,5]; track star) {
                            <button type="button" class="star-btn"
                              [class.active]="draftRating() >= star"
                              (click)="draftRating.set(star)"
                              [attr.aria-label]="star + ' star' + (star > 1 ? 's' : '')">
                              ★
                            </button>
                          }
                        </div>
                        <textarea class="form-control" rows="3" [(ngModel)]="draftComment"
                          placeholder="Share your experience (optional)…" maxlength="1000"
                          style="margin-bottom:12px;resize:vertical;"></textarea>
                        @if (reviewError()) {
                          <div class="alert alert--error" style="font-size:0.8125rem;margin-bottom:10px;">{{ reviewError() }}</div>
                        }
                        <button class="btn btn--primary btn--sm"
                          [class.loading]="reviewSubmitting()"
                          [disabled]="reviewSubmitting() || draftRating() === 0"
                          (click)="submitReview()">
                          @if (!reviewSubmitting()) { Submit review } @else { Submitting… }
                        </button>
                        @if (draftRating() === 0) {
                          <p style="font-size:0.75rem;color:#9ca3af;margin-top:6px;">Select a star rating to submit.</p>
                        }
                      </div>
                    } @else {
                      <!-- Edit my existing review -->
                      <div class="review-form-card">
                        <p style="font-size:0.875rem;font-weight:600;color:#111827;margin-bottom:10px;">Your review</p>
                        <div class="star-picker" style="margin-bottom:12px;">
                          @for (star of [1,2,3,4,5]; track star) {
                            <button type="button" class="star-btn"
                              [class.active]="draftRating() >= star"
                              (click)="draftRating.set(star)"
                              [attr.aria-label]="star + ' star' + (star > 1 ? 's' : '')">★</button>
                          }
                        </div>
                        <textarea class="form-control" rows="3" [(ngModel)]="draftComment"
                          placeholder="Update your comment…" maxlength="1000"
                          style="margin-bottom:12px;resize:vertical;"></textarea>
                        <div style="display:flex;gap:8px;">
                          <button class="btn btn--primary btn--sm"
                            [class.loading]="reviewSubmitting()"
                            [disabled]="reviewSubmitting()"
                            (click)="updateReview()">Save</button>
                          <button class="btn btn--danger btn--sm"
                            [class.loading]="reviewSubmitting()"
                            [disabled]="reviewSubmitting()"
                            (click)="deleteReview()">Delete</button>
                        </div>
                      </div>
                    }
                  }

                  <!-- Reviews list -->
                  @if (reviewsLoading()) {
                    <div style="display:flex;flex-direction:column;gap:12px;margin-top:16px;">
                      @for (i of [1,2]; track i) {
                        <div style="padding:16px;background:#f9fafb;border-radius:10px;">
                          <div class="skeleton skeleton--title" style="width:120px;margin-bottom:8px;"></div>
                          <div class="skeleton skeleton--text"></div>
                        </div>
                      }
                    </div>
                  } @else if (reviews().length === 0) {
                    <p style="font-size:0.875rem;color:#9ca3af;margin-top:16px;">No reviews yet. Be the first to review!</p>
                  } @else {
                    <div style="display:flex;flex-direction:column;gap:12px;margin-top:16px;">
                      @for (r of reviews(); track r.id) {
                        <div class="review-card">
                          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;flex-wrap:wrap;gap:8px;">
                            <div style="display:flex;align-items:center;gap:10px;">
                              <div class="review-avatar">{{ initials(r.customer?.name) }}</div>
                              <div>
                                <div style="font-weight:600;font-size:0.875rem;color:#111827;">{{ r.customer?.name ?? 'Customer' }}</div>
                                <div style="font-size:0.75rem;color:#9ca3af;">{{ formatDate(r.createdAt) }}</div>
                              </div>
                            </div>
                            <div class="star-display">
                              @for (s of starsArray(r.rating); track s) {
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
                    @if (reviewPages() > 1) {
                      <div style="display:flex;gap:8px;align-items:center;margin-top:16px;">
                        <button class="btn btn--ghost btn--sm" [disabled]="reviewPage() <= 1" (click)="loadReviewPage(reviewPage()-1)">Prev</button>
                        <span style="font-size:0.8125rem;color:#6b7280;">{{ reviewPage() }}/{{ reviewPages() }}</span>
                        <button class="btn btn--ghost btn--sm" [disabled]="reviewPage() >= reviewPages()" (click)="loadReviewPage(reviewPage()+1)">Next</button>
                      </div>
                    }
                  }
                </div>
                <!-- ── end reviews ────────────────────────────────────────── -->
              </div>

              <!-- Right: booking card -->
              <aside class="turf-booking-card">
                <div class="card">
                  <div class="card__body">
                    <div class="turf-price-display">
                      <span class="turf-price-display__amount">₹{{ turf()!.pricing.base }}</span>
                      <span class="turf-price-display__unit">/hr</span>
                    </div>
                    @if (turf()!.pricing.weekend) {
                      <p style="font-size:0.8125rem;color:#6b7280;margin-bottom:8px;">
                        Weekend: ₹{{ turf()!.pricing.weekend }}/hr
                      </p>
                    }

                    <div class="turf-hours-display">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                      Open {{ turf()!.operatingHours.open }} – {{ turf()!.operatingHours.close }}
                    </div>

                    <div class="turf-slot-duration">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                      {{ turf()!.slotDurationMinutes }}-minute slots
                    </div>

                    <div style="margin-top:20px;">
                      @if (isLoggedIn()) {
                        <a
                          [routerLink]="['/turfs', turf()!.id, 'book']"
                          class="btn btn--primary btn--full btn--lg"
                        >
                          Book a slot
                        </a>
                      } @else {
                        <a
                          [routerLink]="'/login'"
                          [queryParams]="{ returnUrl: '/turfs/' + turf()!.id + '/book' }"
                          class="btn btn--primary btn--full btn--lg"
                        >
                          Sign in to book
                        </a>
                      }
                    </div>

                    <p class="turf-booking-card__note">Free cancellation · No booking fees</p>
                  </div>
                </div>
              </aside>
            </div>
          </div>
        }
      </main>
    </div>
  `,
  styles: [`
    .turf-gallery {
      background: #111827;
      width: 100%;
      max-height: 480px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      gap: 4px;
      @media (max-width: 768px) { max-height: 280px; }
    }
    .turf-gallery__main { flex: 1; overflow: hidden; }
    .turf-gallery__main-img { width: 100%; height: 420px; object-fit: cover; display: block; @media (max-width:768px) { height: 240px; } }
    .turf-gallery__thumbs { display: flex; gap: 4px; height: 80px; padding: 0 4px 4px; @media (max-width:768px) { display:none; } }
    .turf-gallery__thumb { width: 120px; flex-shrink: 0; overflow: hidden; border-radius: 6px; cursor: pointer; border: 2px solid transparent; transition: border-color 150ms ease;
      &.active { border-color: #16a34a; }
      img { width: 100%; height: 100%; object-fit: cover; display: block; } }
    .turf-gallery__placeholder { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; height: 320px; }

    .turf-detail-layout { display: grid; grid-template-columns: 1fr 340px; gap: 48px; padding: 32px 0 64px;
      @media (max-width: 900px) { grid-template-columns: 1fr; }
    }

    .turf-detail-info__name { font-size: 2rem; font-weight: 800; color: #111827; letter-spacing: -0.02em; margin-bottom: 12px; @media (max-width:640px) { font-size: 1.5rem; } }
    .turf-detail-info__meta { display: flex; flex-wrap: wrap; gap: 16px; margin-bottom: 20px; }
    .turf-meta-item { display: flex; align-items: center; gap: 5px; font-size: 0.9rem; color: #6b7280; }
    .turf-detail-section { padding: 24px 0; border-top: 1px solid #f3f4f6; }
    .turf-detail-section__title { font-size: 1rem; font-weight: 700; color: #111827; margin-bottom: 12px; }

    .amenities-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 10px; }
    .amenity-item { display: flex; align-items: center; gap: 8px; font-size: 0.875rem; color: #374151; font-weight: 500; }

    /* Booking card */
    .turf-booking-card { @media (max-width: 900px) { order: -1; } }
    .turf-price-display { display: flex; align-items: baseline; gap: 4px; margin-bottom: 8px; }
    .turf-price-display__amount { font-size: 2rem; font-weight: 800; color: #16a34a; letter-spacing: -0.02em; }
    .turf-price-display__unit { font-size: 1rem; color: #9ca3af; }
    .turf-hours-display, .turf-slot-duration { display: flex; align-items: center; gap: 6px; font-size: 0.875rem; color: #6b7280; margin-bottom: 8px; }
    .turf-booking-card__note { font-size: 0.75rem; color: #9ca3af; text-align: center; margin-top: 12px; }

    /* Reviews */
    .review-form-card { background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:16px;margin-bottom:8px; }
    .star-picker { display:flex;gap:4px; }
    .star-btn { background:none;border:none;font-size:1.75rem;cursor:pointer;color:#e5e7eb;line-height:1;padding:0;transition:color 150ms;
      &.active { color:#f59e0b; }
      &:hover { color:#fbbf24; }
    }
    .star-display { display:flex;gap:2px;font-size:1.125rem; }
    .review-card { padding:16px;background:#f9fafb;border:1px solid #f3f4f6;border-radius:10px; }
    .review-avatar { width:32px;height:32px;border-radius:50%;background:#e5e7eb;color:#6b7280;font-size:0.75rem;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0; }
  `],
})
export class TurfDetailComponent implements OnInit {
  private readonly turfService   = inject(TurfService);
  private readonly reviewService = inject(ReviewService);
  private readonly bookingService = inject(BookingService);
  private readonly authService   = inject(AuthService);
  private readonly toastService  = inject(ToastService);
  private readonly route         = inject(ActivatedRoute);
  private readonly router        = inject(Router);

  // ── Turf state ──────────────────────────────────────────────────────────────
  readonly turf           = signal<Turf | null>(null);
  readonly loading        = signal(true);
  readonly activeImageIdx = signal(0);
  readonly activeImage    = () => this.turf()?.images[this.activeImageIdx()] ?? '';

  /**
   * For Cloudinary URLs, inject a transformation that requests the image
   * at hero display size (1280×420, crop fill, auto quality & format).
   * For any other URL, return it unchanged.
   */
  heroImageUrl(): string {
    const url = this.activeImage();
    if (!url) return '';
    if (url.includes('res.cloudinary.com') && url.includes('/image/upload/')) {
      return url.replace(
        '/image/upload/',
        '/image/upload/w_1280,h_420,c_fill,q_auto,f_auto/'
      );
    }
    return url;
  }

  // ── Reviews state ───────────────────────────────────────────────────────────
  readonly reviews          = signal<Review[]>([]);
  readonly reviewsLoading   = signal(false);
  readonly reviewPage       = signal(1);
  readonly reviewPages      = signal(1);
  readonly myReview         = signal<Review | null>(null);
  readonly draftRating      = signal(0);
  readonly reviewSubmitting = signal(false);
  readonly reviewError      = signal('');
  /** bookingId of a completed booking for this turf — loaded lazily on first review attempt */
  private completedBookingId: string | null = null;
  draftComment = '';

  get isLoggedIn(): () => boolean { return () => this.authService.isAuthenticated; }
  isCustomer(): boolean { return this.authService.currentUser?.role === 'customer'; }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.turfService.getPublicTurfById(id).subscribe({
      next: (t) => {
        this.turf.set(t);
        this.loading.set(false);
        this.loadReviews(t.id);
        if (this.isCustomer()) this.loadMyReview();
      },
      error: () => { this.turf.set(null); this.loading.set(false); },
    });
  }

  loadReviews(turfId: string, page = 1): void {
    this.reviewsLoading.set(true);
    this.reviewPage.set(page);
    this.reviewService.getTurfReviews(turfId, page).subscribe({
      next: (d) => {
        this.reviews.set(d.reviews);
        this.reviewPages.set(d.pages);
        this.reviewsLoading.set(false);
      },
      error: () => this.reviewsLoading.set(false),
    });
  }

  loadReviewPage(page: number): void {
    const id = this.turf()?.id;
    if (id) this.loadReviews(id, page);
  }

  loadMyReview(): void {
    this.reviewService.getMyReviews().subscribe({
      next: (d) => {
        const mine = d.reviews.find(r => r.turfId === this.turf()?.id) ?? null;
        this.myReview.set(mine);
        if (mine) {
          this.draftRating.set(mine.rating);
          this.draftComment = mine.comment;
          this.completedBookingId = mine.bookingId;
        }
      },
    });
  }

  /**
   * Submit a new review. Fetches the customer's completed booking for this turf
   * (via getMyBookings with status=completed) then creates the review.
   */
  submitReview(): void {
    if (this.draftRating() === 0) return;
    this.reviewSubmitting.set(true);
    this.reviewError.set('');

    const doCreate = (bookingId: string) => {
      this.reviewService.create({
        bookingId,
        rating:  this.draftRating(),
        comment: this.draftComment,
      }).subscribe({
        next: (saved) => {
          this.reviewSubmitting.set(false);
          this.myReview.set(saved);
          this.completedBookingId = saved.bookingId;
          this.toastService.success('Review submitted!');
          this.loadReviews(this.turf()!.id, 1);
          // Refresh turf to get updated rating average
          this.turfService.getPublicTurfById(this.turf()!.id).subscribe({ next: t => this.turf.set(t) });
        },
        error: (err: HttpErrorResponse) => {
          this.reviewSubmitting.set(false);
          this.reviewError.set(err.error?.message ?? 'Failed to submit review.');
        },
      });
    };

    if (this.completedBookingId) {
      doCreate(this.completedBookingId);
      return;
    }

    // Fetch all bookings (confirmed + completed) to find one for this turf that is past
    this.bookingService.getMyBookings({ limit: 50 }).subscribe({
      next: (d) => {
        const today = new Date();
        const booking = d.bookings.find(b => {
          const turfMatch = (typeof b.turfId === 'string' ? b.turfId : (b as any).turf?.id) === this.turf()?.id
            || (b as any).turf?.id === this.turf()?.id;
          if (!turfMatch) return false;
          if (b.status === 'completed') return true;
          if (b.status === 'confirmed') {
            try { return new Date(b.date) < today; } catch { return false; }
          }
          return false;
        });
        if (!booking) {
          this.reviewSubmitting.set(false);
          this.reviewError.set('You need a past or completed booking for this turf to leave a review. Visit My Bookings after your session.');
          return;
        }
        this.completedBookingId = booking.id;
        doCreate(booking.id);
      },
      error: () => {
        this.reviewSubmitting.set(false);
        this.reviewError.set('Could not verify your bookings. Try reviewing from My Bookings.');
      },
    });
  }

  updateReview(): void {
    const r = this.myReview();
    if (!r) return;
    this.reviewSubmitting.set(true);
    this.reviewError.set('');
    this.reviewService.update(r.id, { rating: this.draftRating(), comment: this.draftComment }).subscribe({
      next: (updated) => {
        this.reviewSubmitting.set(false);
        this.myReview.set(updated);
        this.toastService.success('Review updated');
        this.loadReviews(this.turf()!.id, this.reviewPage());
      },
      error: (err: any) => {
        this.reviewSubmitting.set(false);
        this.reviewError.set(err.error?.message ?? 'Update failed.');
      },
    });
  }

  deleteReview(): void {
    const r = this.myReview();
    if (!r || !confirm('Delete your review?')) return;
    this.reviewSubmitting.set(true);
    this.reviewService.delete(r.id).subscribe({
      next: () => {
        this.reviewSubmitting.set(false);
        this.myReview.set(null);
        this.draftRating.set(0);
        this.draftComment = '';
        this.toastService.success('Review deleted');
        this.loadReviews(this.turf()!.id, 1);
      },
      error: () => this.reviewSubmitting.set(false),
    });
  }

  sportLabel(s: SportType): string { return SPORT_TYPE_LABELS[s]; }
  starsArray(n: number): number[] { return [1, 2, 3, 4, 5]; }
  initials(name?: string | null): string {
    return (name ?? '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  }
  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  }
}
