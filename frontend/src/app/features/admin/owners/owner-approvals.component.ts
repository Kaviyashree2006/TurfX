import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';

import { HeaderComponent } from '../../../layout/header/header.component';
import { AdminService } from '../../../core/services/admin.service';
import { ToastService } from '../../../core/services/toast.service';
import { OwnerSummary } from '../../../core/models/admin.model';

type FilterStatus = 'all' | 'pending' | 'approved' | 'rejected';

@Component({
  selector: 'app-owner-approvals',
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
              <h1 class="page-header__title">Owner Applications</h1>
              <p class="page-header__subtitle">Review, approve, and manage turf owner account applications.</p>
            </div>
            <div class="badge badge--{{ pendingCount() > 0 ? 'warning' : 'neutral' }}" style="font-size:0.875rem;padding:6px 14px;">
              {{ pendingCount() }} pending review
            </div>
          </div>

          <!-- Filters row -->
          <div class="approvals-filters">
            <div class="input-wrapper" style="flex:1;min-width:220px;max-width:380px;">
              <span class="input-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              </span>
              <input
                type="search"
                class="form-control has-icon-left"
                placeholder="Search by name, email or venue…"
                [(ngModel)]="searchQuery"
                (ngModelChange)="onSearchChange()"
                aria-label="Search owners"
              />
            </div>
            <div class="approvals-filters__tabs" role="tablist">
              @for (tab of filterTabs; track tab.value) {
                <button
                  class="filter-tab"
                  [class.active]="activeFilter() === tab.value"
                  (click)="setFilter(tab.value)"
                  role="tab"
                  [attr.aria-selected]="activeFilter() === tab.value"
                >
                  {{ tab.label }}
                  @if (tab.value === 'pending' && pendingCount() > 0) {
                    <span class="filter-tab__count">{{ pendingCount() }}</span>
                  }
                </button>
              }
            </div>
          </div>

          <!-- Loading state -->
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

          <!-- Error state -->
          @if (!loading() && loadError()) {
            <div class="alert alert--error" role="alert">
              <svg class="alert__icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              Failed to load owners. <button class="btn btn--link" style="font-size:inherit;" (click)="loadOwners()">Try again</button>
            </div>
          }

          <!-- Empty state -->
          @if (!loading() && !loadError() && filteredOwners().length === 0) {
            <div class="empty-state" style="padding:64px 24px;">
              <svg class="empty-state__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              <div class="empty-state__title">No owners found</div>
              <p class="empty-state__description">
                @if (searchQuery.trim()) {
                  No owners match your search. Try a different name or email.
                } @else if (activeFilter() === 'pending') {
                  No owner applications are pending review right now.
                } @else {
                  No owner accounts found for this filter.
                }
              </p>
            </div>
          }

          <!-- Owners table -->
          @if (!loading() && !loadError() && filteredOwners().length > 0) {
            <div class="owners-table-wrap">
              <table class="owners-table" aria-label="Owner applications">
                <thead>
                  <tr>
                    <th>Owner</th>
                    <th>Business</th>
                    <th>Status</th>
                    <th>Applied</th>
                    <th>Resubmissions</th>
                    <th class="th-actions">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  @for (owner of filteredOwners(); track owner.id) {
                    <tr class="owner-row" [class.owner-row--pending]="owner.approvalStatus === 'pending'">
                      <td>
                        <div class="owner-cell">
                          <div class="owner-avatar">{{ initials(owner.name) }}</div>
                          <div>
                            <div class="owner-cell__name">{{ owner.name }}</div>
                            <div class="owner-cell__email">{{ owner.email }}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div class="owner-cell__business">{{ owner.businessName || '—' }}</div>
                        <div class="owner-cell__address">{{ owner.businessAddress || '' }}</div>
                      </td>
                      <td>
                        <span class="badge badge--{{ statusBadge(owner.approvalStatus) }}">
                          {{ owner.approvalStatus }}
                        </span>
                      </td>
                      <td class="td-date">{{ formatDate(owner.createdAt) }}</td>
                      <td class="td-center">
                        @if (owner.resubmissionCount > 0) {
                          <span class="badge badge--neutral">{{ owner.resubmissionCount }}×</span>
                        } @else {
                          <span style="color:#9ca3af;">—</span>
                        }
                      </td>
                      <td class="td-actions">
                        <div class="row-actions">
                          <!-- View detail -->
                          <button class="btn btn--ghost btn--sm" (click)="openDetail(owner)" [attr.aria-label]="'View ' + owner.name">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                            View
                          </button>
                          @if (owner.approvalStatus !== 'approved') {
                            <button
                              class="btn btn--primary btn--sm"
                              [class.loading]="actioningId() === owner.id + ':approve'"
                              [disabled]="!!actioningId()"
                              (click)="approve(owner)"
                            >
                              Approve
                            </button>
                          }
                          @if (owner.approvalStatus !== 'rejected') {
                            <button
                              class="btn btn--danger btn--sm"
                              [disabled]="!!actioningId()"
                              (click)="openRejectModal(owner)"
                            >
                              Reject
                            </button>
                          }
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

    <!-- ── Owner Detail Drawer ───────────────────────────────────────────── -->
    @if (detailOwner()) {
      <div class="modal-overlay" (click)="closeDetail()" aria-hidden="true"></div>
      <div class="detail-drawer" role="dialog" [attr.aria-label]="detailOwner()!.name + ' details'" aria-modal="true">
        <div class="detail-drawer__header">
          <div class="owner-avatar owner-avatar--lg">{{ initials(detailOwner()!.name) }}</div>
          <div style="flex:1;">
            <h2 class="detail-drawer__name">{{ detailOwner()!.name }}</h2>
            <p class="detail-drawer__email">{{ detailOwner()!.email }}</p>
          </div>
          <button class="detail-drawer__close" (click)="closeDetail()" aria-label="Close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <div class="detail-drawer__body">
          <div class="detail-section">
            <h3 class="detail-section__title">Account</h3>
            <dl class="detail-grid">
              <dt>Status</dt>
              <dd><span class="badge badge--{{ statusBadge(detailOwner()!.approvalStatus) }}">{{ detailOwner()!.approvalStatus }}</span></dd>
              <dt>Phone</dt>
              <dd>{{ detailOwner()!.phone || '—' }}</dd>
              <dt>Applied</dt>
              <dd>{{ formatDate(detailOwner()!.createdAt) }}</dd>
              <dt>Last updated</dt>
              <dd>{{ formatDate(detailOwner()!.updatedAt) }}</dd>
              <dt>Resubmissions</dt>
              <dd>{{ detailOwner()!.resubmissionCount }}</dd>
              <dt>Active</dt>
              <dd>{{ detailOwner()!.isActive ? 'Yes' : 'No' }}</dd>
            </dl>
          </div>

          <div class="detail-section">
            <h3 class="detail-section__title">Business</h3>
            <dl class="detail-grid">
              <dt>Venue name</dt>
              <dd>{{ detailOwner()!.businessName || '—' }}</dd>
              <dt>Address</dt>
              <dd>{{ detailOwner()!.businessAddress || '—' }}</dd>
            </dl>
          </div>

          @if (detailOwner()!.approvalStatus === 'rejected' && detailOwner()!.rejectionReason) {
            <div class="alert alert--error" style="margin-bottom:0;">
              <svg class="alert__icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              <div>
                <strong>Rejection reason:</strong><br>
                {{ detailOwner()!.rejectionReason }}
              </div>
            </div>
          }
        </div>

        <div class="detail-drawer__footer">
          @if (detailOwner()!.approvalStatus !== 'approved') {
            <button
              class="btn btn--primary"
              [class.loading]="actioningId() === detailOwner()!.id + ':approve'"
              [disabled]="!!actioningId()"
              (click)="approve(detailOwner()!)"
            >
              Approve account
            </button>
          }
          @if (detailOwner()!.approvalStatus !== 'rejected') {
            <button
              class="btn btn--danger"
              [disabled]="!!actioningId()"
              (click)="openRejectModal(detailOwner()!)"
            >
              Reject account
            </button>
          }
          <button class="btn btn--ghost" (click)="closeDetail()">Close</button>
        </div>
      </div>
    }

    <!-- ── Reject Modal ──────────────────────────────────────────────────── -->
    @if (rejectTarget()) {
      <div class="modal-overlay" (click)="closeRejectModal()" aria-hidden="true"></div>
      <div class="modal" role="dialog" aria-labelledby="reject-modal-title" aria-modal="true">
        <div class="modal__header">
          <h2 class="modal__title" id="reject-modal-title">Reject application</h2>
          <button class="detail-drawer__close" (click)="closeRejectModal()" aria-label="Close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div class="modal__body">
          <p style="color:#6b7280;font-size:0.9375rem;margin-bottom:20px;">
            You are rejecting <strong>{{ rejectTarget()!.name }}</strong>'s application.
            Provide a clear reason so they can correct and resubmit.
          </p>
          <form [formGroup]="rejectForm" (ngSubmit)="confirmReject()" novalidate>
            <div class="form-group">
              <label for="rejectionReason" class="form-label">
                Rejection reason <span class="required">*</span>
              </label>
              <textarea
                id="rejectionReason"
                class="form-control"
                [class.is-invalid]="rejectForm.get('reason')!.invalid && rejectForm.get('reason')!.touched"
                formControlName="reason"
                rows="4"
                placeholder="Describe what needs to be corrected (min. 10 characters)…"
                style="resize:vertical;"
              ></textarea>
              @if (rejectForm.get('reason')!.invalid && rejectForm.get('reason')!.touched) {
                <span class="form-error" role="alert">
                  @if (rejectForm.get('reason')!.errors?.['required']) { Rejection reason is required. }
                  @else if (rejectForm.get('reason')!.errors?.['minlength']) { Must be at least 10 characters. }
                  @else if (rejectForm.get('reason')!.errors?.['maxlength']) { Must be 500 characters or fewer. }
                </span>
              }
            </div>
            <div class="modal__actions">
              <button type="button" class="btn btn--ghost" (click)="closeRejectModal()" [disabled]="!!actioningId()">Cancel</button>
              <button
                type="submit"
                class="btn btn--danger"
                [class.loading]="actioningId() === rejectTarget()!.id + ':reject'"
                [disabled]="!!actioningId()"
              >
                Confirm rejection
              </button>
            </div>
          </form>
        </div>
      </div>
    }
  `,
  styles: [`
    /* ── Filters ─────────────────────────────────────────────────────────── */
    .approvals-filters {
      display: flex;
      align-items: center;
      gap: 16px;
      flex-wrap: wrap;
      margin-bottom: 24px;
    }
    .approvals-filters__tabs {
      display: flex;
      gap: 4px;
      background: #f3f4f6;
      padding: 4px;
      border-radius: 10px;
    }
    .filter-tab {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px 14px;
      font-size: 0.8125rem;
      font-weight: 600;
      font-family: inherit;
      color: #6b7280;
      background: none;
      border: none;
      border-radius: 7px;
      cursor: pointer;
      transition: background 150ms ease, color 150ms ease;
      white-space: nowrap;
      &:hover { background: #e5e7eb; color: #374151; }
      &.active { background: white; color: #111827; box-shadow: 0 1px 3px rgb(0 0 0 / 0.1); }
    }
    .filter-tab__count {
      background: #f59e0b;
      color: white;
      font-size: 0.7rem;
      font-weight: 700;
      padding: 1px 6px;
      border-radius: 20px;
      line-height: 1.5;
    }

    /* ── Table ────────────────────────────────────────────────────────────── */
    .owners-table-wrap {
      background: white;
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 1px 2px rgb(0 0 0 / 0.05);
    }
    .owners-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.875rem;
    }
    .owners-table th {
      padding: 12px 16px;
      text-align: left;
      font-size: 0.75rem;
      font-weight: 600;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      background: #f9fafb;
      border-bottom: 1px solid #e5e7eb;
    }
    .owners-table td {
      padding: 14px 16px;
      border-bottom: 1px solid #f3f4f6;
      vertical-align: middle;
      color: #374151;
    }
    .owner-row:last-child td { border-bottom: none; }
    .owner-row:hover td { background: #fafafa; }
    .owner-row--pending td { background: #fffbeb; }
    .owner-row--pending:hover td { background: #fef3c7; }
    .th-actions, .td-actions { text-align: right; }
    .td-center { text-align: center; }
    .td-date { white-space: nowrap; color: #6b7280; font-size: 0.8125rem; }

    /* ── Owner cell ────────────────────────────────────────────────────────── */
    .owner-cell {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .owner-avatar {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: #16a34a;
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.75rem;
      font-weight: 700;
      flex-shrink: 0;
    }
    .owner-avatar--lg {
      width: 48px;
      height: 48px;
      font-size: 1rem;
    }
    .owner-cell__name { font-weight: 600; color: #111827; }
    .owner-cell__email { font-size: 0.8125rem; color: #6b7280; }
    .owner-cell__business { font-weight: 500; color: #374151; }
    .owner-cell__address { font-size: 0.8125rem; color: #9ca3af; max-width: 220px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

    /* ── Row actions ─────────────────────────────────────────────────────── */
    .row-actions {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 8px;
    }

    /* ── Skeleton rows ───────────────────────────────────────────────────── */
    .owner-row-skeleton {
      display: flex;
      align-items: center;
      gap: 24px;
      padding: 16px;
      border-bottom: 1px solid #f3f4f6;
      &:last-child { border-bottom: none; }
    }

    /* ── Modal overlay ───────────────────────────────────────────────────── */
    .modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.45);
      z-index: 300;
      animation: fade-in 150ms ease;
    }

    /* ── Detail drawer ───────────────────────────────────────────────────── */
    .detail-drawer {
      position: fixed;
      top: 0;
      right: 0;
      bottom: 0;
      width: 420px;
      max-width: calc(100vw - 32px);
      background: white;
      z-index: 400;
      display: flex;
      flex-direction: column;
      box-shadow: -8px 0 32px rgb(0 0 0 / 0.12);
      animation: slide-in 200ms ease;
    }
    @keyframes slide-in {
      from { transform: translateX(100%); opacity: 0; }
      to   { transform: translateX(0); opacity: 1; }
    }
    .detail-drawer__header {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 20px 24px;
      border-bottom: 1px solid #f3f4f6;
    }
    .detail-drawer__name { font-size: 1.0625rem; font-weight: 700; color: #111827; }
    .detail-drawer__email { font-size: 0.875rem; color: #6b7280; }
    .detail-drawer__close {
      background: none;
      border: none;
      cursor: pointer;
      color: #9ca3af;
      padding: 4px;
      border-radius: 6px;
      margin-left: auto;
      display: flex;
      align-items: center;
      &:hover { background: #f3f4f6; color: #374151; }
    }
    .detail-drawer__body {
      flex: 1;
      overflow-y: auto;
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 24px;
    }
    .detail-drawer__footer {
      padding: 16px 24px;
      border-top: 1px solid #f3f4f6;
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
    }

    /* ── Detail sections ─────────────────────────────────────────────────── */
    .detail-section__title {
      font-size: 0.75rem;
      font-weight: 700;
      color: #9ca3af;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 12px;
    }
    .detail-grid {
      display: grid;
      grid-template-columns: 120px 1fr;
      gap: 8px 16px;
      font-size: 0.875rem;
    }
    .detail-grid dt { color: #6b7280; font-weight: 500; }
    .detail-grid dd { color: #111827; margin: 0; word-break: break-word; }

    /* ── Reject modal ────────────────────────────────────────────────────── */
    .modal {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 480px;
      max-width: calc(100vw - 32px);
      background: white;
      border-radius: 16px;
      box-shadow: 0 20px 60px rgb(0 0 0 / 0.15);
      z-index: 400;
      animation: modal-in 200ms ease;
    }
    @keyframes modal-in {
      from { opacity: 0; transform: translate(-50%, -48%); }
      to   { opacity: 1; transform: translate(-50%, -50%); }
    }
    .modal__header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 20px 24px 0;
    }
    .modal__title { font-size: 1.0625rem; font-weight: 700; color: #111827; }
    .modal__body { padding: 20px 24px 24px; }
    .modal__actions {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      margin-top: 20px;
    }

    @keyframes fade-in {
      from { opacity: 0; }
      to   { opacity: 1; }
    }

    /* ── Responsive ────────────────────────────────────────────────────────── */
    @media (max-width: 768px) {
      .owners-table th:nth-child(4),
      .owners-table td:nth-child(4),
      .owners-table th:nth-child(5),
      .owners-table td:nth-child(5) { display: none; }
      .owner-cell__address { max-width: 120px; }
    }
    @media (max-width: 560px) {
      .owners-table th:nth-child(2),
      .owners-table td:nth-child(2) { display: none; }
    }
  `],
})
export class OwnerApprovalsComponent implements OnInit {
  private readonly adminService = inject(AdminService);
  private readonly toastService = inject(ToastService);
  private readonly fb = inject(FormBuilder);

  readonly loading = signal(true);
  readonly loadError = signal(false);
  readonly allOwners = signal<OwnerSummary[]>([]);
  readonly activeFilter = signal<FilterStatus>('pending');
  readonly actioningId = signal<string | null>(null);
  readonly detailOwner = signal<OwnerSummary | null>(null);
  readonly rejectTarget = signal<OwnerSummary | null>(null);

  searchQuery = '';
  private searchTimer: ReturnType<typeof setTimeout> | null = null;

  readonly filterTabs: { label: string; value: FilterStatus }[] = [
    { label: 'Pending', value: 'pending' },
    { label: 'All', value: 'all' },
    { label: 'Approved', value: 'approved' },
    { label: 'Rejected', value: 'rejected' },
  ];

  readonly pendingCount = computed(
    () => this.allOwners().filter((o) => o.approvalStatus === 'pending').length
  );

  readonly filteredOwners = computed(() => {
    const status = this.activeFilter();
    const q = this.searchQuery.trim().toLowerCase();
    return this.allOwners().filter((o) => {
      const matchesStatus = status === 'all' || o.approvalStatus === status;
      const matchesSearch =
        !q ||
        o.name.toLowerCase().includes(q) ||
        o.email.toLowerCase().includes(q) ||
        (o.businessName ?? '').toLowerCase().includes(q);
      return matchesStatus && matchesSearch;
    });
  });

  readonly rejectForm = this.fb.group({
    reason: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(500)]],
  });

  ngOnInit(): void {
    this.loadOwners();
  }

  loadOwners(): void {
    this.loading.set(true);
    this.loadError.set(false);
    this.adminService.getOwners().subscribe({
      next: (data) => {
        this.allOwners.set(data.owners);
        this.loading.set(false);
      },
      error: () => {
        this.loadError.set(true);
        this.loading.set(false);
      },
    });
  }

  setFilter(value: FilterStatus): void {
    this.activeFilter.set(value);
  }

  onSearchChange(): void {
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => {}, 0); // filtering is computed locally — instant
  }

  initials(name: string): string {
    return name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
  }

  statusBadge(status: string): string {
    switch (status) {
      case 'approved': return 'success';
      case 'rejected': return 'error';
      default:         return 'pending';
    }
  }

  formatDate(iso: string): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  openDetail(owner: OwnerSummary): void {
    this.detailOwner.set(owner);
  }

  closeDetail(): void {
    this.detailOwner.set(null);
  }

  openRejectModal(owner: OwnerSummary): void {
    this.rejectTarget.set(owner);
    this.rejectForm.reset();
  }

  closeRejectModal(): void {
    this.rejectTarget.set(null);
    this.rejectForm.reset();
  }

  approve(owner: OwnerSummary): void {
    const key = owner.id + ':approve';
    this.actioningId.set(key);
    this.adminService.approveOwner(owner.id).subscribe({
      next: (updated) => {
        this.actioningId.set(null);
        this._replaceOwner(updated);
        if (this.detailOwner()?.id === owner.id) this.detailOwner.set(updated);
        this.toastService.success('Owner approved', `${owner.name} can now list turfs and accept bookings.`);
      },
      error: (err) => {
        this.actioningId.set(null);
        this.toastService.error('Approval failed', err.error?.message ?? 'Please try again.');
      },
    });
  }

  confirmReject(): void {
    this.rejectForm.markAllAsTouched();
    if (this.rejectForm.invalid || !this.rejectTarget()) return;

    const owner = this.rejectTarget()!;
    const reason = this.rejectForm.value.reason!;
    const key = owner.id + ':reject';
    this.actioningId.set(key);

    this.adminService.rejectOwner(owner.id, reason).subscribe({
      next: (updated) => {
        this.actioningId.set(null);
        this._replaceOwner(updated);
        if (this.detailOwner()?.id === owner.id) this.detailOwner.set(updated);
        this.closeRejectModal();
        this.toastService.warning('Owner rejected', `${owner.name} has been notified with the reason.`);
      },
      error: (err) => {
        this.actioningId.set(null);
        this.toastService.error('Rejection failed', err.error?.message ?? 'Please try again.');
      },
    });
  }

  private _replaceOwner(updated: OwnerSummary): void {
    this.allOwners.update((list) => list.map((o) => (o.id === updated.id ? updated : o)));
  }
}
