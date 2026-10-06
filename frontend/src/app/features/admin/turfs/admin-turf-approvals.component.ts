import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';

import { HeaderComponent } from '../../../layout/header/header.component';
import { TurfService } from '../../../core/services/turf.service';
import { ToastService } from '../../../core/services/toast.service';
import { Turf, SPORT_TYPE_LABELS } from '../../../core/models/turf.model';

type FilterStatus = 'all' | 'pending' | 'approved' | 'rejected';

@Component({
  selector: 'app-admin-turf-approvals',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule, FormsModule, HeaderComponent],
  template: `
    <div class="app-shell">
      <app-header />
      <main class="app-main">
        <div class="container">

          <!-- Page header -->
          <div class="page-header" style="display:flex;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;gap:16px;margin-bottom:32px;">
            <div>
              <h1 class="page-header__title">Turf Listings</h1>
              <p class="page-header__subtitle">Review and approve turf listings submitted by venue owners.</p>
            </div>
            <div class="badge badge--{{ pendingCount() > 0 ? 'warning' : 'neutral' }}" style="font-size:0.875rem;padding:6px 14px;">
              {{ pendingCount() }} pending review
            </div>
          </div>

          <!-- Filters -->
          <div class="approvals-filters">
            <div class="input-wrapper" style="flex:1;min-width:220px;max-width:380px;">
              <span class="input-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              </span>
              <input type="search" class="form-control has-icon-left" placeholder="Search by name or city…"
                [(ngModel)]="searchQuery" aria-label="Search turfs"/>
            </div>
            <div class="approvals-filters__tabs" role="tablist">
              @for (tab of filterTabs; track tab.value) {
                <button class="filter-tab" [class.active]="activeFilter() === tab.value"
                  (click)="setFilter(tab.value)" role="tab" [attr.aria-selected]="activeFilter() === tab.value">
                  {{ tab.label }}
                  @if (tab.value === 'pending' && pendingCount() > 0) {
                    <span class="filter-tab__count">{{ pendingCount() }}</span>
                  }
                </button>
              }
            </div>
          </div>

          <!-- Loading -->
          @if (loading()) {
            <div class="owners-table-wrap">
              @for (i of [1,2,3,4]; track i) {
                <div class="owner-row-skeleton">
                  <div class="skeleton" style="height:18px;width:40%;border-radius:6px;"></div>
                  <div class="skeleton" style="height:14px;width:25%;border-radius:6px;"></div>
                  <div class="skeleton" style="height:24px;width:80px;border-radius:20px;"></div>
                </div>
              }
            </div>
          }

          <!-- Error -->
          @if (!loading() && loadError()) {
            <div class="alert alert--error" role="alert">
              <svg class="alert__icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              Failed to load listings.
              <button class="btn btn--link" style="font-size:inherit;" (click)="load()">Try again</button>
            </div>
          }

          <!-- Empty -->
          @if (!loading() && !loadError() && filteredTurfs().length === 0) {
            <div class="empty-state">
              <svg class="empty-state__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
              <div class="empty-state__title">No listings found</div>
              <p class="empty-state__description">
                @if (searchQuery.trim()) { No turfs match your search. }
                @else if (activeFilter() === 'pending') { No turf listings are pending review. }
                @else { No turf listings found for this filter. }
              </p>
            </div>
          }

          <!-- Table -->
          @if (!loading() && !loadError() && filteredTurfs().length > 0) {
            <div class="owners-table-wrap">
              <table class="owners-table" aria-label="Turf listings">
                <thead>
                  <tr>
                    <th>Turf</th>
                    <th>Owner</th>
                    <th>Sports</th>
                    <th>Price</th>
                    <th>Status</th>
                    <th>Submitted</th>
                    <th class="th-actions">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  @for (turf of filteredTurfs(); track turf.id) {
                    <tr class="owner-row" [class.owner-row--pending]="turf.status === 'pending'">
                      <td>
                        <div class="turf-cell">
                          @if (turf.images?.length) {
                            <img [src]="turf.images[0]" class="turf-cell__thumb" [alt]="turf.name" loading="lazy"/>
                          } @else {
                            <div class="turf-cell__thumb turf-cell__thumb--placeholder">
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
                            </div>
                          }
                          <div>
                            <div class="owner-cell__name">{{ turf.name }}</div>
                            <div class="owner-cell__email">{{ turf.address?.city || '—' }}{{ turf.address?.state ? ', ' + turf.address.state : '' }}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div class="owner-cell__name">{{ turf.owner?.name || '—' }}</div>
                        <div class="owner-cell__email">{{ turf.owner?.email || '' }}</div>
                      </td>
                      <td style="font-size:0.8125rem;color:#6b7280;">{{ sportLabels(turf.sportTypes) }}</td>
                      <td style="font-weight:600;color:#111827;white-space:nowrap;">₹{{ turf.pricing?.base }}/hr</td>
                      <td>
                        <div style="display:flex;flex-direction:column;gap:4px;">
                          <span class="badge badge--{{ statusBadge(turf.status) }}">{{ turf.status }}</span>
                          @if (!turf.isActive) { <span class="badge badge--neutral">Disabled</span> }
                        </div>
                      </td>
                      <td class="td-date">{{ formatDate(turf.createdAt) }}</td>
                      <td class="td-actions">
                        <div class="row-actions">
                          <button class="btn btn--ghost btn--sm" (click)="openDetail(turf)" [attr.aria-label]="'View ' + turf.name">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                            View
                          </button>
                          @if (turf.status !== 'approved') {
                            <button class="btn btn--primary btn--sm"
                              [class.loading]="actioningId() === turf.id + ':approve'"
                              [disabled]="!!actioningId()"
                              (click)="approve(turf)">Approve</button>
                          }
                          @if (turf.status !== 'rejected') {
                            <button class="btn btn--danger btn--sm"
                              [disabled]="!!actioningId()"
                              (click)="openRejectModal(turf)">Reject</button>
                          }
                          <button class="btn btn--ghost btn--sm"
                            [disabled]="!!actioningId()"
                            (click)="suspend(turf)">
                            {{ turf.isActive ? 'Suspend' : 'Unsuspend' }}
                          </button>
                        </div>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }

        </div>
      </main>
    </div>

    <!-- Detail drawer -->
    @if (detailTurf()) {
      <div class="modal-overlay" (click)="closeDetail()" aria-hidden="true"></div>
      <div class="detail-drawer" role="dialog" [attr.aria-label]="detailTurf()!.name" aria-modal="true">
        <div class="detail-drawer__header">
          @if (detailTurf()!.images?.length) {
            <img [src]="detailTurf()!.images[0]" style="width:52px;height:52px;border-radius:10px;object-fit:cover;flex-shrink:0;" [alt]="detailTurf()!.name" loading="lazy"/>
          }
          <div style="flex:1;">
            <h2 class="detail-drawer__name">{{ detailTurf()!.name }}</h2>
            <p class="detail-drawer__email">{{ detailTurf()!.address?.city }}{{ detailTurf()!.address?.state ? ', ' + detailTurf()!.address?.state : '' }}</p>
          </div>
          <button class="detail-drawer__close" (click)="closeDetail()" aria-label="Close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div class="detail-drawer__body">
          <div class="detail-section">
            <h3 class="detail-section__title">Listing</h3>
            <dl class="detail-grid">
              <dt>Status</dt><dd><span class="badge badge--{{ statusBadge(detailTurf()!.status) }}">{{ detailTurf()!.status }}</span></dd>
              <dt>Active</dt><dd>{{ detailTurf()!.isActive ? 'Yes' : 'Disabled' }}</dd>
              <dt>Sports</dt><dd>{{ sportLabels(detailTurf()!.sportTypes) }}</dd>
              <dt>Base price</dt><dd>₹{{ detailTurf()!.pricing?.base }}/hr</dd>
              <dt>Weekend</dt><dd>{{ detailTurf()!.pricing?.weekend ? '₹' + detailTurf()!.pricing?.weekend + '/hr' : '—' }}</dd>
              <dt>Hours</dt><dd>{{ detailTurf()!.operatingHours?.open }} – {{ detailTurf()!.operatingHours?.close }}</dd>
              <dt>Photos</dt><dd>{{ detailTurf()!.images?.length ?? 0 }}</dd>
              <dt>Rating</dt><dd>{{ detailTurf()!.ratingAvg?.toFixed(1) }} ({{ detailTurf()!.ratingCount }} reviews)</dd>
              <dt>Submitted</dt><dd>{{ formatDate(detailTurf()!.createdAt) }}</dd>
            </dl>
          </div>
          <div class="detail-section">
            <h3 class="detail-section__title">Owner</h3>
            <dl class="detail-grid">
              <dt>Name</dt><dd>{{ detailTurf()!.owner?.name || '—' }}</dd>
              <dt>Email</dt><dd>{{ detailTurf()!.owner?.email || '—' }}</dd>
              <dt>Business</dt><dd>{{ detailTurf()!.owner?.businessName || '—' }}</dd>
            </dl>
          </div>
          @if (detailTurf()!.amenities?.length) {
            <div class="detail-section">
              <h3 class="detail-section__title">Facilities</h3>
              <div style="display:flex;flex-wrap:wrap;gap:6px;">
                @for (a of detailTurf()!.amenities; track a) {
                  <span class="badge badge--neutral">{{ a }}</span>
                }
              </div>
            </div>
          }
          @if (detailTurf()!.status === 'rejected' && detailTurf()!.rejectionReason) {
            <div class="alert alert--error" style="margin-bottom:0;">
              <svg class="alert__icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              <div><strong>Rejection reason:</strong><br>{{ detailTurf()!.rejectionReason }}</div>
            </div>
          }
        </div>
        <div class="detail-drawer__footer">
          @if (detailTurf()!.status !== 'approved') {
            <button class="btn btn--primary" [class.loading]="actioningId() === detailTurf()!.id + ':approve'" [disabled]="!!actioningId()" (click)="approve(detailTurf()!)">Approve listing</button>
          }
          @if (detailTurf()!.status !== 'rejected') {
            <button class="btn btn--danger" [disabled]="!!actioningId()" (click)="openRejectModal(detailTurf()!)">Reject listing</button>
          }
          <button class="btn btn--ghost" [disabled]="!!actioningId()" (click)="suspend(detailTurf()!)">{{ detailTurf()!.isActive ? 'Suspend' : 'Unsuspend' }}</button>
          <button class="btn btn--ghost" (click)="closeDetail()">Close</button>
        </div>
      </div>
    }

    <!-- Reject modal -->
    @if (rejectTarget()) {
      <div class="modal-overlay" (click)="closeRejectModal()" aria-hidden="true"></div>
      <div class="modal" role="dialog" aria-labelledby="reject-turf-title" aria-modal="true">
        <div class="modal__header">
          <h2 class="modal__title" id="reject-turf-title">Reject listing</h2>
          <button class="detail-drawer__close" (click)="closeRejectModal()" aria-label="Close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div class="modal__body">
          <p style="color:#6b7280;font-size:0.9375rem;margin-bottom:20px;">
            Rejecting <strong>"{{ rejectTarget()!.name }}"</strong>. Provide a clear reason so the owner can correct and resubmit.
          </p>
          <form [formGroup]="rejectForm" (ngSubmit)="confirmReject()" novalidate>
            <div class="form-group">
              <label for="turfRejectionReason" class="form-label">Rejection reason <span class="required">*</span></label>
              <textarea id="turfRejectionReason" class="form-control"
                [class.is-invalid]="rejectForm.get('reason')!.invalid && rejectForm.get('reason')!.touched"
                formControlName="reason" rows="4" style="resize:vertical;"
                placeholder="Describe what needs to be corrected (min. 10 characters)…"></textarea>
              @if (rejectForm.get('reason')!.invalid && rejectForm.get('reason')!.touched) {
                <span class="form-error" role="alert">
                  @if (rejectForm.get('reason')!.errors?.['required']) { Rejection reason is required. }
                  @else if (rejectForm.get('reason')!.errors?.['minlength']) { Must be at least 10 characters. }
                </span>
              }
            </div>
            <div class="modal__actions">
              <button type="button" class="btn btn--ghost" (click)="closeRejectModal()" [disabled]="!!actioningId()">Cancel</button>
              <button type="submit" class="btn btn--danger"
                [class.loading]="actioningId() === rejectTarget()!.id + ':reject'"
                [disabled]="!!actioningId()">Confirm rejection</button>
            </div>
          </form>
        </div>
      </div>
    }
  `,
  styles: [`
    .approvals-filters { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; margin-bottom: 24px; }
    .approvals-filters__tabs { display: flex; gap: 4px; background: #f3f4f6; padding: 4px; border-radius: 10px; }
    .filter-tab {
      display: flex; align-items: center; gap: 6px; padding: 6px 14px;
      font-size: 0.8125rem; font-weight: 600; font-family: inherit; color: #6b7280;
      background: none; border: none; border-radius: 7px; cursor: pointer; transition: background 150ms ease, color 150ms ease;
      white-space: nowrap;
      &:hover { background: #e5e7eb; color: #374151; }
      &.active { background: white; color: #111827; box-shadow: 0 1px 3px rgb(0 0 0/.1); }
    }
    .filter-tab__count { background: #f59e0b; color: white; font-size: 0.7rem; font-weight: 700; padding: 1px 6px; border-radius: 20px; line-height: 1.5; }

    .owners-table-wrap { background: white; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 2px rgb(0 0 0/.05); }
    .owners-table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
    .owners-table th { padding: 12px 16px; text-align: left; font-size: 0.75rem; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.04em; background: #f9fafb; border-bottom: 1px solid #e5e7eb; }
    .owners-table td { padding: 14px 16px; border-bottom: 1px solid #f3f4f6; vertical-align: middle; color: #374151; }
    .owner-row:last-child td { border-bottom: none; }
    .owner-row:hover td { background: #fafafa; }
    .owner-row--pending td { background: #fffbeb; }
    .owner-row--pending:hover td { background: #fef3c7; }
    .th-actions, .td-actions { text-align: right; }
    .td-date { white-space: nowrap; color: #6b7280; font-size: 0.8125rem; }

    .turf-cell { display: flex; align-items: center; gap: 10px; }
    .turf-cell__thumb { width: 44px; height: 44px; border-radius: 8px; object-fit: cover; flex-shrink: 0; background: #f3f4f6; }
    .turf-cell__thumb--placeholder { display: flex; align-items: center; justify-content: center; }
    .owner-cell__name { font-weight: 600; color: #111827; }
    .owner-cell__email { font-size: 0.8125rem; color: #6b7280; }

    .row-actions { display: flex; align-items: center; justify-content: flex-end; gap: 6px; flex-wrap: wrap; }
    .owner-row-skeleton { display: flex; align-items: center; gap: 24px; padding: 16px; border-bottom: 1px solid #f3f4f6; &:last-child { border-bottom: none; } }

    .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.45); z-index: 300; animation: fade-in 150ms ease; }
    .detail-drawer { position: fixed; top: 0; right: 0; bottom: 0; width: 440px; max-width: calc(100vw - 32px); background: white; z-index: 400; display: flex; flex-direction: column; box-shadow: -8px 0 32px rgb(0 0 0/.12); animation: slide-in 200ms ease; }
    @keyframes slide-in { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
    .detail-drawer__header { display: flex; align-items: center; gap: 14px; padding: 20px 24px; border-bottom: 1px solid #f3f4f6; }
    .detail-drawer__name { font-size: 1rem; font-weight: 700; color: #111827; }
    .detail-drawer__email { font-size: 0.875rem; color: #6b7280; }
    .detail-drawer__close { background: none; border: none; cursor: pointer; color: #9ca3af; padding: 4px; border-radius: 6px; margin-left: auto; display: flex; align-items: center; &:hover { background: #f3f4f6; color: #374151; } }
    .detail-drawer__body { flex: 1; overflow-y: auto; padding: 24px; display: flex; flex-direction: column; gap: 24px; }
    .detail-drawer__footer { padding: 16px 24px; border-top: 1px solid #f3f4f6; display: flex; gap: 10px; flex-wrap: wrap; }
    .detail-section__title { font-size: 0.75rem; font-weight: 700; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 12px; }
    .detail-grid { display: grid; grid-template-columns: 110px 1fr; gap: 8px 16px; font-size: 0.875rem; }
    .detail-grid dt { color: #6b7280; font-weight: 500; }
    .detail-grid dd { color: #111827; margin: 0; word-break: break-word; }

    .modal { position: fixed; top: 50%; left: 50%; transform: translate(-50%,-50%); width: 480px; max-width: calc(100vw - 32px); background: white; border-radius: 16px; box-shadow: 0 20px 60px rgb(0 0 0/.15); z-index: 400; animation: modal-in 200ms ease; }
    @keyframes modal-in { from { opacity: 0; transform: translate(-50%,-48%); } to { opacity: 1; transform: translate(-50%,-50%); } }
    .modal__header { display: flex; align-items: center; justify-content: space-between; padding: 20px 24px 0; }
    .modal__title { font-size: 1.0625rem; font-weight: 700; color: #111827; }
    .modal__body { padding: 20px 24px 24px; }
    .modal__actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px; }
    @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }

    @media (max-width: 900px) {
      .owners-table th:nth-child(3), .owners-table td:nth-child(3),
      .owners-table th:nth-child(6), .owners-table td:nth-child(6) { display: none; }
    }
    @media (max-width: 640px) {
      .owners-table th:nth-child(2), .owners-table td:nth-child(2),
      .owners-table th:nth-child(4), .owners-table td:nth-child(4) { display: none; }
    }
  `],
})
export class AdminTurfApprovalsComponent implements OnInit {
  private readonly turfService = inject(TurfService);
  private readonly toastService = inject(ToastService);
  private readonly fb = inject(FormBuilder);

  readonly loading    = signal(true);
  readonly loadError  = signal(false);
  readonly allTurfs   = signal<Turf[]>([]);
  readonly activeFilter = signal<FilterStatus>('pending');
  readonly actioningId  = signal<string | null>(null);
  readonly detailTurf   = signal<Turf | null>(null);
  readonly rejectTarget = signal<Turf | null>(null);

  searchQuery = '';

  readonly filterTabs: { label: string; value: FilterStatus }[] = [
    { label: 'Pending', value: 'pending' },
    { label: 'All',     value: 'all' },
    { label: 'Approved', value: 'approved' },
    { label: 'Rejected', value: 'rejected' },
  ];

  readonly pendingCount = computed(() => this.allTurfs().filter(t => t.status === 'pending').length);

  readonly filteredTurfs = computed(() => {
    const status = this.activeFilter();
    const q = this.searchQuery.trim().toLowerCase();
    return this.allTurfs().filter(t => {
      const matchStatus = status === 'all' || t.status === status;
      const matchSearch = !q || t.name.toLowerCase().includes(q) || (t.address?.city ?? '').toLowerCase().includes(q);
      return matchStatus && matchSearch;
    });
  });

  readonly rejectForm = this.fb.group({
    reason: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(500)]],
  });

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.loadError.set(false);
    this.turfService.adminGetTurfs().subscribe({
      next: (data) => { this.allTurfs.set(data.turfs); this.loading.set(false); },
      error: () => { this.loadError.set(true); this.loading.set(false); },
    });
  }

  setFilter(v: FilterStatus): void { this.activeFilter.set(v); }
  sportLabels(types: string[]): string {
    return (types ?? []).map(t => SPORT_TYPE_LABELS[t as keyof typeof SPORT_TYPE_LABELS] ?? t).join(', ');
  }
  statusBadge(s: string): string {
    return s === 'approved' ? 'success' : s === 'rejected' ? 'error' : 'pending';
  }
  formatDate(iso: string): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  openDetail(turf: Turf): void  { this.detailTurf.set(turf); }
  closeDetail(): void            { this.detailTurf.set(null); }
  openRejectModal(turf: Turf): void { this.rejectTarget.set(turf); this.rejectForm.reset(); }
  closeRejectModal(): void          { this.rejectTarget.set(null); this.rejectForm.reset(); }

  approve(turf: Turf): void {
    const key = turf.id + ':approve';
    this.actioningId.set(key);
    this.turfService.adminApproveTurf(turf.id).subscribe({
      next: (updated) => {
        this.actioningId.set(null);
        this._replace(updated);
        if (this.detailTurf()?.id === turf.id) this.detailTurf.set(updated);
        this.toastService.success('Listing approved', `"${turf.name}" is now publicly visible.`);
      },
      error: (err) => { this.actioningId.set(null); this.toastService.error('Approval failed', err.error?.message); },
    });
  }

  confirmReject(): void {
    this.rejectForm.markAllAsTouched();
    if (this.rejectForm.invalid || !this.rejectTarget()) return;
    const turf = this.rejectTarget()!;
    const reason = this.rejectForm.value.reason!;
    this.actioningId.set(turf.id + ':reject');
    this.turfService.adminRejectTurf(turf.id, reason).subscribe({
      next: (updated) => {
        this.actioningId.set(null);
        this._replace(updated);
        if (this.detailTurf()?.id === turf.id) this.detailTurf.set(updated);
        this.closeRejectModal();
        this.toastService.warning('Listing rejected', `Owner has been notified.`);
      },
      error: (err) => { this.actioningId.set(null); this.toastService.error('Rejection failed', err.error?.message); },
    });
  }

  suspend(turf: Turf): void {
    const key = turf.id + ':suspend';
    this.actioningId.set(key);
    this.turfService.adminSuspendTurf(turf.id).subscribe({
      next: (updated) => {
        this.actioningId.set(null);
        this._replace(updated);
        if (this.detailTurf()?.id === turf.id) this.detailTurf.set(updated);
        this.toastService.success(updated.isActive ? 'Turf unsuspended' : 'Turf suspended');
      },
      error: (err) => { this.actioningId.set(null); this.toastService.error('Failed', err.error?.message); },
    });
  }

  private _replace(updated: Turf): void {
    this.allTurfs.update(list => list.map(t => t.id === updated.id ? updated : t));
  }
}
