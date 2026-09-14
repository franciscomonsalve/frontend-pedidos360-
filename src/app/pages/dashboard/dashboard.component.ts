import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MsalService } from '@azure/msal-angular';
import { getApiRoles } from '../../auth/roles.util';
import { OrdersService } from '../orders/orders.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <header class="page-header">
      <div>
        <h1 class="page-title">Panel</h1>
        <p class="page-subtitle">Hola, {{ userName || 'bienvenido' }}. Este es el resumen de tus pedidos.</p>
      </div>
    </header>

    <section class="metrics" aria-label="Métricas de pedidos">
      <article class="card metric">
        <span class="metric__value">{{ totalOrders }}</span>
        <span class="metric__label">Pedidos totales</span>
      </article>

      <article class="card metric">
        <span class="metric__value metric__value--preparacion">{{ inPreparation }}</span>
        <span class="metric__label">En preparación</span>
      </article>

      <article class="card metric">
        <span class="metric__value metric__value--entregado">{{ delivered }}</span>
        <span class="metric__label">Entregados</span>
      </article>

      <article class="card metric">
        <span class="metric__value">{{ totalAmount | currency:'CLP':'symbol-narrow':'1.0-0' }}</span>
        <span class="metric__label">Monto total</span>
      </article>
    </section>

    <section class="card roles">
      <h2 class="roles__title">Tus roles</h2>
      <div class="roles__list" *ngIf="roles.length; else noRoles">
        <span class="badge badge--role" *ngFor="let role of roles">{{ role }}</span>
      </div>
      <ng-template #noRoles>
        <p class="muted roles__empty">Sin roles asignados.</p>
      </ng-template>
    </section>
  `,
  styles: [`
    .metrics {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
      margin-bottom: 1.5rem;
    }

    .metric { display: flex; flex-direction: column; gap: 0.35rem; padding: 1.25rem; }

    .metric__value {
      font-size: 1.9rem;
      font-weight: 600;
      font-variant-numeric: tabular-nums;
      letter-spacing: -0.02em;
    }

    .metric__value--preparacion { color: var(--status-en-preparacion); }

    .metric__value--entregado { color: var(--status-entregado); }

    .metric__label { color: var(--text-muted); font-size: 0.9rem; }

    .roles { padding: 1.25rem; }

    .roles__title { font-size: 1rem; margin-bottom: 0.75rem; }

    .roles__list { display: flex; flex-wrap: wrap; gap: 0.5rem; }

    .roles__empty { margin: 0; }
  `],
})
export class DashboardComponent implements OnInit {
  private readonly msalService = inject(MsalService);
  private readonly ordersService = inject(OrdersService);

  userName = '';
  roles: string[] = [];

  totalOrders = 0;
  inPreparation = 0;
  delivered = 0;
  totalAmount = 0;

  async ngOnInit(): Promise<void> {
    const account = this.msalService.instance.getActiveAccount();
    if (account) {
      this.userName = account.name ?? account.username;
      // Los roles se leen del access token de la API (no del ID token).
      this.roles = await getApiRoles(this.msalService);
    }

    this.loadMetrics();
  }

  private loadMetrics(): void {
    this.ordersService.findAll().subscribe({
      next: (orders) => {
        this.totalOrders = orders.length;
        this.inPreparation = orders.filter((o) => o.status === 'EN_PREPARACION').length;
        this.delivered = orders.filter((o) => o.status === 'ENTREGADO').length;
        this.totalAmount = orders.reduce((sum, o) => sum + (o.totalAmount ?? 0), 0);
      },
      // Si el usuario no tiene permisos o el BFF falla, el panel se muestra en cero.
      error: () => {
        this.totalOrders = 0;
        this.inPreparation = 0;
        this.delivered = 0;
        this.totalAmount = 0;
      },
    });
  }
}
