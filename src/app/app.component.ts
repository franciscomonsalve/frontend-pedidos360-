import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink } from '@angular/router';
import { MsalService, MsalBroadcastService } from '@azure/msal-angular';
import { InteractionStatus } from '@azure/msal-browser';
import { Subject } from 'rxjs';
import { filter, takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink],
  template: `
    <header class="topbar" *ngIf="isLoggedIn">
      <nav>
        <a routerLink="/dashboard">Dashboard</a>
        <a routerLink="/orders">Pedidos</a>
      </nav>
      <div class="user">
        <span>{{ userName }}</span>
        <button (click)="logout()">Cerrar sesion</button>
      </div>
    </header>
    <main>
      <router-outlet></router-outlet>
    </main>
  `,
  styles: [`
    .topbar { display: flex; justify-content: space-between; align-items: center;
      padding: 0.75rem 1.5rem; background: #1f4e79; color: white; }
    .topbar nav a { color: white; margin-right: 1rem; text-decoration: none; }
    .user { display: flex; align-items: center; gap: 0.75rem; }
    .user button { background: transparent; border: 1px solid white; color: white;
      padding: 0.25rem 0.75rem; border-radius: 4px; cursor: pointer; }
    main { padding: 1.5rem; }
  `],
})
export class AppComponent implements OnInit, OnDestroy {
  private readonly msalService = inject(MsalService);
  private readonly msalBroadcastService = inject(MsalBroadcastService);
  private readonly destroy$ = new Subject<void>();

  isLoggedIn = false;
  userName = '';

  async ngOnInit(): Promise<void> {
    // MSAL v3 exige inicializar la instancia antes de cualquier llamada.
    await this.msalService.instance.initialize();

    // Procesa la respuesta del redirect de Microsoft (si venimos de un login).
    const result = await this.msalService.instance.handleRedirectPromise();
    if (result?.account) {
      this.msalService.instance.setActiveAccount(result.account);
    }

    this.msalBroadcastService.inProgress$
      .pipe(
        filter((status) => status === InteractionStatus.None),
        takeUntil(this.destroy$)
      )
      .subscribe(() => this.updateAccountState());

    this.updateAccountState();
  }

  private updateAccountState(): void {
    const accounts = this.msalService.instance.getAllAccounts();
    if (accounts.length > 0) {
      this.msalService.instance.setActiveAccount(accounts[0]);
      this.isLoggedIn = true;
      this.userName = accounts[0].name ?? accounts[0].username;
    } else {
      this.isLoggedIn = false;
    }
  }

  logout(): void {
    this.msalService.logoutRedirect();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
