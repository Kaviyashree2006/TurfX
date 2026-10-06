import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { environment } from '../../../environments/environment';
import {
  Tournament, TournamentsResponse, MyRegistrationsResponse,
  ParticipantsResponse, CreateTournamentDto, UpdateTournamentDto,
} from '../models/tournament.model';

@Injectable({ providedIn: 'root' })
export class TournamentService {
  private readonly http = inject(HttpClient);
  private readonly api      = `${environment.apiUrl}/tournaments`;
  private readonly ownerApi = `${environment.apiUrl}/owner/tournaments`;
  private readonly adminApi = `${environment.apiUrl}/admin/tournaments`;

  // ── Public ────────────────────────────────────────────────────────────────

  getAll(params?: { status?: string; page?: number }): Observable<TournamentsResponse> {
    let p = new HttpParams();
    if (params?.status) p = p.set('status', params.status);
    if (params?.page)   p = p.set('page',   String(params.page));
    return this.http
      .get<{ success: true; data: TournamentsResponse }>(this.api, { params: p })
      .pipe(map(r => r.data));
  }

  getById(id: string): Observable<Tournament> {
    return this.http
      .get<{ success: true; data: { tournament: Tournament } }>(`${this.api}/${id}`)
      .pipe(map(r => r.data.tournament));
  }

  // ── Customer ──────────────────────────────────────────────────────────────

  getMyRegistrations(): Observable<MyRegistrationsResponse> {
    return this.http
      .get<{ success: true; data: MyRegistrationsResponse }>(`${this.api}/my`)
      .pipe(map(r => r.data));
  }

  register(id: string, phone = ''): Observable<{ registrationId: string }> {
    return this.http
      .post<{ success: true; data: { registrationId: string } }>(`${this.api}/${id}/register`, { phone })
      .pipe(map(r => r.data));
  }

  unregister(id: string): Observable<void> {
    return this.http
      .delete<void>(`${this.api}/${id}/register`)
      .pipe(map(() => undefined));
  }

  // ── Owner ─────────────────────────────────────────────────────────────────

  getOwnerTournaments(): Observable<{ tournaments: Tournament[]; total: number }> {
    return this.http
      .get<{ success: true; data: { tournaments: Tournament[]; total: number } }>(this.ownerApi)
      .pipe(map(r => r.data));
  }

  getOwnerTournament(id: string): Observable<Tournament> {
    return this.http
      .get<{ success: true; data: { tournament: Tournament } }>(`${this.ownerApi}/${id}`)
      .pipe(map(r => r.data.tournament));
  }

  create(dto: CreateTournamentDto): Observable<Tournament> {
    return this.http
      .post<{ success: true; data: { tournament: Tournament } }>(this.ownerApi, dto)
      .pipe(map(r => r.data.tournament));
  }

  update(id: string, dto: UpdateTournamentDto): Observable<Tournament> {
    return this.http
      .put<{ success: true; data: { tournament: Tournament } }>(`${this.ownerApi}/${id}`, dto)
      .pipe(map(r => r.data.tournament));
  }

  delete(id: string): Observable<void> {
    return this.http
      .delete<void>(`${this.ownerApi}/${id}`)
      .pipe(map(() => undefined));
  }

  getParticipants(id: string): Observable<ParticipantsResponse> {
    return this.http
      .get<{ success: true; data: ParticipantsResponse }>(`${this.ownerApi}/${id}/participants`)
      .pipe(map(r => r.data));
  }

  // ── Admin ─────────────────────────────────────────────────────────────────

  adminGetAll(params?: { status?: string; page?: number }): Observable<TournamentsResponse> {
    let p = new HttpParams();
    if (params?.status) p = p.set('status', params.status);
    if (params?.page)   p = p.set('page',   String(params.page));
    return this.http
      .get<{ success: true; data: TournamentsResponse }>(this.adminApi, { params: p })
      .pipe(map(r => r.data));
  }

  adminUpdateStatus(id: string, status: string): Observable<Tournament> {
    return this.http
      .patch<{ success: true; data: { tournament: Tournament } }>(`${this.adminApi}/${id}/status`, { status })
      .pipe(map(r => r.data.tournament));
  }

  adminDelete(id: string): Observable<void> {
    return this.http
      .delete<void>(`${this.adminApi}/${id}`)
      .pipe(map(() => undefined));
  }
}
