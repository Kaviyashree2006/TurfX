import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HeaderComponent } from '../../../layout/header/header.component';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [RouterLink, HeaderComponent],
  template: `
    <div class="app-shell">
      <app-header />
      <main class="app-main">
        <div class="container">
          <!-- Hero -->
          <section class="landing-hero">
            <div class="landing-hero__content">
              <div class="badge badge--success" style="margin-bottom:16px;">
                <svg width="10" height="10" viewBox="0 0 8 8" fill="#16a34a"><circle cx="4" cy="4" r="4"/></svg>
                Live platform
              </div>
              <h1 class="landing-hero__headline">Book your turf.<br>Play your game.</h1>
              <p class="landing-hero__sub">Discover and book premium sports venues for turf football, box cricket, and more. Instant confirmation. No phone calls needed.</p>
              <div class="landing-hero__actions">
                <a routerLink="/turfs" class="btn btn--primary btn--lg">Find turfs near you</a>
                <a routerLink="/tournaments" class="btn btn--ghost btn--lg">Browse tournaments</a>
              </div>
            </div>
            <div class="landing-hero__graphic">
              <div class="landing-graphic">
                <div class="landing-graphic__badge">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                  <span>Slot confirmed</span>
                </div>
                <div class="landing-graphic__field">
                  <div class="field-lines">
                    <div class="field-line"></div>
                    <div class="field-line field-line--mid"></div>
                    <div class="field-line"></div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <!-- Features -->
          <section class="landing-features">
            <h2 class="landing-section-title">Everything you need to play</h2>
            <div class="landing-features-grid">
              <div class="feature-card">
                <div class="stat-card__icon stat-card__icon--green">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                </div>
                <h3 class="feature-card__title">Live availability</h3>
                <p class="feature-card__desc">See real-time slot availability and book instantly without double-booking worries.</p>
              </div>
              <div class="feature-card">
                <div class="stat-card__icon stat-card__icon--amber">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
                </div>
                <h3 class="feature-card__title">Tournaments</h3>
                <p class="feature-card__desc">Register your team for local tournaments and track brackets, results, and standings.</p>
              </div>
              <div class="feature-card">
                <div class="stat-card__icon stat-card__icon--blue">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
                </div>
                <h3 class="feature-card__title">Secure payments</h3>
                <p class="feature-card__desc">Pay safely via Razorpay. Transparent refund policies configured by each venue.</p>
              </div>
            </div>
          </section>

          <!-- CTA -->
          <section class="landing-cta">
            <div class="landing-cta__inner">
              <h2>Own a sports venue?</h2>
              <p>List your turf on TurfX and start getting bookings from thousands of players today.</p>
              <a routerLink="/register/owner" class="btn btn--primary btn--lg" style="background:white;color:#16a34a;border-color:white;">List your venue →</a>
            </div>
          </section>
        </div>
      </main>
    </div>
  `,
  styles: [`
    .landing-hero {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 64px;
      align-items: center;
      padding: 80px 0;
      @media (max-width: 1024px) { grid-template-columns: 1fr; gap: 40px; padding: 48px 0; }
    }
    .landing-hero__headline {
      font-size: 3.5rem; font-weight: 800; letter-spacing: -0.04em; line-height: 1.1;
      color: #111827; margin-bottom: 20px;
      @media (max-width: 768px) { font-size: 2.5rem; }
    }
    .landing-hero__sub {
      font-size: 1.125rem; color: #6b7280; line-height: 1.7; margin-bottom: 32px; max-width: 480px;
    }
    .landing-hero__actions { display: flex; gap: 12px; flex-wrap: wrap; }
    .landing-hero__graphic {
      display: flex; align-items: center; justify-content: center;
      @media (max-width: 1024px) { display: none; }
    }
    .landing-graphic {
      width: 360px; height: 320px; background: linear-gradient(135deg, #f0fdf4, #dcfce7);
      border-radius: 24px; border: 1px solid #bbf7d0; position: relative;
      display: flex; align-items: center; justify-content: center;
    }
    .landing-graphic__badge {
      position: absolute; top: 20px; right: 20px;
      background: white; border-radius: 8px; padding: 8px 14px;
      font-size: 0.8125rem; font-weight: 600; color: #111827;
      box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.07);
      display: flex; align-items: center; gap: 8px;
    }
    .landing-graphic__field {
      width: 240px; height: 200px; background: #16a34a; border-radius: 12px;
      display: flex; flex-direction: column; justify-content: space-between;
      padding: 16px; border: 3px solid rgba(255,255,255,0.3);
    }
    .field-line { height: 2px; background: rgba(255,255,255,0.4); border-radius: 2px; }
    .field-line--mid { width: 60%; align-self: center; margin: auto; }

    .landing-section-title {
      font-size: 1.875rem; font-weight: 800; color: #111827; letter-spacing: -0.03em;
      text-align: center; margin-bottom: 40px;
    }
    .landing-features { padding: 80px 0; border-top: 1px solid #f3f4f6; }
    .landing-features-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px;
      @media (max-width: 768px) { grid-template-columns: 1fr; }
    }
    .feature-card {
      background: white; border: 1px solid #e5e7eb; border-radius: 16px; padding: 28px;
      box-shadow: 0 1px 2px rgb(0 0 0 / 0.05);
      transition: box-shadow 200ms ease, transform 200ms ease;
      &:hover { box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.07); transform: translateY(-2px); }
    }
    .feature-card__title { font-size: 1.0625rem; font-weight: 700; color: #111827; margin: 16px 0 8px; }
    .feature-card__desc { font-size: 0.875rem; color: #6b7280; line-height: 1.6; }

    .landing-cta { margin: 0 0 80px; }
    .landing-cta__inner {
      background: linear-gradient(135deg, #16a34a 0%, #15803d 100%);
      border-radius: 24px; padding: 56px 48px; text-align: center; color: white;
      h2 { font-size: 2rem; font-weight: 800; letter-spacing: -0.03em; margin-bottom: 12px; }
      p { font-size: 1.0625rem; opacity: 0.85; margin-bottom: 32px; }
      @media (max-width: 640px) { padding: 40px 24px; h2 { font-size: 1.5rem; } }
    }
  `],
})
export class LandingComponent {}
