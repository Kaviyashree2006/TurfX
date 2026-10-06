import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';

import { HeaderComponent } from '../../../layout/header/header.component';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { User } from '../../../core/models/user.model';

@Component({
  selector: 'app-owner-profile',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule, HeaderComponent],
  template: `
    <div class="app-shell">
      <app-header />
      <main class="app-main">
        <div class="container" style="max-width:720px;">

          <!-- Back link -->
          <a routerLink="/owner/pending-approval" class="back-link">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
            Back to application status
          </a>

          <div class="page-header" style="margin-top:16px;">
            <h1 class="page-header__title">Owner Profile</h1>
            <p class="page-header__subtitle">
              @if (isRejected) {
                Update the details below to address the rejection reason, then resubmit for review.
              } @else {
                Your account information on file with TurfX.
              }
            </p>
          </div>

          <!-- Rejection reason banner -->
          @if (isRejected && user?.rejectionReason) {
            <div class="alert alert--error" style="margin-bottom:28px;">
              <svg class="alert__icon" width="18" height="18" viewBox="0 0 24 24" fill="none"
                   stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
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

          <!-- Read-only view (approved / pending — no edit needed) -->
          @if (!isRejected) {
            <div class="card">
              <div class="card__body">
                <div class="profile-grid">
                  <div class="profile-field">
                    <span class="profile-field__label">Full name</span>
                    <span class="profile-field__value">{{ user?.name }}</span>
                  </div>
                  <div class="profile-field">
                    <span class="profile-field__label">Email</span>
                    <span class="profile-field__value">{{ user?.email }}</span>
                  </div>
                  <div class="profile-field">
                    <span class="profile-field__label">Phone</span>
                    <span class="profile-field__value">{{ user?.phone || '—' }}</span>
                  </div>
                  <div class="profile-field">
                    <span class="profile-field__label">Account status</span>
                    <span class="profile-field__value">
                      <span class="badge badge--{{ statusBadge }}">{{ user?.approvalStatus }}</span>
                    </span>
                  </div>
                  <div class="profile-field profile-field--full">
                    <span class="profile-field__label">Business / venue name</span>
                    <span class="profile-field__value">{{ user?.businessName || '—' }}</span>
                  </div>
                  <div class="profile-field profile-field--full">
                    <span class="profile-field__label">Business address</span>
                    <span class="profile-field__value">{{ user?.businessAddress || '—' }}</span>
                  </div>
                </div>
              </div>

              @if (user?.approvalStatus === 'pending') {
                <div class="card__footer">
                  <div class="alert alert--info" style="margin:0;border:none;background:none;padding:0;">
                    <svg class="alert__icon" width="16" height="16" viewBox="0 0 24 24" fill="none"
                         stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <circle cx="12" cy="12" r="10"/>
                      <line x1="12" y1="8" x2="12" y2="12"/>
                      <line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                    <span style="color:#6b7280;font-size:0.875rem;">
                      Your application is under review. You can edit these details once your application
                      has been reviewed by an administrator.
                    </span>
                  </div>
                </div>
              }
            </div>
          }

          <!-- Editable resubmit form (rejected owners only) -->
          @if (isRejected) {
            @if (resubmitSuccess()) {
              <!-- Success state after resubmit -->
              <div class="card">
                <div class="card__body" style="text-align:center;padding:48px 24px;">
                  <div style="width:64px;height:64px;background:#f0fdf4;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 20px;">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#16a34a"
                         stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                      <polyline points="22 4 12 14.01 9 11.01"/>
                    </svg>
                  </div>
                  <h2 style="font-size:1.25rem;font-weight:700;color:#111827;margin-bottom:8px;">
                    Application resubmitted!
                  </h2>
                  <p style="color:#6b7280;margin-bottom:28px;line-height:1.6;">
                    Your updated application is now pending review. We'll notify you once it's been assessed.
                  </p>
                  <a routerLink="/owner/pending-approval" class="btn btn--primary">
                    View application status
                  </a>
                </div>
              </div>
            } @else {
              <!-- Edit form -->
              @if (serverError()) {
                <div class="alert alert--error" style="margin-bottom:20px;" role="alert">
                  <svg class="alert__icon" width="18" height="18" viewBox="0 0 24 24" fill="none"
                       stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="15" y1="9" x2="9" y2="15"/>
                    <line x1="9" y1="9" x2="15" y2="15"/>
                  </svg>
                  {{ serverError() }}
                </div>
              }

              <form [formGroup]="form" (ngSubmit)="onSubmit()" novalidate>
                <div class="card" style="margin-bottom:20px;">
                  <div class="card__header">
                    <h2 style="font-size:0.9375rem;font-weight:700;color:#111827;">Personal details</h2>
                  </div>
                  <div class="card__body">
                    <div class="form-stack">
                      <div class="form-row">
                        <div class="form-group">
                          <label for="name" class="form-label">
                            Full name <span class="required">*</span>
                          </label>
                          <input
                            id="name"
                            type="text"
                            class="form-control"
                            [class.is-invalid]="isInvalid('name')"
                            formControlName="name"
                            placeholder="Your full name"
                            autocomplete="name"
                          />
                          @if (isInvalid('name')) {
                            <span class="form-error" role="alert">{{ getError('name') }}</span>
                          }
                        </div>
                        <div class="form-group">
                          <label for="phone" class="form-label">
                            Phone
                            <span style="color:#9ca3af;font-weight:400;">(optional)</span>
                          </label>
                          <input
                            id="phone"
                            type="tel"
                            class="form-control"
                            [class.is-invalid]="isInvalid('phone')"
                            formControlName="phone"
                            placeholder="+91 98765 43210"
                            autocomplete="tel"
                          />
                          @if (isInvalid('phone')) {
                            <span class="form-error" role="alert">{{ getError('phone') }}</span>
                          }
                        </div>
                      </div>

                      <!-- Email is read-only — cannot be changed here -->
                      <div class="form-group">
                        <label class="form-label">Email address</label>
                        <input
                          type="email"
                          class="form-control"
                          [value]="user?.email"
                          disabled
                          aria-describedby="email-hint"
                        />
                        <span id="email-hint" class="form-hint">
                          Email cannot be changed. Contact support if needed.
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div class="card" style="margin-bottom:28px;">
                  <div class="card__header">
                    <h2 style="font-size:0.9375rem;font-weight:700;color:#111827;">Business details</h2>
                  </div>
                  <div class="card__body">
                    <div class="form-stack">
                      <div class="form-group">
                        <label for="businessName" class="form-label">
                          Business / venue name <span class="required">*</span>
                        </label>
                        <input
                          id="businessName"
                          type="text"
                          class="form-control"
                          [class.is-invalid]="isInvalid('businessName')"
                          formControlName="businessName"
                          placeholder="e.g. Champions Box Cricket Arena"
                        />
                        @if (isInvalid('businessName')) {
                          <span class="form-error" role="alert">{{ getError('businessName') }}</span>
                        }
                      </div>
                      <div class="form-group">
                        <label for="businessAddress" class="form-label">
                          Business address <span class="required">*</span>
                        </label>
                        <textarea
                          id="businessAddress"
                          class="form-control"
                          [class.is-invalid]="isInvalid('businessAddress')"
                          formControlName="businessAddress"
                          placeholder="Full address of your venue"
                          rows="3"
                          style="resize:vertical;"
                        ></textarea>
                        @if (isInvalid('businessAddress')) {
                          <span class="form-error" role="alert">{{ getError('businessAddress') }}</span>
                        }
                      </div>
                    </div>
                  </div>
                </div>

                <div style="display:flex;gap:12px;flex-wrap:wrap;">
                  <button
                    type="submit"
                    class="btn btn--primary btn--lg"
                    [class.loading]="loading()"
                    [disabled]="loading()"
                  >
                    @if (!loading()) {
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                           stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="9 11 12 14 22 4"/>
                        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
                      </svg>
                      Resubmit application
                    } @else {
                      Submitting…
                    }
                  </button>
                  <a routerLink="/owner/pending-approval" class="btn btn--ghost btn--lg">Cancel</a>
                </div>
              </form>
            }
          }

        </div>
      </main>
    </div>
  `,
  styles: [`
    .back-link {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 0.875rem;
      font-weight: 500;
      color: #6b7280;
      text-decoration: none;
      transition: color 150ms ease;
      &:hover { color: #111827; }
    }
    .profile-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px 32px;
      @media (max-width: 560px) { grid-template-columns: 1fr; }
    }
    .profile-field__label {
      display: block;
      font-size: 0.75rem;
      font-weight: 600;
      color: #9ca3af;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      margin-bottom: 4px;
    }
    .profile-field__value {
      font-size: 0.9375rem;
      color: #111827;
      font-weight: 500;
    }
    .profile-field--full { grid-column: 1 / -1; }
  `],
})
export class OwnerProfileComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly toastService = inject(ToastService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  readonly loading = signal(false);
  readonly serverError = signal('');
  readonly resubmitSuccess = signal(false);

  readonly form = this.fb.group({
    name:            ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
    phone:           ['', [Validators.pattern(/^\+?[0-9]{7,15}$/)]],
    businessName:    ['', [Validators.required, Validators.minLength(2), Validators.maxLength(200)]],
    businessAddress: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(500)]],
  });

  get user(): User | null {
    return this.authService.currentUser;
  }

  get isRejected(): boolean {
    return this.user?.approvalStatus === 'rejected';
  }

  get statusBadge(): string {
    switch (this.user?.approvalStatus) {
      case 'approved': return 'success';
      case 'rejected': return 'error';
      default:         return 'pending';
    }
  }

  ngOnInit(): void {
    // Pre-populate the form with current values
    const u = this.user;
    if (u) {
      this.form.patchValue({
        name:            u.name,
        phone:           u.phone ?? '',
        businessName:    u.businessName ?? '',
        businessAddress: u.businessAddress ?? '',
      });
    }
  }

  isInvalid(field: string): boolean {
    const ctrl = this.form.get(field);
    return !!(ctrl?.invalid && ctrl.touched);
  }

  getError(field: string): string {
    const ctrl = this.form.get(field);
    if (!ctrl?.errors) return '';
    if (ctrl.errors['required'])   return 'This field is required.';
    if (ctrl.errors['minlength'])  return `Must be at least ${ctrl.errors['minlength'].requiredLength} characters.`;
    if (ctrl.errors['maxlength'])  return `Must be ${ctrl.errors['maxlength'].requiredLength} characters or fewer.`;
    if (ctrl.errors['pattern'])    return 'Please enter a valid phone number.';
    return 'Invalid value.';
  }

  onSubmit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;

    this.loading.set(true);
    this.serverError.set('');

    const v = this.form.value;
    this.authService.resubmitOwner({
      name:            v.name!,
      phone:           v.phone || undefined,
      businessName:    v.businessName!,
      businessAddress: v.businessAddress!,
    }).subscribe({
      next: () => {
        this.loading.set(false);
        this.resubmitSuccess.set(true);
        this.toastService.success('Application resubmitted', 'Your updated profile is now under review.');
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        this.serverError.set(err.error?.message ?? 'Resubmission failed. Please try again.');
      },
    });
  }
}
