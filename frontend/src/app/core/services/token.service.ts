import { Injectable } from '@angular/core';

/**
 * Holds the JWT access token in memory only (locked decision #18).
 * Never written to localStorage or sessionStorage.
 * The refresh token lives exclusively in an httpOnly cookie — this service
 * never touches it.
 */
@Injectable({ providedIn: 'root' })
export class TokenService {
  private _accessToken: string | null = null;

  setAccessToken(token: string): void {
    this._accessToken = token;
  }

  getAccessToken(): string | null {
    return this._accessToken;
  }

  clearAccessToken(): void {
    this._accessToken = null;
  }

  hasToken(): boolean {
    return this._accessToken !== null;
  }
}
