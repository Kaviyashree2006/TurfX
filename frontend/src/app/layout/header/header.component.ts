import { Component, inject, signal, HostListener, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import { User } from '../../core/models/user.model';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  template: `
    <header class="app-header">
      <div class="container app-header__inner">

        <!-- Logo -->
        <a routerLink="/" class="app-header__logo" aria-label="TurfX home">
          <svg width="28" height="28" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="48" height="48" rx="10" fill="#16a34a"/>
            <path d="M14 34L24 14L34 34" stroke="white" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M17.5 27.5H30.5" stroke="white" stroke-width="3.5" stroke-linecap="round"/>
          </svg>
          <span>TurfX</span>
        </a>

        <!-- Desktop nav -->
        <nav class="app-header__nav" aria-label="Main navigation">
          @if (!currentUser) {
            <a routerLink="/turfs" routerLinkActive="active" class="app-header__nav-link">Find Turfs</a>
            <a routerLink="/tournaments" routerLinkActive="active" class="app-header__nav-link">Tournaments</a>
          }
          @if (currentUser?.role === 'customer') {
            <a routerLink="/turfs" routerLinkActive="active" class="app-header__nav-link">Find Turfs</a>
            <a routerLink="/bookings/my" routerLinkActive="active" class="app-header__nav-link">My Bookings</a>
            <a routerLink="/tournaments" routerLinkActive="active" class="app-header__nav-link">Tournaments</a>
          }
          @if (currentUser?.role === 'owner') {
            <a routerLink="/owner/dashboard" routerLinkActive="active" class="app-header__nav-link">Dashboard</a>
            <a routerLink="/owner/turfs" routerLinkActive="active" class="app-header__nav-link">My Turfs</a>
            <a routerLink="/owner/bookings" routerLinkActive="active" class="app-header__nav-link">Bookings</a>
            <a routerLink="/owner/tournaments" routerLinkActive="active" class="app-header__nav-link">Tournaments</a>
          }
          @if (currentUser?.role === 'admin') {
            <a routerLink="/admin/dashboard" routerLinkActive="active" class="app-header__nav-link">Dashboard</a>
            <a routerLink="/admin/owners/pending" routerLinkActive="active" class="app-header__nav-link">Owner Approvals</a>
            <a routerLink="/admin/turfs/pending" routerLinkActive="active" class="app-header__nav-link">Turf Approvals</a>
            <a routerLink="/admin/bookings" routerLinkActive="active" class="app-header__nav-link">Bookings</a>
            <a routerLink="/admin/payments" routerLinkActive="active" class="app-header__nav-link">Payments</a>
            <a routerLink="/admin/tournaments" routerLinkActive="active" class="app-header__nav-link">Tournaments</a>
            <a routerLink="/admin/reviews" routerLinkActive="active" class="app-header__nav-link">Reviews</a>
          }
        </nav>

        <!-- Actions -->
        <div class="app-header__actions">
          @if (!currentUser) {
            <a routerLink="/login" class="btn btn--ghost btn--sm">Log in</a>
            <a routerLink="/register" class="btn btn--primary btn--sm">Sign up</a>
          } @else {
            <!-- Notification bell (Phase 6) -->
            <a routerLink="/notifications" class="notif-bell" aria-label="Notifications">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
              @if (unreadCount() > 0) {
                <span class="notif-bell__badge">{{ unreadCount() > 9 ? '9+' : unreadCount() }}</span>
              }
            </a>
            <!-- User menu trigger -->
            <div class="header-user-menu" (click)="toggleUserMenu()" (keydown.enter)="toggleUserMenu()" tabindex="0" role="button" [attr.aria-expanded]="menuOpen()">
              <div class="app-header__avatar" aria-hidden="true">{{ initials }}</div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b7280" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" [style.transform]="menuOpen() ? 'rotate(180deg)' : ''" style="transition:transform 200ms ease; flex-shrink:0">
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </div>

            @if (menuOpen()) {
              <div class="header-dropdown" role="menu">
                <div class="header-dropdown__user">
                  <div class="header-dropdown__name">{{ currentUser.name }}</div>
                  <div class="header-dropdown__email">{{ currentUser.email }}</div>
                  <span class="badge badge--{{ roleBadgeClass }}">{{ currentUser.role }}</span>
                </div>
                <div class="header-dropdown__divider"></div>
                <a [routerLink]="profileRoute" class="header-dropdown__item" role="menuitem" (click)="closeMenu()">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                  Profile
                </a>
                <a routerLink="/notifications" class="header-dropdown__item" role="menuitem" (click)="closeMenu()">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                  Notifications
                  @if (unreadCount() > 0) { <span class="badge badge--info" style="margin-left:auto;">{{ unreadCount() }}</span> }
                </a>
                <div class="header-dropdown__divider"></div>
                <button class="header-dropdown__item header-dropdown__item--danger" role="menuitem" (click)="logout()">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                  Log out
                </button>
              </div>
            }
          }

          <!-- Mobile hamburger -->
          <button class="app-header__hamburger" (click)="toggleMobileMenu()" [attr.aria-expanded]="mobileMenuOpen()" aria-label="Toggle navigation">
            @if (!mobileMenuOpen()) {
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
            } @else {
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            }
          </button>
        </div>
      </div>
    </header>

    <!-- Mobile drawer overlay -->
    <div class="mobile-drawer-overlay" [class.open]="mobileMenuOpen()" (click)="closeMobileMenu()" aria-hidden="true"></div>

    <!-- Mobile drawer -->
    <nav class="mobile-drawer" [class.open]="mobileMenuOpen()" aria-label="Mobile navigation">
      <div class="mobile-drawer__header">
        <div style="display:flex;align-items:center;gap:8px;">
          <svg width="24" height="24" viewBox="0 0 48 48" fill="none"><rect width="48" height="48" rx="10" fill="#16a34a"/><path d="M14 34L24 14L34 34" stroke="white" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M17.5 27.5H30.5" stroke="white" stroke-width="3.5" stroke-linecap="round"/></svg>
          <span style="font-weight:800;font-size:1.125rem;color:#111827;">TurfX</span>
        </div>
        <button (click)="closeMobileMenu()" aria-label="Close menu" style="background:none;border:none;cursor:pointer;color:#6b7280;padding:4px;border-radius:6px;">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>

      @if (!currentUser) {
        <a routerLink="/turfs" class="mobile-drawer__link" (click)="closeMobileMenu()">Find Turfs</a>
        <a routerLink="/tournaments" class="mobile-drawer__link" (click)="closeMobileMenu()">Tournaments</a>
        <div style="margin-top:auto;padding-top:16px;display:flex;flex-direction:column;gap:8px;">
          <a routerLink="/login" class="btn btn--ghost btn--full" (click)="closeMobileMenu()">Log in</a>
          <a routerLink="/register" class="btn btn--primary btn--full" (click)="closeMobileMenu()">Sign up free</a>
        </div>
      }
      @if (currentUser?.role === 'customer') {
        <a routerLink="/dashboard" class="mobile-drawer__link" (click)="closeMobileMenu()">Dashboard</a>
        <a routerLink="/turfs" class="mobile-drawer__link" (click)="closeMobileMenu()">Find Turfs</a>
        <a routerLink="/bookings/my" class="mobile-drawer__link" (click)="closeMobileMenu()">My Bookings</a>
        <a routerLink="/tournaments" class="mobile-drawer__link" (click)="closeMobileMenu()">Tournaments</a>
        <a routerLink="/notifications" class="mobile-drawer__link" (click)="closeMobileMenu()">Notifications</a>
        <button class="mobile-drawer__link" style="color:#dc2626;border:none;background:none;cursor:pointer;text-align:left;width:100%;" (click)="logout()">Log out</button>
      }
      @if (currentUser?.role === 'owner') {
        <a routerLink="/owner/dashboard" class="mobile-drawer__link" (click)="closeMobileMenu()">Dashboard</a>
        <a routerLink="/owner/turfs" class="mobile-drawer__link" (click)="closeMobileMenu()">My Turfs</a>
        <a routerLink="/owner/bookings" class="mobile-drawer__link" (click)="closeMobileMenu()">Bookings</a>
        <a routerLink="/owner/tournaments" class="mobile-drawer__link" (click)="closeMobileMenu()">Tournaments</a>
        <a routerLink="/notifications" class="mobile-drawer__link" (click)="closeMobileMenu()">Notifications</a>
        <button class="mobile-drawer__link" style="color:#dc2626;border:none;background:none;cursor:pointer;text-align:left;width:100%;" (click)="logout()">Log out</button>
      }
      @if (currentUser?.role === 'admin') {
        <a routerLink="/admin/dashboard" class="mobile-drawer__link" (click)="closeMobileMenu()">Dashboard</a>
        <a routerLink="/admin/owners/pending" class="mobile-drawer__link" (click)="closeMobileMenu()">Owner Approvals</a>
        <a routerLink="/admin/turfs/pending" class="mobile-drawer__link" (click)="closeMobileMenu()">Turf Approvals</a>
        <a routerLink="/admin/bookings" class="mobile-drawer__link" (click)="closeMobileMenu()">Bookings</a>
        <a routerLink="/admin/tournaments" class="mobile-drawer__link" (click)="closeMobileMenu()">Tournaments</a>
        <a routerLink="/admin/reviews" class="mobile-drawer__link" (click)="closeMobileMenu()">Reviews</a>
        <a routerLink="/notifications" class="mobile-drawer__link" (click)="closeMobileMenu()">Notifications</a>
        <button class="mobile-drawer__link" style="color:#dc2626;border:none;background:none;cursor:pointer;text-align:left;width:100%;" (click)="logout()">Log out</button>
      }
    </nav>
  `,
  styles: [`
    .header-user-menu {
      display: flex;
      align-items: center;
      gap: 6px;
      cursor: pointer;
      padding: 4px;
      border-radius: 8px;
      position: relative;
      &:hover { background: #f3f4f6; }
    }
    .header-dropdown {
      position: absolute;
      top: calc(100% + 8px);
      right: 0;
      min-width: 220px;
      background: white;
      border-radius: 12px;
      box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.08), 0 8px 10px -6px rgb(0 0 0 / 0.04);
      border: 1px solid #e5e7eb;
      overflow: hidden;
      z-index: 200;
      animation: dropdown-in 150ms ease;
    }
    @keyframes dropdown-in {
      from { opacity: 0; transform: translateY(-4px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    .header-dropdown__user {
      padding: 12px 16px;
    }
    .header-dropdown__name {
      font-weight: 600;
      font-size: 0.875rem;
      color: #111827;
    }
    .header-dropdown__email {
      font-size: 0.75rem;
      color: #6b7280;
      margin-bottom: 6px;
    }
    .header-dropdown__divider {
      height: 1px;
      background: #f3f4f6;
    }
    .header-dropdown__item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 16px;
      font-size: 0.875rem;
      font-weight: 500;
      color: #374151;
      text-decoration: none;
      transition: background 150ms;
      cursor: pointer;
      background: none;
      border: none;
      width: 100%;
      font-family: inherit;
      &:hover { background: #f9fafb; }
      &--danger { color: #dc2626; &:hover { background: #fef2f2; } }
    }
    /* Notification bell */
    .notif-bell {
      position: relative; display: flex; align-items: center; justify-content: center;
      width: 36px; height: 36px; border-radius: 8px; color: #6b7280; text-decoration: none;
      transition: background 150ms;
      &:hover { background: #f3f4f6; color: #111827; }
    }
    .notif-bell__badge {
      position: absolute; top: 2px; right: 2px;
      min-width: 16px; height: 16px; padding: 0 4px;
      background: #dc2626; color: white; border-radius: 99px;
      font-size: 0.625rem; font-weight: 700; display: flex; align-items: center; justify-content: center;
      border: 2px solid white;
    }
    /* Positioning context for dropdown */
    :host { position: relative; }
  `],
})
export class HeaderComponent implements OnInit {
  private readonly authService   = inject(AuthService);
  private readonly notifService  = inject(NotificationService);
  private readonly router        = inject(Router);

  readonly menuOpen       = signal(false);
  readonly mobileMenuOpen = signal(false);
  readonly unreadCount    = signal(0);

  ngOnInit(): void { this.pollUnread(); }

  /** Fetch unread count once on load; enough for an academic project. */
  private pollUnread(): void {
    if (!this.authService.isAuthenticated) return;
    this.notifService.getUnreadCount().subscribe({
      next: (c) => this.unreadCount.set(c),
      error: () => {},
    });
  }

  get currentUser(): User | null {
    return this.authService.currentUser;
  }

  get initials(): string {
    const name = this.currentUser?.name ?? '';
    return name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
  }

  get roleBadgeClass(): string {
    switch (this.currentUser?.role) {
      case 'admin':    return 'info';
      case 'owner':    return 'warning';
      default:         return 'success';
    }
  }

  get profileRoute(): string {
    switch (this.currentUser?.role) {
      case 'owner': return '/owner/profile';
      case 'admin': return '/admin/profile';
      default:      return '/profile';
    }
  }

  toggleUserMenu(): void  { this.menuOpen.update((v) => !v); }
  closeMenu(): void       { this.menuOpen.set(false); }
  toggleMobileMenu(): void { this.mobileMenuOpen.update((v) => !v); }
  closeMobileMenu(): void  { this.mobileMenuOpen.set(false); }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.header-user-menu') && !target.closest('.header-dropdown')) {
      this.menuOpen.set(false);
    }
  }

  logout(): void {
    this.closeMenu();
    this.closeMobileMenu();
    this.authService.logout().subscribe();
  }
}
