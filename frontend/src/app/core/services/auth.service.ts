import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, tap, catchError, throwError, of } from 'rxjs';
import { map } from 'rxjs/operators';

import { environment } from '../../../environments/environment';
import { TokenService } from './token.service';
import { User, AuthResponse } from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly tokenService = inject(TokenService);
  private readonly apiUrl = `${environment.apiUrl}/auth`;

  // ── State ──────────────────────────────────────────────────────────────────
  private _currentUser$ = new BehaviorSubject<User | null>(null);
  private _isLoading$ = new BehaviorSubject<boolean>(true); // true on init until refresh completes

  readonly currentUser$ = this._currentUser$.asObservable();
  readonly isLoading$ = this._isLoading$.asObservable();
  readonly isAuthenticated$ = this._currentUser$.pipe(map((u) => u !== null));
  readonly role$ = this._currentUser$.pipe(map((u) => u?.role ?? null));

  // ── Init: silent session recovery on page load (Doc 08, decision #18) ──────
  /**
   * Called once from APP_INITIALIZER (via firstValueFrom). Attempts to restore
   * the session from the httpOnly refresh-token cookie. Returns true on success,
   * false if no cookie / cookie expired / server unreachable.
   *
   * _isLoading$ is set false exactly once here — after the attempt resolves
   * either way — so route guards always unblock after this completes.
   */
  initializeSession(): Observable<boolean> {
    return this.http
      .post<{ success: true; data: AuthResponse }>(
        `${this.apiUrl}/refresh`,
        {},
        { withCredentials: true }
      )
      .pipe(
        map((res) => res.data),
        tap((data) => {
          this.tokenService.setAccessToken(data.accessToken);
          this._currentUser$.next(data.user);
        }),
        map(() => true),
        catchError(() => of(false)),
        tap(() => this._isLoading$.next(false))   // always runs, success or failure
      );
  }

  // ── Auth operations ────────────────────────────────────────────────────────

  registerCustomer(payload: {
    name: string;
    email: string;
    password: string;
    phone?: string;
  }): Observable<AuthResponse> {
    return this.http
      .post<{ success: true; data: AuthResponse }>(`${this.apiUrl}/register`, payload)
      .pipe(
        map((res) => res.data),
        tap((data) => this._handleAuthSuccess(data))
      );
  }

  registerOwner(payload: {
    name: string;
    email: string;
    password: string;
    phone?: string;
    businessName: string;
    businessAddress: string;
  }): Observable<AuthResponse> {
    return this.http
      .post<{ success: true; data: AuthResponse }>(`${this.apiUrl}/register/owner`, payload)
      .pipe(
        map((res) => res.data),
        tap((data) => this._handleAuthSuccess(data))
      );
  }

  login(email: string, password: string): Observable<AuthResponse> {
    return this.http
      .post<{ success: true; data: AuthResponse }>(`${this.apiUrl}/login`, { email, password })
      .pipe(
        map((res) => res.data),
        tap((data) => this._handleAuthSuccess(data))
      );
  }

  /**
   * Refreshes the access token using the httpOnly cookie.
   * The browser sends the cookie automatically — no JS token handling needed.
   */
  refreshTokens(): Observable<AuthResponse> {
    return this.http
      .post<{ success: true; data: AuthResponse }>(
        `${this.apiUrl}/refresh`,
        {},
        { withCredentials: true }
      )
      .pipe(
        map((res) => res.data),
        tap((data) => {
          this._handleAuthSuccess(data);
        }),
        catchError((err) => {
          this._clearSession();
          return throwError(() => err);
        })
      );
  }

  logout(): Observable<void> {
    return this.http
      .post<void>(`${this.apiUrl}/logout`, {}, { withCredentials: true })
      .pipe(
        tap(() => {
          this._clearSession();
          this.router.navigate(['/login']);
        }),
        catchError(() => {
          // Even if server call fails, clear local session
          this._clearSession();
          this.router.navigate(['/login']);
          return of(undefined);
        })
      );
  }

  getMe(): Observable<User> {
    return this.http
      .get<{ success: true; data: { user: User } }>(`${this.apiUrl}/me`)
      .pipe(
        map((res) => res.data.user),
        tap((user) => this._currentUser$.next(user))
      );
  }

  forgotPassword(email: string): Observable<string> {
    return this.http
      .post<{ success: true; message: string }>(`${this.apiUrl}/forgot-password`, { email })
      .pipe(map((res) => res.message));
  }

  resetPassword(token: string, password: string): Observable<string> {
    return this.http
      .post<{ success: true; message: string }>(`${this.apiUrl}/reset-password`, { token, password })
      .pipe(map((res) => res.message));
  }

  resubmitOwner(payload: {
    name: string;
    phone?: string;
    businessName: string;
    businessAddress: string;
  }): Observable<import('../models/user.model').User> {
    return this.http
      .put<{ success: true; data: { user: import('../models/user.model').User } }>(
        `${this.apiUrl}/owner/resubmit`,
        payload
      )
      .pipe(
        map((res) => res.data.user),
        tap((user) => this._currentUser$.next(user))
      );
  }

  // ── Convenience getters ────────────────────────────────────────────────────

  get currentUser(): User | null {
    return this._currentUser$.getValue();
  }

  get isAuthenticated(): boolean {
    return this._currentUser$.getValue() !== null;
  }

  get role(): string | null {
    return this._currentUser$.getValue()?.role ?? null;
  }

  // ── Private ────────────────────────────────────────────────────────────────

  private _handleAuthSuccess(data: AuthResponse): void {
    this.tokenService.setAccessToken(data.accessToken);
    this._currentUser$.next(data.user);
    this._isLoading$.next(false);
  }

  private _clearSession(): void {
    this.tokenService.clearAccessToken();
    this._currentUser$.next(null);
    this._isLoading$.next(false);
  }
}
