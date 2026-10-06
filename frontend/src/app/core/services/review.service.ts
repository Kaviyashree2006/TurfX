import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { Review, ReviewsResponse, CreateReviewDto, UpdateReviewDto } from '../models/review.model';

@Injectable({ providedIn: 'root' })
export class ReviewService {
  private readonly http = inject(HttpClient);
  private readonly api  = `${environment.apiUrl}`;

  // ── Public ──────────────────────────────────────────────────────────────────
  getTurfReviews(turfId: string, page = 1): Observable<ReviewsResponse> {
    const params = new HttpParams().set('page', String(page));
    return this.http
      .get<{ success: true; data: ReviewsResponse }>(
        `${this.api}/turfs/${turfId}/reviews`, { params })
      .pipe(map(r => r.data));
  }

  // ── Customer ────────────────────────────────────────────────────────────────
  getMyReviews(): Observable<{ reviews: Review[]; total: number }> {
    return this.http
      .get<{ success: true; data: { reviews: Review[]; total: number } }>(
        `${this.api}/reviews/my`)
      .pipe(map(r => r.data));
  }

  create(dto: CreateReviewDto): Observable<Review> {
    return this.http
      .post<{ success: true; data: { review: Review } }>(`${this.api}/reviews`, dto)
      .pipe(map(r => r.data.review));
  }

  update(id: string, dto: UpdateReviewDto): Observable<Review> {
    return this.http
      .put<{ success: true; data: { review: Review } }>(`${this.api}/reviews/${id}`, dto)
      .pipe(map(r => r.data.review));
  }

  delete(id: string): Observable<void> {
    return this.http
      .delete<void>(`${this.api}/reviews/${id}`)
      .pipe(map(() => undefined));
  }

  // ── Owner ────────────────────────────────────────────────────────────────────
  getOwnerTurfReviews(turfId: string, page = 1): Observable<ReviewsResponse & {
    turfName: string; ratingAvg: number; ratingCount: number;
  }> {
    const params = new HttpParams().set('page', String(page));
    return this.http
      .get<{ success: true; data: any }>(
        `${this.api}/owner/turfs/${turfId}/reviews`, { params })
      .pipe(map(r => r.data));
  }

  // ── Admin ────────────────────────────────────────────────────────────────────
  adminGetReviews(params?: { turfId?: string; page?: number }): Observable<ReviewsResponse> {
    let p = new HttpParams();
    if (params?.turfId) p = p.set('turfId', params.turfId);
    if (params?.page)   p = p.set('page',   String(params.page));
    return this.http
      .get<{ success: true; data: ReviewsResponse }>(
        `${this.api}/admin/reviews`, { params: p })
      .pipe(map(r => r.data));
  }

  adminDelete(id: string): Observable<void> {
    return this.http
      .delete<void>(`${this.api}/admin/reviews/${id}`)
      .pipe(map(() => undefined));
  }
}
