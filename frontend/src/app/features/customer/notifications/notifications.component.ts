import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HeaderComponent } from '../../../layout/header/header.component';
import { NotificationService } from '../../../core/services/notification.service';
import { ToastService } from '../../../core/services/toast.service';
import { Notification } from '../../../core/models/notification.model';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule, RouterLink, HeaderComponent],
  template: `
    <div class="app-shell">
      <app-header />
      <main class="app-main">
        <div class="container" style="max-width:720px;">

          <div class="page-header" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;">
            <div>
              <h1 class="page-header__title">Notifications</h1>
              <p class="page-header__subtitle">Your recent activity updates.</p>
            </div>
            @if (unreadCount() > 0) {
              <button class="btn btn--ghost btn--sm" (click)="markAllRead()">Mark all as read</button>
            }
          </div>

          @if (loading()) {
            <div style="display:flex;flex-direction:column;gap:10px;">
              @for (i of [1,2,3,4]; track i) {
                <div style="display:flex;gap:14px;padding:16px;background:white;border:1px solid #e5e7eb;border-radius:12px;">
                  <div class="skeleton" style="width:40px;height:40px;border-radius:50%;flex-shrink:0;"></div>
                  <div style="flex:1;display:flex;flex-direction:column;gap:8px;">
                    <div class="skeleton skeleton--title" style="max-width:200px;"></div>
                    <div class="skeleton skeleton--text"></div>
                  </div>
                </div>
              }
            </div>
          }

          @if (!loading() && notifications().length === 0) {
            <div class="empty-state">
              <svg class="empty-state__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
              <div class="empty-state__title">No notifications</div>
              <p class="empty-state__description">You're all caught up!</p>
            </div>
          }

          @if (!loading() && notifications().length > 0) {
            <div style="display:flex;flex-direction:column;gap:8px;">
              @for (n of notifications(); track n.id) {
                <div class="notif-row" [class.notif-row--unread]="!n.read" (click)="markRead(n)">
                  <div class="notif-icon notif-icon--{{ iconColor(n.type) }}">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      @switch (n.type) {
                        @case ('booking_confirmed') {
                          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
                        }
                        @case ('tournament_registered') {
                          <path d="M8 21l4-4 4 4M12 17V3M3 9l9 3 9-3"/>
                        }
                        @default {
                          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                        }
                      }
                    </svg>
                  </div>
                  <div style="flex:1;min-width:0;">
                    <div style="font-weight:600;font-size:0.9rem;color:#111827;">{{ n.title }}</div>
                    <p style="font-size:0.8125rem;color:#6b7280;margin:2px 0 6px;line-height:1.5;">{{ n.message }}</p>
                    <div style="font-size:0.75rem;color:#9ca3af;">{{ formatDate(n.createdAt) }}</div>
                  </div>
                  @if (!n.read) {
                    <div style="width:8px;height:8px;border-radius:50%;background:#16a34a;flex-shrink:0;margin-top:6px;"></div>
                  }
                  <button class="btn btn--ghost btn--sm" style="flex-shrink:0;"
                    (click)="$event.stopPropagation(); deleteNotif(n)"
                    aria-label="Dismiss">✕</button>
                </div>
              }
            </div>

            @if (totalPages() > 1) {
              <div style="display:flex;align-items:center;justify-content:center;gap:16px;margin-top:24px;">
                <button class="btn btn--ghost btn--sm" [disabled]="page() <= 1" (click)="loadPage(page()-1)">Prev</button>
                <span style="font-size:0.875rem;color:#6b7280;">{{ page() }}/{{ totalPages() }}</span>
                <button class="btn btn--ghost btn--sm" [disabled]="page() >= totalPages()" (click)="loadPage(page()+1)">Next</button>
              </div>
            }
          }
        </div>
      </main>
    </div>
  `,
  styles: [`
    .notif-row {
      display:flex;align-items:flex-start;gap:14px;padding:16px;
      background:white;border:1px solid #e5e7eb;border-radius:12px;
      cursor:pointer;transition:background 150ms;
      &:hover { background:#f9fafb; }
      &--unread { border-left:3px solid #16a34a;background:#f0fdf4; }
    }
    .notif-icon {
      width:40px;height:40px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;
      &--green  { background:#dcfce7;color:#16a34a; }
      &--blue   { background:#dbeafe;color:#2563eb; }
      &--red    { background:#fee2e2;color:#dc2626; }
    }
  `],
})
export class NotificationsComponent implements OnInit {
  private readonly notifService = inject(NotificationService);
  private readonly toastService = inject(ToastService);

  readonly notifications = signal<Notification[]>([]);
  readonly loading       = signal(true);
  readonly page          = signal(1);
  readonly totalPages    = signal(1);
  readonly unreadCount   = signal(0);

  ngOnInit(): void { this.loadPage(1); }

  loadPage(p: number): void {
    this.page.set(p);
    this.loading.set(true);
    this.notifService.getAll(p).subscribe({
      next: (d) => {
        this.notifications.set(d.notifications);
        this.totalPages.set(d.pages);
        this.unreadCount.set(d.unreadCount);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  markRead(n: Notification): void {
    if (n.read) return;
    this.notifService.markRead(n.id).subscribe({
      next: (updated) => {
        this.notifications.update(list => list.map(x => x.id === updated.id ? updated : x));
        this.unreadCount.update(c => Math.max(0, c - 1));
      },
    });
  }

  markAllRead(): void {
    this.notifService.markAllRead().subscribe({
      next: () => {
        this.notifications.update(list => list.map(n => ({ ...n, read: true })));
        this.unreadCount.set(0);
        this.toastService.success('All notifications marked as read');
      },
    });
  }

  deleteNotif(n: Notification): void {
    this.notifService.delete(n.id).subscribe({
      next: () => {
        this.notifications.update(list => list.filter(x => x.id !== n.id));
        if (!n.read) this.unreadCount.update(c => Math.max(0, c - 1));
      },
    });
  }

  iconColor(type: string): string {
    if (type === 'booking_confirmed') return 'green';
    if (type === 'tournament_registered') return 'blue';
    return 'red';
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }
}
