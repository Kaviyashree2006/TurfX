import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { environment } from '../../../environments/environment';
import {
  Booking,
  BookingsResponse,
  AvailabilityResponse,
  CreateBookingDto,
} from '../models/booking.model';

@Injectable({ providedIn: 'root' })
export class BookingService {
  private readonly http = inject(HttpClient);
  private readonly api  = `${environment.apiUrl}/bookings`;
  private readonly turfApi  = `${environment.apiUrl}/turfs`;
  private readonly ownerApi = `${environment.apiUrl}/owner`;

  /** Fetch the platform fee percent configured by admin (no auth required). */
  getPlatformFeePercent(): Observable<number> {
    return this.http
      .get<{ success: true; data: { platformFeePercent: number } }>(
        `${environment.apiUrl}/settings/public`
      )
      .pipe(map(r => r.data.platformFeePercent));
  }

  // ── Availability (public) ────────────────────────────────────────────────
  getAvailability(turfId: string, date: string): Observable<AvailabilityResponse> {
    return this.http
      .get<{ success: true; data: AvailabilityResponse }>(
        `${this.turfApi}/${turfId}/availability`,
        { params: new HttpParams().set('date', date) }
      )
      .pipe(map(r => r.data));
  }

  // ── Customer ─────────────────────────────────────────────────────────────
  createBooking(dto: CreateBookingDto): Observable<Booking> {
    return this.http
      .post<{ success: true; data: { booking: Booking } }>(this.api, dto)
      .pipe(map(r => r.data.booking));
  }

  getMyBookings(params?: { status?: string; page?: number; limit?: number }): Observable<BookingsResponse> {
    let p = new HttpParams();
    if (params?.status) p = p.set('status', params.status);
    if (params?.page)   p = p.set('page',   String(params.page));
    if (params?.limit)  p = p.set('limit',  String(params.limit));
    return this.http
      .get<{ success: true; data: BookingsResponse }>(`${this.api}/my`, { params: p })
      .pipe(map(r => r.data));
  }

  getBookingById(id: string): Observable<Booking> {
    return this.http
      .get<{ success: true; data: { booking: Booking } }>(`${this.api}/${id}`)
      .pipe(map(r => r.data.booking));
  }

  cancelBooking(id: string, reason?: string): Observable<Booking> {
    return this.http
      .patch<{ success: true; data: { booking: Booking } }>(
        `${this.api}/${id}/cancel`,
        { reason: reason ?? null }
      )
      .pipe(map(r => r.data.booking));
  }

  // ── Owner ────────────────────────────────────────────────────────────────
  getOwnerBookings(params?: {
    status?: string;
    turfId?: string;
    page?: number;
    limit?: number;
  }): Observable<BookingsResponse> {
    let p = new HttpParams();
    if (params?.status) p = p.set('status', params.status);
    if (params?.turfId) p = p.set('turfId', params.turfId);
    if (params?.page)   p = p.set('page',   String(params.page));
    if (params?.limit)  p = p.set('limit',  String(params.limit));
    return this.http
      .get<{ success: true; data: BookingsResponse }>(`${this.ownerApi}/bookings`, { params: p })
      .pipe(map(r => r.data));
  }

  ownerCancelBooking(id: string, reason?: string): Observable<Booking> {
    return this.http
      .patch<{ success: true; data: { booking: Booking } }>(
        `${this.ownerApi}/bookings/${id}/cancel`,
        { reason: reason ?? null }
      )
      .pipe(map(r => r.data.booking));
  }

  // ── Admin ─────────────────────────────────────────────────────────────────
  adminGetBookings(params?: {
    status?: string;
    turfId?: string;
    page?: number;
    limit?: number;
  }): Observable<BookingsResponse> {
    let p = new HttpParams();
    if (params?.status) p = p.set('status', params.status);
    if (params?.turfId) p = p.set('turfId', params.turfId);
    if (params?.page)   p = p.set('page',   String(params.page));
    if (params?.limit)  p = p.set('limit',  String(params.limit));
    return this.http
      .get<{ success: true; data: BookingsResponse }>(
        `${environment.apiUrl}/admin/bookings`, { params: p }
      )
      .pipe(map(r => r.data));
  }
}
