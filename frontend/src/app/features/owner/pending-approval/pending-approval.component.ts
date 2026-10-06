import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { HeaderComponent } from '../../../layout/header/header.component';
import { AuthService } from '../../../core/services/auth.service';
import { User } from '../../../core/models/user.model';

@Component({
  selector: 'app-pending-approval',
  standalone: true,
  imports: [CommonModule, RouterLink, HeaderComponent],
  template: `
    <div class="app-shell">
      <app-header />
      <main class="app-main">
        <div class="container" style="max-width:680px;">

          @if (checking()) {
            <!-- Loading live status from server -->
            <div style="display:flex;align-items:center;justify-content:center;padding:80px 0;">
              <div class="spinner"></div>
            </div>
          } @else if (user?.approvalStatus === 'rejected') {
            <!-- ── Rejected state ─────────────────────────────────────────── -->
            <div style="text-align:center;padding:48px 0 32px;">
              <div style="width:72px;height:72px;background:#fef2f2;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 24px;">
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="15" y1="9" x2="9" y2="15"/>
                  <line x1="9" y1="9" x2="15" y2="15"/>
                </svg>
              </div>
              <h1 style="font-size:1.75rem;font-weight:800;color:#111827;letter-spacing:-0.02em;margin-bottom:8px;">
                Application not approved
              </h1>
              <p style="color:#6b7280;font-size:1rem;line-height:1.6;">
                Your turf owner application was reviewed and could not be approved at this time.
              </p>
            </div>

            @if (user?.rejectionReason) {
              <div class="alert alert--error" style="margin-bottom:24px;">
                <svg class="alert__icon" width="18" height="18" viewBox="0 0 24 24" fill="none"
                     stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                <div>
                  <strong>Reason for rejection:</strong><br>
                  {{ user?.rejectionReason }}
                </div>
              </div>
            }

            <div class="card">
              <div class="card__header">
                <h2 style="font-size:1rem;font-weight:700;color:#111827;">What happens next?</h2>
              </div>
              <div class="card__body">
                <p style="color:#6b7280;font-size:0.9375rem;line-height:1.7;margin-bottom:20px;">
                  Update your profile to address the rejection reason above, then resubmit for admin review.
                </p>
                <div style="display:flex;gap:12px;flex-wrap:wrap;">
                  <a routerLink="/owner/profile" class="btn btn--primary">
                    Edit profile &amp; resubmit
                  </a>
                  <button class="btn btn--ghost" (click)="checkStatus()" [disabled]="checking()">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                         stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <polyline points="23 4 23 10 17 10"/>
                      <path d="M20.49 15a9 9 0 1 1-.18-4.48"/>
                    </svg>
                    Refresh status
                  </button>
                </div>
              </div>
            </div>

          } @else {
            <!-- ── Pending state ──────────────────────────────────────────── -->
            <div style="text-align:center;padding:48px 0 32px;">
              <div style="width:72px;height:72px;background:#fffbeb;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 24px;">
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#d97706"
                     stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12 6 12 12 16 14"/>
                </svg>
              </div>
              <h1 style="font-size:1.75rem;font-weight:800;color:#111827;letter-spacing:-0.02em;margin-bottom:8px;">
                Application under review
              </h1>
              <p style="color:#6b7280;font-size:1rem;line-height:1.6;max-width:480px;margin:0 auto;">
                Your turf owner account has been submitted and is being reviewed by our admin team.
                This usually takes 1–2 business days.
              </p>
            </div>

            <!-- Progress tracker -->
            <div class="card" style="margin-bottom:24px;">
              <div class="card__body">
                <div style="display:flex;flex-direction:column;gap:20px;">
                  <div style="display:flex;gap:16px;align-items:flex-start;">
                    <div style="width:32px;height:32px;background:#f0fdf4;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16a34a"
                           stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
                      </svg>
                    </div>
                    <div>
                      <div style="font-weight:600;color:#111827;font-size:0.9375rem;">Application submitted</div>
                      <div style="color:#6b7280;font-size:0.875rem;margin-top:2px;">Your business details have been received.</div>
                    </div>
                  </div>
                  <div style="display:flex;gap:16px;align-items:flex-start;">
                    <div style="width:32px;height:32px;background:#fffbeb;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#d97706"
                           stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                      </svg>
                    </div>
                    <div>
                      <div style="font-weight:600;color:#111827;font-size:0.9375rem;">
                        Admin review
                        <span class="badge badge--pending" style="margin-left:8px;">In progress</span>
                      </div>
                      <div style="color:#6b7280;font-size:0.875rem;margin-top:2px;">Our team is verifying your business details.</div>
                    </div>
                  </div>
                  <div style="display:flex;gap:16px;align-items:flex-start;opacity:0.4;">
                    <div style="width:32px;height:32px;background:#f3f4f6;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af"
                           stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
                      </svg>
                    </div>
                    <div>
                      <div style="font-weight:600;color:#9ca3af;font-size:0.9375rem;">Account activated</div>
                      <div style="color:#9ca3af;font-size:0.875rem;margin-top:2px;">
                        You'll be notified when approved and can start listing turfs.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:20px;">
              <button class="btn btn--ghost" (click)="checkStatus()" [disabled]="checking()">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                     stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="23 4 23 10 17 10"/>
                  <path d="M20.49 15a9 9 0 1 1-.18-4.48"/>
                </svg>
                Check status
              </button>
            </div>

            <div class="alert alert--info">
              <svg class="alert__icon" width="18" height="18" viewBox="0 0 24 24" fill="none"
                   stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <span>You'll receive an email notification when your account has been reviewed.</span>
            </div>
          }

        </div>
      </main>
    </div>
  `,
})
export class PendingApprovalComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly checking = signal(true);

  get user(): User | null {
    return this.authService.currentUser;
  }

  ngOnInit(): void {
    this.checkStatus();
  }

  checkStatus(): void {
    this.checking.set(true);
    this.authService.getMe().subscribe({
      next: (user) => {
        this.checking.set(false);
        // If approved while waiting on this page, redirect to dashboard
        if (user.approvalStatus === 'approved') {
          this.router.navigate(['/owner/dashboard']);
        }
      },
      error: () => {
        // On error just show whatever is cached — don't crash the page
        this.checking.set(false);
      },
    });
  }
}
