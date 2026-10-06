import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map, take, skipWhile } from 'rxjs';
import { AuthService } from '../services/auth.service';

/**
 * Redirects to /login if not authenticated.
 * Waits for the initial session-recovery (APP_INITIALIZER) to complete before deciding.
 */
export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.isLoading$.pipe(
    skipWhile((loading) => loading),
    take(1),
    map(() => {
      if (authService.isAuthenticated) return true;
      return router.createUrlTree(['/login']);
    })
  );
};
