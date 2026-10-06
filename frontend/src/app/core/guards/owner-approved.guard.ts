import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map, take, skipWhile, switchMap, catchError, of } from 'rxjs';
import { AuthService } from '../services/auth.service';

/**
 * Redirects to /owner/pending-approval if the owner's approvalStatus !== 'approved'.
 * Calls GET /api/auth/me to read the LIVE approval status — never trusts the JWT
 * (locked decision #11). Must run after authGuard + roleGuard(['owner']).
 */
export const ownerApprovedGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.isLoading$.pipe(
    skipWhile((loading) => loading),
    take(1),
    switchMap(() => {
      // Re-fetch live status from server
      return authService.getMe().pipe(
        map((user) => {
          if (user.approvalStatus === 'approved') return true;
          return router.createUrlTree(['/owner/pending-approval']);
        }),
        catchError(() => of(router.createUrlTree(['/owner/pending-approval'])))
      );
    })
  );
};
