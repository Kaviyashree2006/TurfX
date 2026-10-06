import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Location } from '@angular/common';

@Component({
  selector: 'app-unauthorized',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="error-page">
      <div class="error-page__content">
        <div class="error-page__code">403</div>
        <h1 class="error-page__title">Access denied</h1>
        <p class="error-page__desc">You don't have permission to view this page.</p>
        <div class="error-page__actions">
          <button (click)="goBack()" class="btn btn--ghost">Go back</button>
          <a routerLink="/" class="btn btn--primary">Back to home</a>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .error-page {
      min-height: 100vh; display: flex; align-items: center;
      justify-content: center; background: #f9fafb; padding: 24px;
    }
    .error-page__content { text-align: center; }
    .error-page__code { font-size: 8rem; font-weight: 800; color: #e5e7eb; letter-spacing: -0.05em; line-height: 1; margin-bottom: 16px; }
    .error-page__title { font-size: 1.875rem; font-weight: 800; color: #111827; letter-spacing: -0.02em; margin-bottom: 12px; }
    .error-page__desc { color: #6b7280; margin-bottom: 32px; font-size: 1.0625rem; }
    .error-page__actions { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }
  `],
})
export class UnauthorizedComponent {
  constructor(private location: Location) {}
  goBack(): void { this.location.back(); }
}
