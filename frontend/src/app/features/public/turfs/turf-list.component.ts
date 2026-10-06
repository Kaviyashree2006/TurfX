import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HeaderComponent } from '../../../layout/header/header.component';
import { TurfService } from '../../../core/services/turf.service';
import { Turf, SportType, SPORT_TYPE_LABELS } from '../../../core/models/turf.model';

@Component({
  selector: 'app-turf-list',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, HeaderComponent],
  template: `
    <div class="app-shell">
      <app-header />
      <main class="app-main">
        <div class="container">

          <!-- Hero search bar -->
          <div class="turf-search-hero">
            <h1 class="turf-search-hero__title">Find your turf</h1>
            <p class="turf-search-hero__sub">Discover and book premium sports venues near you.</p>
            <div class="turf-search-bar">
              <div class="input-wrapper" style="flex:1;">
                <span class="input-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                </span>
                <input
                  type="search"
                  class="form-control has-icon-left"
                  placeholder="Search turf name…"
                  [(ngModel)]="searchQuery"
                  (keydown.enter)="doSearch()"
                  style="height:48px;font-size:1rem;"
                  aria-label="Search turfs"
                />
              </div>
              <div class="input-wrapper">
                <span class="input-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                </span>
                <input
                  type="text"
                  class="form-control has-icon-left"
                  placeholder="City"
                  [(ngModel)]="cityFilter"
                  style="height:48px;max-width:180px;"
                  aria-label="Filter by city"
                />
              </div>
              <button class="btn btn--primary" style="height:48px;padding:0 28px;font-size:1rem;" (click)="doSearch()">Search</button>
            </div>

            <!-- Sport type chips -->
            <div class="sport-filter-chips">
              <button
                class="sport-filter-chip"
                [class.active]="!selectedSport"
                (click)="setSport(null)"
              >All sports</button>
              @for (sport of allSports; track sport) {
                <button
                  class="sport-filter-chip"
                  [class.active]="selectedSport === sport"
                  (click)="setSport(sport)"
                >{{ sportLabel(sport) }}</button>
              }
            </div>
          </div>

          <!-- Results count -->
          @if (!loading() && !loadError()) {
            <p class="turf-results-count">
              {{ total() }} turf{{ total() !== 1 ? 's' : '' }} found
              @if (cityFilter.trim()) { in <strong>{{ cityFilter }}</strong> }
            </p>
          }

          <!-- Loading skeletons -->
          @if (loading()) {
            <div class="turf-grid">
              @for (i of [1,2,3,4,5,6]; track i) {
                <div class="turf-card turf-card--skeleton">
                  <div class="skeleton" style="height:200px;border-radius:12px 12px 0 0;"></div>
                  <div style="padding:16px;display:flex;flex-direction:column;gap:10px;">
                    <div class="skeleton skeleton--title"></div>
                    <div class="skeleton skeleton--text" style="width:60%;"></div>
                    <div class="skeleton skeleton--text" style="width:35%;"></div>
                  </div>
                </div>
              }
            </div>
          }

          <!-- Error -->
          @if (!loading() && loadError()) {
            <div class="alert alert--error" style="margin:24px 0;" role="alert">
              <svg class="alert__icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              Failed to load turfs.
              <button class="btn btn--link" style="font-size:inherit;" (click)="doSearch()">Try again</button>
            </div>
          }

          <!-- Empty -->
          @if (!loading() && !loadError() && turfs().length === 0) {
            <div class="empty-state" style="padding:80px 24px;">
              <svg class="empty-state__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <div class="empty-state__title">No turfs found</div>
              <p class="empty-state__description">Try a different city, sport or search term.</p>
              <button class="btn btn--ghost" style="margin-top:8px;" (click)="clearFilters()">Clear filters</button>
            </div>
          }

          <!-- Turf grid -->
          @if (!loading() && !loadError() && turfs().length > 0) {
            <div class="turf-grid">
              @for (turf of turfs(); track turf.id) {
                <a [routerLink]="['/turfs', turf.id]" class="turf-card" [attr.aria-label]="turf.name">
                  <div class="turf-card__image">
                    @if (turf.images.length > 0) {
                      <img [src]="turf.images[0]" [alt]="turf.name" loading="lazy"/>
                    } @else {
                      <div class="turf-card__image-placeholder">
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                      </div>
                    }
                    <div class="turf-card__sports">
                      @for (s of turf.sportTypes.slice(0,2); track s) {
                        <span class="turf-sport-chip">{{ sportLabel(s) }}</span>
                      }
                    </div>
                  </div>
                  <div class="turf-card__body">
                    <h3 class="turf-card__name">{{ turf.name }}</h3>
                    <p class="turf-card__location">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                      {{ turf.address.city }}{{ turf.address.state ? ', ' + turf.address.state : '' }}
                    </p>
                    <div class="turf-card__footer">
                      <div class="turf-card__price">
                        <span class="turf-card__price-amount">₹{{ turf.pricing.base }}</span>
                        <span class="turf-card__price-unit">/hr</span>
                      </div>
                      @if (turf.ratingCount > 0) {
                        <div class="turf-card__rating">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="#f59e0b" stroke="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                          {{ turf.ratingAvg.toFixed(1) }}
                          <span style="color:#9ca3af;">({{ turf.ratingCount }})</span>
                        </div>
                      }
                    </div>
                  </div>
                </a>
              }
            </div>

            <!-- Pagination -->
            @if (totalPages() > 1) {
              <div class="pagination">
                <button class="btn btn--ghost btn--sm" [disabled]="currentPage() <= 1" (click)="goToPage(currentPage() - 1)">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
                  Prev
                </button>
                <span class="pagination__info">Page {{ currentPage() }} of {{ totalPages() }}</span>
                <button class="btn btn--ghost btn--sm" [disabled]="currentPage() >= totalPages()" (click)="goToPage(currentPage() + 1)">
                  Next
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                </button>
              </div>
            }
          }

        </div>
      </main>
    </div>
  `,
  styles: [`
    .turf-search-hero {
      padding: 48px 0 32px;
      text-align: center;
    }
    .turf-search-hero__title {
      font-size: 2.5rem; font-weight: 800; color: #111827;
      letter-spacing: -0.03em; margin-bottom: 8px;
      @media (max-width: 640px) { font-size: 1.875rem; }
    }
    .turf-search-hero__sub {
      color: #6b7280; margin-bottom: 28px; font-size: 1.0625rem;
    }
    .turf-search-bar {
      display: flex; gap: 12px; max-width: 720px; margin: 0 auto 20px;
      flex-wrap: wrap;
      @media (max-width: 640px) { flex-direction: column; }
    }
    .sport-filter-chips {
      display: flex; gap: 8px; flex-wrap: wrap; justify-content: center; max-width: 800px; margin: 0 auto;
    }
    .sport-filter-chip {
      padding: 6px 16px; border-radius: 20px; font-size: 0.8125rem; font-weight: 500;
      border: 1.5px solid #d1d5db; background: white; color: #6b7280; cursor: pointer;
      transition: all 150ms ease; font-family: inherit;
      &:hover { border-color: #16a34a; color: #16a34a; }
      &.active { background: #16a34a; border-color: #16a34a; color: white; }
    }
    .turf-results-count { font-size: 0.875rem; color: #6b7280; margin-bottom: 20px; }

    /* Grid */
    .turf-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 24px;
      @media (max-width: 640px) { grid-template-columns: 1fr; }
    }
    .turf-card {
      background: white; border-radius: 16px; border: 1px solid #e5e7eb;
      box-shadow: 0 1px 3px rgb(0 0 0/.05); overflow: hidden;
      text-decoration: none; color: inherit; display: block;
      transition: box-shadow 200ms ease, transform 200ms ease;
      &:hover { box-shadow: 0 8px 24px rgb(0 0 0/.1); transform: translateY(-2px); }
    }
    .turf-card__image {
      position: relative; aspect-ratio: 16/9; overflow: hidden; background: #f3f4f6;
      img { width: 100%; height: 100%; object-fit: cover; display: block; transition: transform 300ms ease; }
      &:hover img { transform: scale(1.03); }
    }
    .turf-card__image-placeholder {
      width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;
    }
    .turf-card__sports {
      position: absolute; bottom: 10px; left: 10px; display: flex; gap: 6px;
    }
    .turf-sport-chip {
      background: rgba(0,0,0,.55); color: white; font-size: 0.6875rem; font-weight: 600;
      padding: 3px 10px; border-radius: 20px; backdrop-filter: blur(4px);
      text-transform: uppercase; letter-spacing: 0.04em;
    }
    .turf-card__body { padding: 16px; }
    .turf-card__name { font-size: 1rem; font-weight: 700; color: #111827; margin-bottom: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .turf-card__location { font-size: 0.8125rem; color: #6b7280; display: flex; align-items: center; gap: 4px; margin-bottom: 12px; }
    .turf-card__footer { display: flex; align-items: center; justify-content: space-between; }
    .turf-card__price { display: flex; align-items: baseline; gap: 2px; }
    .turf-card__price-amount { font-size: 1.125rem; font-weight: 800; color: #16a34a; }
    .turf-card__price-unit { font-size: 0.75rem; color: #9ca3af; }
    .turf-card__rating { display: flex; align-items: center; gap: 4px; font-size: 0.8125rem; font-weight: 600; color: #374151; }

    /* Pagination */
    .pagination { display: flex; align-items: center; justify-content: center; gap: 16px; margin-top: 40px; }
    .pagination__info { font-size: 0.875rem; color: #6b7280; }
  `],
})
export class TurfListComponent implements OnInit {
  private readonly turfService = inject(TurfService);

  readonly turfs      = signal<Turf[]>([]);
  readonly loading    = signal(true);
  readonly loadError  = signal(false);
  readonly total      = signal(0);
  readonly currentPage  = signal(1);
  readonly totalPages   = signal(1);

  searchQuery   = '';
  cityFilter    = '';
  selectedSport: SportType | null = null;

  readonly allSports: SportType[] = [
    'box_cricket', 'football_turf', 'badminton', 'basketball', 'tennis', 'cricket', 'other',
  ];

  ngOnInit(): void { this.doSearch(); }

  sportLabel(s: SportType): string { return SPORT_TYPE_LABELS[s]; }

  setSport(s: SportType | null): void {
    this.selectedSport = s;
    this.currentPage.set(1);
    this.doSearch();
  }

  clearFilters(): void {
    this.searchQuery = '';
    this.cityFilter = '';
    this.selectedSport = null;
    this.currentPage.set(1);
    this.doSearch();
  }

  doSearch(): void {
    this.loading.set(true);
    this.loadError.set(false);
    this.turfService.getPublicTurfs({
      search: this.searchQuery.trim() || undefined,
      city:   this.cityFilter.trim()  || undefined,
      sport:  this.selectedSport      || undefined,
      page:   this.currentPage(),
      limit:  12,
    }).subscribe({
      next: (data) => {
        this.turfs.set(data.turfs);
        this.total.set(data.total);
        this.totalPages.set(data.pages);
        this.loading.set(false);
      },
      error: () => { this.loadError.set(true); this.loading.set(false); },
    });
  }

  goToPage(p: number): void {
    this.currentPage.set(p);
    this.doSearch();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
