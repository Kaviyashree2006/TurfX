import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';

import { ToastService } from '../services/toast.service';

/**
 * Centralizes API error → toast messaging (Doc 04).
 * Specific errors (form validation, auth) are handled by their components.
 * This interceptor handles unexpected 500s and network failures.
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const toastService = inject(ToastService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      // Network failure (no response)
      if (error.status === 0) {
        toastService.error(
          'Connection error',
          'Could not reach the server. Check your network connection.'
        );
      }

      // Server errors — show generic toast, let component handle 4xx
      if (error.status >= 500) {
        toastService.error(
          'Something went wrong',
          'An unexpected error occurred. Please try again.'
        );
      }

      // Re-throw so component-level error handling still works
      return throwError(() => error);
    })
  );
};
