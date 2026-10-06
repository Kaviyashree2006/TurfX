import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';

import { TokenService } from '../services/token.service';
import { AuthService } from '../services/auth.service';

let _isRefreshing = false;

/**
 * JWT interceptor (Doc 04, Doc 08):
 * 1. Attaches Authorization: Bearer <token> from in-memory TokenService.
 * 2. On 401 TOKEN_EXPIRED: silently calls /auth/refresh (cookie auto-sent),
 *    stores new access token in memory, retries the original request once.
 * 3. If refresh also fails: forces logout.
 */
export const jwtInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
) => {
  const tokenService = inject(TokenService);
  const authService = inject(AuthService);

  // Skip auth header for the refresh endpoint itself (would cause a loop)
  const isRefreshEndpoint = req.url.includes('/auth/refresh');
  const token = tokenService.getAccessToken();

  let authReq = req;
  if (token && !isRefreshEndpoint) {
    authReq = req.clone({
      setHeaders: { Authorization: `Bearer ${token}` },
      withCredentials: true,
    });
  } else {
    authReq = req.clone({ withCredentials: true });
  }

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (
        error.status === 401 &&
        !isRefreshEndpoint &&
        !_isRefreshing
      ) {
        _isRefreshing = true;
        return authService.refreshTokens().pipe(
          switchMap((authData) => {
            _isRefreshing = false;
            // Retry the original request with the new token
            const retryReq = req.clone({
              setHeaders: { Authorization: `Bearer ${authData.accessToken}` },
              withCredentials: true,
            });
            return next(retryReq);
          }),
          catchError((refreshErr) => {
            _isRefreshing = false;
            authService.logout().subscribe();
            return throwError(() => refreshErr);
          })
        );
      }
      return throwError(() => error);
    })
  );
};
