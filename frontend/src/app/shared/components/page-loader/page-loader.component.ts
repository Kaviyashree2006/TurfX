import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';

/**
 * Full-screen loading overlay shown while the app initializes
 * (session recovery from refresh-token cookie).
 */
@Component({
  selector: 'app-page-loader',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page-init-loader" role="status" aria-label="Loading application">
      <div class="page-init-loader__content">
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="48" height="48" rx="12" fill="#16a34a"/>
          <path d="M14 34L24 14L34 34" stroke="white" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M17.5 27.5H30.5" stroke="white" stroke-width="3.5" stroke-linecap="round"/>
        </svg>
        <span class="page-init-loader__brand">TurfX</span>
        <div class="spinner spinner--sm" style="border-top-color:#16a34a; border-color:#e5e7eb; border-top-color:#16a34a;"></div>
      </div>
    </div>
  `,
  styles: [`
    .page-init-loader {
      position: fixed;
      inset: 0;
      background: white;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
    }
    .page-init-loader__content {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
    }
    .page-init-loader__brand {
      font-family: 'Plus Jakarta Sans', sans-serif;
      font-size: 1.75rem;
      font-weight: 800;
      color: #111827;
      letter-spacing: -0.03em;
    }
  `],
})
export class PageLoaderComponent {}
