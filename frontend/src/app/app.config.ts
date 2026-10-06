import { ApplicationConfig, APP_INITIALIZER } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideHttpClient, withInterceptors, withFetch } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { firstValueFrom } from 'rxjs';

import { routes } from './app.routes';
import { jwtInterceptor } from './core/interceptors/jwt.interceptor';
import { errorInterceptor } from './core/interceptors/error.interceptor';
import { AuthService } from './core/services/auth.service';

/**
 * Session recovery on page load (Doc 08, decision #18).
 * Calls /api/auth/refresh silently — the httpOnly cookie is sent automatically.
 *
 * Returns a Promise (via firstValueFrom) rather than an Observable directly.
 * This is the safest pattern for APP_INITIALIZER in Angular 17+ standalone:
 * Angular awaits the Promise before activating the router, guaranteeing that
 * isAuthenticated is correct before any canActivate guard runs.
 */
function initializeApp(authService: AuthService): () => Promise<boolean> {
  return () => firstValueFrom(authService.initializeSession(), { defaultValue: false });
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(
      withInterceptors([jwtInterceptor, errorInterceptor]),
      withFetch()
    ),
    provideAnimations(),
    {
      provide: APP_INITIALIZER,
      useFactory: initializeApp,
      deps: [AuthService],
      multi: true,
    },
  ],
};
