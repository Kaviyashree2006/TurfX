import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { HeaderComponent } from '../../../layout/header/header.component';
import { TurfService } from '../../../core/services/turf.service';
import { Turf } from '../../../core/models/turf.model';

@Component({
  selector: 'app-owner-turf-pending-review',
  standalone: true,
  imports: [CommonModule, RouterLink, HeaderComponent],
  template: `
    <div class="app-shell">
      <app-header />
      <main class="app-main">
        <div class="container" style="max-width:680px;">

          <a routerLink="/owner/turfs" style="display:inline-flex;align-items:center;gap:6px;font-size:0.875rem;font-weight:500;color:#6b7280;text-decoration:none;margin-bottom:20px;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
            My Turfs
          </a>

          @if (loading()) {
            <div style="display:flex;justify-content:center;padding:64px;"><div class="spinner"></div></div>
          }

          @if (!loading() && turf()) {
            @if (turf()!.status === 'rejected') {
              <!-- Rejected -->
              <div style="text-align:center;padding:40px 0 28px;">
                <div style="width:72px;height:72px;background:#fef2f2;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 20px;">
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                </div>
                <h1 style="font-size:1.5rem;font-weight:800;color:#111827;margin-bottom:8px;">Listing not approved</h1>
                <p style="color:#6b7280;">"{{ turf()!.name }}" could not be approved at this time.</p>
              </div>

              @if (turf()!.rejectionReason) {
                <div class="alert alert--error" style="margin-bottom:24px;">
                  <svg class="alert__icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  <div><strong>Reason:</strong><br>{{ turf()!.rejectionReason }}</div>
                </div>
              }

              <div class="card">
                <div class="card__body">
                  <p style="color:#6b7280;margin-bottom:16px;line-height:1.6;">
                    Update your listing to address the feedback above and resubmit for admin review.
                  </p>
                  <a [routerLink]="['/owner/turfs', turf()!.id, 'edit']" class="btn btn--primary">Edit and resubmit</a>
                </div>
              </div>

            } @else {
              <!-- Pending -->
              <div style="text-align:center;padding:40px 0 28px;">
                <div style="width:72px;height:72px;background:#fffbeb;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 20px;">
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#d97706" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                </div>
                <h1 style="font-size:1.5rem;font-weight:800;color:#111827;margin-bottom:8px;">Listing under review</h1>
                <p style="color:#6b7280;max-width:460px;margin:0 auto;line-height:1.6;">
                  <strong>"{{ turf()!.name }}"</strong> has been submitted and is being reviewed by our admin team. This usually takes 1–2 business days.
                </p>
              </div>

              <div class="card" style="margin-bottom:20px;">
                <div class="card__body">
                  <div style="display:flex;flex-direction:column;gap:16px;">
                    <div style="display:flex;gap:14px;align-items:flex-start;">
                      <div style="width:30px;height:30px;background:#f0fdf4;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                      </div>
                      <div>
                        <div style="font-weight:600;color:#111827;font-size:0.9375rem;">Listing submitted</div>
                        <div style="color:#6b7280;font-size:0.875rem;margin-top:2px;">Your turf details have been received.</div>
                      </div>
                    </div>
                    <div style="display:flex;gap:14px;align-items:flex-start;">
                      <div style="width:30px;height:30px;background:#fffbeb;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d97706" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                      </div>
                      <div>
                        <div style="font-weight:600;color:#111827;font-size:0.9375rem;">Admin review <span class="badge badge--pending" style="margin-left:8px;">In progress</span></div>
                        <div style="color:#6b7280;font-size:0.875rem;margin-top:2px;">Our team is verifying your turf details.</div>
                      </div>
                    </div>
                    <div style="display:flex;gap:14px;align-items:flex-start;opacity:0.4;">
                      <div style="width:30px;height:30px;background:#f3f4f6;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                      </div>
                      <div>
                        <div style="font-weight:600;color:#9ca3af;font-size:0.9375rem;">Listing published</div>
                        <div style="color:#9ca3af;font-size:0.875rem;margin-top:2px;">Your turf will be visible publicly once approved.</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div class="alert alert--info">
                <svg class="alert__icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                <span>You can still edit minor details (photos, amenities, description) while your listing is under review.</span>
              </div>
            }
          }

        </div>
      </main>
    </div>
  `,
})
export class OwnerTurfPendingReviewComponent implements OnInit {
  private readonly turfService = inject(TurfService);
  private readonly route = inject(ActivatedRoute);

  readonly loading = signal(true);
  readonly turf = signal<Turf | null>(null);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.turfService.getOwnerTurfById(id).subscribe({
      next: (t) => { this.turf.set(t); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }
}
