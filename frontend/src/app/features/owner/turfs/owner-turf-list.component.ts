import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { HeaderComponent } from '../../../layout/header/header.component';
import { TurfService } from '../../../core/services/turf.service';
import { ToastService } from '../../../core/services/toast.service';
import { Turf, SPORT_TYPE_LABELS } from '../../../core/models/turf.model';

@Component({
  selector: 'app-owner-turf-list',
  standalone: true,
  imports: [CommonModule, RouterLink, HeaderComponent],
  template: `
    <div class="app-shell">
      <app-header />
      <main class="app-main">
        <div class="container">

          <div class="page-header" style="display:flex;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;gap:16px;">
            <div>
              <h1 class="page-header__title">My Turfs</h1>
              <p class="page-header__subtitle">Manage your turf listings.</p>
            </div>
            <a routerLink="/owner/turfs/new" class="btn btn--primary">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Add turf
            </a>
          </div>

          <!-- Loading -->
          @if (loading()) {
            <div style="display:flex;flex-direction:column;gap:16px;">
              @for (i of [1,2,3]; track i) {
                <div class="turf-row-skeleton">
                  <div class="skeleton" style="width:72px;height:72px;border-radius:10px;flex-shrink:0;"></div>
                  <div style="flex:1;display:flex;flex-direction:column;gap:8px;">
                    <div class="skeleton skeleton--title"></div>
                    <div class="skeleton skeleton--text" style="width:40%;"></div>
                  </div>
                </div>
              }
            </div>
          }

          <!-- Error -->
          @if (!loading() && loadError()) {
            <div class="alert alert--error" role="alert">
              <svg class="alert__icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              Failed to load turfs.
              <button class="btn btn--link" style="font-size:inherit;" (click)="load()">Try again</button>
            </div>
          }

          <!-- Empty -->
          @if (!loading() && !loadError() && turfs().length === 0) {
            <div class="empty-state">
              <svg class="empty-state__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
              <div class="empty-state__title">No turfs yet</div>
              <p class="empty-state__description">Create your first turf listing to start accepting bookings.</p>
              <a routerLink="/owner/turfs/new" class="btn btn--primary" style="margin-top:8px;">Add your first turf</a>
            </div>
          }

          <!-- Turf list -->
          @if (!loading() && !loadError() && turfs().length > 0) {
            <div class="turf-list">
              @for (turf of turfs(); track turf.id) {
                <div class="turf-list-item" [class.turf-list-item--inactive]="!turf.isActive">

                  <!-- Thumbnail -->
                  <div class="turf-list-item__thumb">
                    @if (turf.images.length > 0) {
                      <img [src]="turf.images[0]" [alt]="turf.name" loading="lazy"/>
                    } @else {
                      <div class="turf-list-item__thumb-placeholder">
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
                      </div>
                    }
                  </div>

                  <!-- Info -->
                  <div class="turf-list-item__info">
                    <div class="turf-list-item__name">{{ turf.name }}</div>
                    <div class="turf-list-item__meta">
                      {{ sportLabels(turf.sportTypes) }}
                      @if (turf.address.city) { · {{ turf.address.city }} }
                    </div>
                    <div style="display:flex;align-items:center;gap:8px;margin-top:6px;flex-wrap:wrap;">
                      <span class="badge badge--{{ statusBadgeClass(turf.status) }}">{{ turf.status }}</span>
                      @if (!turf.isActive) {
                        <span class="badge badge--neutral">Disabled</span>
                      }
                    </div>
                  </div>

                  <!-- Pricing -->
                  <div class="turf-list-item__price">
                    <span style="font-size:1rem;font-weight:700;color:#111827;">₹{{ turf.pricing.base }}</span>
                    <span style="font-size:0.75rem;color:#9ca3af;">/hr</span>
                  </div>

                  <!-- Actions -->
                  <div class="turf-list-item__actions">
                    @if (turf.status === 'pending' || turf.status === 'rejected') {
                      <a [routerLink]="['/owner/turfs', turf.id, 'pending-review']" class="btn btn--ghost btn--sm">Status</a>
                    }
                    <a [routerLink]="['/owner/turfs', turf.id, 'reviews']" class="btn btn--ghost btn--sm">Reviews</a>
                    <a [routerLink]="['/owner/turfs', turf.id, 'edit']" class="btn btn--ghost btn--sm">Edit</a>
                    <button
                      class="btn btn--sm"
                      [class]="turf.isActive ? 'btn--ghost' : 'btn--secondary'"
                      [class.loading]="togglingId() === turf.id"
                      [disabled]="!!togglingId() || !!deletingId()"
                      (click)="toggleActive(turf)"
                    >
                      {{ turf.isActive ? 'Disable' : 'Enable' }}
                    </button>
                    <button
                      class="btn btn--danger btn--sm"
                      [class.loading]="deletingId() === turf.id"
                      [disabled]="!!deletingId() || !!togglingId()"
                      (click)="deleteTurf(turf)"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              }
            </div>
          }

        </div>
      </main>
    </div>
  `,
  styles: [`
    .turf-list { display: flex; flex-direction: column; gap: 12px; }

    .turf-list-item {
      display: flex;
      align-items: center;
      gap: 16px;
      background: white;
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      padding: 16px;
      box-shadow: 0 1px 2px rgb(0 0 0/.04);
      transition: box-shadow 200ms ease;
      &:hover { box-shadow: 0 4px 8px rgb(0 0 0/.07); }
      &--inactive { opacity: 0.6; }
    }

    .turf-list-item__thumb {
      width: 72px; height: 72px;
      border-radius: 10px; overflow: hidden;
      flex-shrink: 0;
      background: #f3f4f6;
      img { width:100%; height:100%; object-fit:cover; display:block; }
    }

    .turf-list-item__thumb-placeholder {
      width: 100%; height: 100%;
      display: flex; align-items: center; justify-content: center;
    }

    .turf-list-item__info { flex: 1; min-width: 0; }
    .turf-list-item__name { font-weight: 700; color: #111827; font-size: 0.9375rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .turf-list-item__meta { font-size: 0.8125rem; color: #6b7280; margin-top: 2px; }

    .turf-list-item__price { text-align: right; flex-shrink: 0; }

    .turf-list-item__actions {
      display: flex; gap: 8px; flex-shrink: 0;
      @media (max-width: 640px) { flex-wrap: wrap; }
    }

    .turf-row-skeleton {
      display: flex; align-items: center; gap: 16px;
      background: white; border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px;
    }
  `],
})
export class OwnerTurfListComponent implements OnInit {
  private readonly turfService = inject(TurfService);
  private readonly toastService = inject(ToastService);

  readonly turfs = signal<Turf[]>([]);
  readonly loading = signal(true);
  readonly loadError = signal(false);
  readonly togglingId = signal<string | null>(null);
  readonly deletingId  = signal<string | null>(null);

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.loadError.set(false);
    this.turfService.getOwnerTurfs().subscribe({
      next: (data) => { this.turfs.set(data.turfs); this.loading.set(false); },
      error: () => { this.loadError.set(true); this.loading.set(false); },
    });
  }

  sportLabels(types: string[]): string {
    return types.map(t => SPORT_TYPE_LABELS[t as keyof typeof SPORT_TYPE_LABELS] ?? t).join(', ');
  }

  statusBadgeClass(status: string): string {
    return status === 'approved' ? 'success' : status === 'rejected' ? 'error' : 'pending';
  }

  toggleActive(turf: Turf): void {
    this.togglingId.set(turf.id);
    this.turfService.toggleActive(turf.id).subscribe({
      next: (updated) => {
        this.turfs.update(list => list.map(t => t.id === updated.id ? updated : t));
        this.togglingId.set(null);
        this.toastService.success(updated.isActive ? 'Turf enabled' : 'Turf disabled');
      },
      error: (err) => {
        this.togglingId.set(null);
        this.toastService.error('Failed to update turf', err.error?.message);
      },
    });
  }

  deleteTurf(turf: Turf): void {
    if (!confirm(`Delete "${turf.name}"? This cannot be undone and will also remove all associated images.`)) return;
    this.deletingId.set(turf.id);
    this.turfService.deleteTurf(turf.id).subscribe({
      next: () => {
        this.deletingId.set(null);
        this.turfs.update(list => list.filter(t => t.id !== turf.id));
        this.toastService.success('Turf deleted');
      },
      error: (err: HttpErrorResponse) => {
        this.deletingId.set(null);
        this.toastService.error('Delete failed', err.error?.message ?? 'Please try again.');
      },
    });
  }
}
