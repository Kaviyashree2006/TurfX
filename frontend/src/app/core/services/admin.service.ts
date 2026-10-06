import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { environment } from '../../../environments/environment';
import { OwnerSummary, OwnersResponse } from '../models/admin.model';

@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/admin`;

  // ── Owner Approvals ──────────────────────────────────────────────────────

  getOwners(params?: { status?: string; search?: string }): Observable<OwnersResponse> {
    let httpParams = new HttpParams();
    if (params?.status) httpParams = httpParams.set('status', params.status);
    if (params?.search) httpParams = httpParams.set('search', params.search);

    return this.http
      .get<{ success: true; data: OwnersResponse }>(`${this.apiUrl}/owners`, { params: httpParams })
      .pipe(map((res) => res.data));
  }

  getOwnerById(id: string): Observable<OwnerSummary> {
    return this.http
      .get<{ success: true; data: { owner: OwnerSummary } }>(`${this.apiUrl}/owners/${id}`)
      .pipe(map((res) => res.data.owner));
  }

  approveOwner(id: string): Observable<OwnerSummary> {
    return this.http
      .patch<{ success: true; data: { owner: OwnerSummary } }>(`${this.apiUrl}/owners/${id}/approve`, {})
      .pipe(map((res) => res.data.owner));
  }

  rejectOwner(id: string, rejectionReason: string): Observable<OwnerSummary> {
    return this.http
      .patch<{ success: true; data: { owner: OwnerSummary } }>(
        `${this.apiUrl}/owners/${id}/reject`,
        { rejectionReason }
      )
      .pipe(map((res) => res.data.owner));
  }

  // ── Dashboard stats ──────────────────────────────────────────────────────
  getStats(): Observable<{
    pendingOwners: number;
    activeTurfs: number;
    totalBookings: number;
    platformRevenue: number;
    upcomingTournaments: number;
  }> {
    return this.http
      .get<{ success: true; data: { pendingOwners: number; activeTurfs: number; totalBookings: number; platformRevenue: number; upcomingTournaments: number } }>(
        `${this.apiUrl}/stats`
      )
      .pipe(map((res) => res.data));
  }
}
