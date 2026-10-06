import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map, take, skipWhile } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { UserRole } from '../models/user.model';

/**
 * Factory guard — checks req.user.role is in the allowed list.
 * Usage: roleGuard(['owner', 'admin'])
 */
export const roleGuard = (allowedRoles: UserRole[]): CanActivateFn => {
  return () => {
    const authService = inject(AuthService);
    const router = inject(Router);

    return authService.isLoading$.pipe(
      skipWhile((loading) => loading),
      take(1),
      map(() => {
        const user = authService.currentUser;
        if (!user) return router.createUrlTree(['/login']);
        if (allowedRoles.includes(user.role)) return true;
        return router.createUrlTree(['/unauthorized']);
      })
    );
  };
};
