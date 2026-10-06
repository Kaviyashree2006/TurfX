import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map, take, skipWhile } from 'rxjs';
import { AuthService } from '../services/auth.service';

/**
 * Prevents authenticated users from accessing guest-only pages (login, register).
 * Redirects to the role-appropriate dashboard if already logged in.
 */
export const guestGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.isLoading$.pipe(
    skipWhile((loading) => loading),
    take(1),
    map(() => {
      const user = authService.currentUser;
      if (!user) return true;

      // Redirect to the correct dashboard
      switch (user.role) {
        case 'admin': return router.createUrlTree(['/admin/dashboard']);
        case 'owner': return router.createUrlTree(['/owner/dashboard']);
        default:      return router.createUrlTree(['/dashboard']);
      }
    })
  );
};
