import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { MsalService, MsalBroadcastService } from '@azure/msal-angular';
import { InteractionStatus } from '@azure/msal-browser';
import { Subject } from 'rxjs';
import { filter, takeUntil } from 'rxjs/operators';
import { getApiRoles } from './auth/roles.util';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="shell" [class.shell--bare]="!isLoggedIn">
      <aside class="sidebar" *ngIf="isLoggedIn">
        <div class="sidebar__brand">Pedidos360</div>

        <nav class="sidebar__nav" aria-label="Navegación principal">
          <a routerLink="/dashboard" routerLinkActive="is-active">Panel</a>
          <a routerLink="/orders" routerLinkActive="is-active">Pedidos</a>
          <a *ngIf="isAdmin" routerLink="/auditoria" routerLinkActive="is-active">Auditoría</a>
        </nav>

        <div class="sidebar__footer">
          <span class="sidebar__user" [title]="userName">{{ userName }}</span>
          <button type="button" class="sidebar__logout" (click)="logout()">
            Cerrar sesión
          </button>
        </div>
      </aside>

      <main class="content">
        <router-outlet></router-outlet>
      </main>
    </div>
  `,
  styles: [`
    .shell { display: flex; min-height: 100vh; align-items: stretch; }

    .sidebar {
      display: flex;
      flex-direction: column;
      flex: 0 0 240px;
      padding: 1.5rem 1rem;
      background: var(--sidebar);
      color: #E2E8F0;
    }

    .sidebar__brand {
      padding: 0 0.6rem;
      margin-bottom: 2rem;
      font-size: 1.15rem;
      font-weight: 600;
      color: #FFFFFF;
      letter-spacing: -0.01em;
    }

    .sidebar__nav { display: flex; flex-direction: column; gap: 0.25rem; }

    .sidebar__nav a {
      padding: 0.55rem 0.6rem;
      border-radius: var(--radius-control);
      color: #CBD5E1;
      text-decoration: none;
      font-weight: 500;
      transition: background-color 0.15s ease, color 0.15s ease;
    }

    .sidebar__nav a:hover { background: rgba(255, 255, 255, 0.08); color: #FFFFFF; }

    .sidebar__nav a.is-active { background: var(--accent); color: #FFFFFF; }

    .sidebar__footer {
      display: flex;
      flex-direction: column;
      gap: 0.6rem;
      margin-top: auto;
      padding-top: 1.25rem;
      border-top: 1px solid rgba(255, 255, 255, 0.12);
    }

    .sidebar__user {
      padding: 0 0.6rem;
      font-size: 0.9rem;
      color: #CBD5E1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .sidebar__logout {
      padding: 0.45rem 0.6rem;
      border: 1px solid rgba(255, 255, 255, 0.25);
      border-radius: var(--radius-control);
      background: transparent;
      color: #E2E8F0;
      font-weight: 500;
      cursor: pointer;
      transition: background-color 0.15s ease;
    }

    .sidebar__logout:hover { background: rgba(255, 255, 255, 0.1); }

    .content { flex: 1 1 auto; min-width: 0; padding: 2rem; }

    .shell--bare .content { padding: 0; }

    @media (max-width: 900px) {
      .shell { flex-direction: column; }

      .sidebar {
        flex: 0 0 auto;
        flex-direction: row;
        flex-wrap: wrap;
        align-items: center;
        gap: 0.75rem 1rem;
        padding: 0.85rem 1rem;
      }

      .sidebar__brand { margin: 0; padding: 0; }

      .sidebar__nav { flex-direction: row; flex: 1 1 auto; }

      .sidebar__footer {
        flex-direction: row;
        align-items: center;
        gap: 0.75rem;
        margin: 0;
        padding: 0;
        border-top: none;
      }

      .sidebar__user { max-width: 40vw; padding: 0; }

      .content { padding: 1.25rem 1rem; }
    }
  `],
})
export class AppComponent implements OnInit, OnDestroy {
  private readonly msalService = inject(MsalService);
  private readonly msalBroadcastService = inject(MsalBroadcastService);
  private readonly destroy$ = new Subject<void>();

  isLoggedIn = false;
  userName = '';
  isAdmin = false;

  async ngOnInit(): Promise<void> {
    // La inicializacion de MSAL ya la garantiza el APP_INITIALIZER en
    // app.config.ts (corre antes de que el Router y los guards evaluen la
    // navegacion inicial), asi que aca solo falta procesar el redirect.

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

  private async updateAccountState(): Promise<void> {
    const accounts = this.msalService.instance.getAllAccounts();
    if (accounts.length > 0) {
      this.msalService.instance.setActiveAccount(accounts[0]);
      this.isLoggedIn = true;
      this.userName = accounts[0].name ?? accounts[0].username;
      const roles = await getApiRoles(this.msalService);
      this.isAdmin = roles.includes('Admin');
    } else {
      this.isLoggedIn = false;
      this.isAdmin = false;
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
