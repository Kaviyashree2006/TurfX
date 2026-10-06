import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { environment } from '../../../environments/environment';
import { Turf, TurfsResponse, CreateTurfDto, UpdateTurfDto } from '../models/turf.model';

@Injectable({ providedIn: 'root' })
export class TurfService {
  private readonly http = inject(HttpClient);
  private readonly api  = `${environment.apiUrl}/turfs`;
  private readonly ownerApi = `${environment.apiUrl}/owner`;

  // ── Public ──────────────────────────────────────────────────────────────────

  getPublicTurfs(params?: {
    sport?: string;
    city?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Observable<TurfsResponse> {
    let p = new HttpParams();
    if (params?.sport)  p = p.set('sport',  params.sport);
    if (params?.city)   p = p.set('city',   params.city);
    if (params?.search) p = p.set('search', params.search);
    if (params?.page)   p = p.set('page',   String(params.page));
    if (params?.limit)  p = p.set('limit',  String(params.limit));
    return this.http
      .get<{ success: true; data: TurfsResponse }>(this.api, { params: p })
      .pipe(map(r => r.data));
  }

  getPublicTurfById(id: string): Observable<Turf> {
    return this.http
      .get<{ success: true; data: { turf: Turf } }>(`${this.api}/${id}`)
      .pipe(map(r => r.data.turf));
  }

  // ── Owner ────────────────────────────────────────────────────────────────────

  getOwnerTurfs(): Observable<{ turfs: Turf[]; total: number }> {
    return this.http
      .get<{ success: true; data: { turfs: Turf[]; total: number } }>(`${this.ownerApi}/turfs`)
      .pipe(map(r => r.data));
  }

  getOwnerTurfById(id: string): Observable<Turf> {
    return this.http
      .get<{ success: true; data: { turf: Turf } }>(`${this.ownerApi}/turfs/${id}`)
      .pipe(map(r => r.data.turf));
  }

  createTurf(dto: CreateTurfDto): Observable<Turf> {
    return this.http
      .post<{ success: true; data: { turf: Turf } }>(this.api, dto)
      .pipe(map(r => r.data.turf));
  }

  updateTurf(id: string, dto: UpdateTurfDto): Observable<{ turf: Turf; resubmittedForReview: boolean }> {
    return this.http
      .put<{ success: true; data: { turf: Turf; resubmittedForReview: boolean } }>(`${this.api}/${id}`, dto)
      .pipe(map(r => r.data));
  }

  deleteTurf(id: string): Observable<void> {
    return this.http
      .delete<void>(`${this.api}/${id}`)
      .pipe(map(() => undefined));
  }

  toggleActive(id: string): Observable<Turf> {
    return this.http
      .patch<{ success: true; data: { turf: Turf } }>(`${this.api}/${id}/toggle-active`, {})
      .pipe(map(r => r.data.turf));
  }

  uploadImages(id: string, files: File[]): Observable<{ images: string[] }> {
    const form = new FormData();
    files.forEach(f => form.append('images', f));
    return this.http
      .post<{ success: true; data: { images: string[] } }>(`${this.api}/${id}/images`, form)
      .pipe(map(r => r.data));
  }

  deleteImage(id: string, imageUrl: string): Observable<{ images: string[] }> {
    return this.http
      .delete<{ success: true; data: { images: string[] } }>(`${this.api}/${id}/images`, {
        body: { imageUrl },
      })
      .pipe(map(r => r.data));
  }

  // ── Admin ─────────────────────────────────────────────────────────────────

  adminGetTurfs(params?: {
    status?: string;
    search?: string;
    page?: number;
  }): Observable<TurfsResponse> {
    let p = new HttpParams();
    if (params?.status) p = p.set('status', params.status);
    if (params?.search) p = p.set('search', params.search);
    if (params?.page)   p = p.set('page',   String(params.page));
    return this.http
      .get<{ success: true; data: TurfsResponse }>(`${environment.apiUrl}/admin/turfs`, { params: p })
      .pipe(map(r => r.data));
  }

  adminGetTurfById(id: string): Observable<Turf> {
    return this.http
      .get<{ success: true; data: { turf: Turf } }>(`${environment.apiUrl}/admin/turfs/${id}`)
      .pipe(map(r => r.data.turf));
  }

  adminApproveTurf(id: string): Observable<Turf> {
    return this.http
      .patch<{ success: true; data: { turf: Turf } }>(`${environment.apiUrl}/admin/turfs/${id}/approve`, {})
      .pipe(map(r => r.data.turf));
  }

  adminRejectTurf(id: string, rejectionReason: string): Observable<Turf> {
    return this.http
      .patch<{ success: true; data: { turf: Turf } }>(`${environment.apiUrl}/admin/turfs/${id}/reject`, { rejectionReason })
      .pipe(map(r => r.data.turf));
  }

  adminSuspendTurf(id: string): Observable<Turf> {
    return this.http
      .patch<{ success: true; data: { turf: Turf } }>(`${environment.apiUrl}/admin/turfs/${id}/suspend`, {})
      .pipe(map(r => r.data.turf));
  }
}
