import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from './core/services/auth.service';
import { ToastComponent } from './shared/components/toast/toast.component';
import { PageLoaderComponent } from './shared/components/page-loader/page-loader.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CommonModule, ToastComponent, PageLoaderComponent],
  template: `
    @if (authService.isLoading$ | async) {
      <app-page-loader />
    } @else {
      <router-outlet />
    }
    <app-toast />
  `,
  styles: [`
    :host { display: block; min-height: 100vh; }
  `],
})
export class AppComponent {
  readonly authService = inject(AuthService);
}
