import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HeaderComponent } from '../../../layout/header/header.component';
import { AuthService } from '../../../core/services/auth.service';
import { BookingService } from '../../../core/services/booking.service';
import { Booking } from '../../../core/models/booking.model';

@Component({
  selector: 'app-customer-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, HeaderComponent],
  template: `
    <div class="app-shell">
      <app-header />
      <main class="app-main">
        <div class="container">
          <div class="page-header">
            <h1 class="page-header__title">Welcome back, {{ firstName }} 👋</h1>
            <p class="page-header__subtitle">Ready to play? Find a turf and book your next session.</p>
          </div>

          <!-- Quick actions -->
          <div class="stats-grid" style="margin-bottom:32px;">
            <a routerLink="/turfs" class="stat-card" style="text-decoration:none;cursor:pointer;transition:box-shadow 200ms,transform 200ms;" onmouseenter="this.style.transform='translateY(-2px)';this.style.boxShadow='0 10px 15px -3px rgb(0 0 0/.08)'" onmouseleave="this.style.transform='';this.style.boxShadow=''">
              <div class="stat-card__icon stat-card__icon--green">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              </div>
              <div class="stat-card__label">Find a turf</div>
              <div style="font-size:0.875rem;color:#6b7280;margin-top:4px;line-height:1.4;">Browse available venues near you</div>
            </a>
            <a routerLink="/bookings/my" class="stat-card" style="text-decoration:none;cursor:pointer;transition:box-shadow 200ms,transform 200ms;" onmouseenter="this.style.transform='translateY(-2px)';this.style.boxShadow='0 10px 15px -3px rgb(0 0 0/.08)'" onmouseleave="this.style.transform='';this.style.boxShadow=''">
              <div class="stat-card__icon stat-card__icon--blue">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              </div>
              <div class="stat-card__label">My bookings</div>
              <div style="font-size:0.875rem;color:#6b7280;margin-top:4px;line-height:1.4;">View upcoming &amp; past sessions</div>
            </a>
            <a routerLink="/tournaments" class="stat-card" style="text-decoration:none;cursor:pointer;transition:box-shadow 200ms,transform 200ms;" onmouseenter="this.style.transform='translateY(-2px)';this.style.boxShadow='0 10px 15px -3px rgb(0 0 0/.08)'" onmouseleave="this.style.transform='';this.style.boxShadow=''">
              <div class="stat-card__icon stat-card__icon--amber">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 21l4-4 4 4M12 17V3M3 9l9 3 9-3"/></svg>
              </div>
              <div class="stat-card__label">Tournaments</div>
              <div style="font-size:0.875rem;color:#6b7280;margin-top:4px;line-height:1.4;">Join or follow tournaments</div>
            </a>
          </div>

          <!-- Upcoming bookings card -->
          <div class="card">
            <div class="card__header" style="display:flex;align-items:center;justify-content:space-between;">
              <h2 style="font-size:1.0625rem;font-weight:700;color:#111827;">Upcoming Bookings</h2>
              <a routerLink="/turfs" class="btn btn--primary btn--sm">Book a turf</a>
            </div>
            <div class="card__body" style="padding:0;">

              <!-- Loading -->
              @if (loading()) {
                @for (i of [1,2]; track i) {
                  <div style="display:flex;align-items:center;gap:14px;padding:16px 20px;border-bottom:1px solid #f3f4f6;">
                    <div class="skeleton" style="width:48px;height:48px;border-radius:8px;flex-shrink:0;"></div>
                    <div style="flex:1;display:flex;flex-direction:column;gap:8px;">
                      <div class="skeleton skeleton--title" style="max-width:200px;"></div>
                      <div class="skeleton skeleton--text" style="width:150px;"></div>
                    </div>
                  </div>
                }
              }

              <!-- Empty -->
              @if (!loading() && upcomingBookings().length === 0) {
                <div class="empty-state" style="padding:48px 24px;">
                  <svg class="empty-state__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                  <div class="empty-state__title">No upcoming bookings</div>
                  <p class="empty-state__description">You haven't booked any turf sessions yet. Find a venue and book your first session.</p>
                  <a routerLink="/turfs" class="btn btn--primary" style="margin-top:8px;">Find turfs</a>
                </div>
              }

              <!-- Booking rows -->
              @if (!loading() && upcomingBookings().length > 0) {
                @for (b of upcomingBookings(); track b.id) {
                  <a [routerLink]="['/bookings', b.id]"
                     style="display:flex;align-items:center;gap:14px;padding:14px 20px;border-bottom:1px solid #f3f4f6;text-decoration:none;transition:background 150ms;"
                     class="upcoming-row">
                    <!-- Thumb -->
                    <div style="width:48px;height:48px;border-radius:8px;overflow:hidden;background:#f3f4f6;flex-shrink:0;">
                      @if (b.turf?.images?.length) {
                        <img [src]="b.turf!.images[0]" [alt]="b.turf!.name"
                             style="width:100%;height:100%;object-fit:cover;display:block;" loading="lazy"/>
                      } @else {
                        <div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" stroke-width="1.5"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
                        </div>
                      }
                    </div>
                    <!-- Info -->
                    <div style="flex:1;min-width:0;">
                      <div style="font-weight:600;font-size:0.9rem;color:#111827;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
                        {{ b.turf?.name ?? 'Turf' }}
                      </div>
                      <div style="font-size:0.8rem;color:#6b7280;margin-top:2px;">
                        {{ formatDate(b.date) }} · {{ b.startTime }}–{{ b.endTime }}
                      </div>
                    </div>
                    <!-- Amount + badge -->
                    <div style="text-align:right;flex-shrink:0;">
                      <div style="font-weight:700;font-size:0.9375rem;color:#111827;">₹{{ b.amount }}</div>
                      <span class="badge badge--success" style="font-size:0.7rem;margin-top:3px;display:inline-block;">Confirmed</span>
                    </div>
                  </a>
                }
                @if (hasMoreBookings()) {
                  <div style="padding:12px 20px;text-align:center;">
                    <a routerLink="/bookings/my" style="font-size:0.875rem;font-weight:600;color:#16a34a;text-decoration:none;">
                      View all bookings →
                    </a>
                  </div>
                }
              }

            </div>
          </div>

        </div>
      </main>
    </div>
  `,
  styles: [`
    .upcoming-row:hover { background: #f9fafb; }
    .upcoming-row:last-of-type { border-bottom: none !important; }
  `],
})
export class CustomerDashboardComponent implements OnInit {
  private readonly authService    = inject(AuthService);
  private readonly bookingService = inject(BookingService);

  readonly loading  = signal(true);
  /** All confirmed bookings fetched from API (up to 20). */
  private readonly allConfirmed = signal<Booking[]>([]);

  /** Only future bookings (date >= today). */
  readonly upcomingBookings = computed(() => {
    const todayStr = new Date().toISOString().slice(0, 10); // 'YYYY-MM-DD'
    return this.allConfirmed().filter(b => {
      // b.date is an ISO string from the backend; take first 10 chars
      const dateStr = typeof b.date === 'string'
        ? b.date.slice(0, 10)
        : new Date(b.date).toISOString().slice(0, 10);
      return dateStr >= todayStr;
    }).slice(0, 5); // show at most 5
  });

  readonly hasMoreBookings = computed(() => this.allConfirmed().length > 5);

  get user() { return this.authService.currentUser; }
  get firstName(): string { return this.user?.name?.split(' ')[0] ?? ''; }

  ngOnInit(): void {
    this.bookingService.getMyBookings({ status: 'confirmed', limit: 20 }).subscribe({
      next: (data) => {
        this.allConfirmed.set(data.bookings);
        this.loading.set(false);
      },
      error: () => {
        // Silently degrade — dashboard still usable without bookings
        this.loading.set(false);
      },
    });
  }

  formatDate(iso: string): string {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
  }
}
