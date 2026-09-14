import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Order, OrderItem, OrdersService } from './orders.service';

@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <header class="page-header">
      <div>
        <h1 class="page-title">Pedidos</h1>
        <p class="page-subtitle">Consulta y crea pedidos del sistema.</p>
      </div>
      <button type="button" class="btn btn--primary" (click)="openCreate()">Nuevo pedido</button>
    </header>

    <div class="card filters">
      <div class="field filters__search">
        <label class="field__label" for="search">Buscar por cliente</label>
        <input
          id="search"
          class="input"
          type="search"
          placeholder="Ej. cliente-001"
          [(ngModel)]="search"
        />
      </div>

      <div class="field filters__status">
        <label class="field__label" for="statusFilter">Estado</label>
        <select id="statusFilter" class="select" [(ngModel)]="statusFilter">
          <option value="">Todos</option>
          <option *ngFor="let status of statuses" [value]="status">
            {{ statusLabel(status) }}
          </option>
        </select>
      </div>
    </div>

    <p *ngIf="loading" class="muted">Cargando pedidos...</p>
    <p *ngIf="errorMessage" class="alert">{{ errorMessage }}</p>

    <div class="card table-wrap" *ngIf="!loading && !errorMessage && orders.length">
      <table class="table">
        <thead>
          <tr>
            <th scope="col">ID</th>
            <th scope="col">Cliente</th>
            <th scope="col">Estado</th>
            <th scope="col" class="num">Ítems</th>
            <th scope="col" class="num">Total</th>
            <th scope="col">Fecha</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let order of filteredOrders">
            <td class="num">{{ order.id }}</td>
            <td>{{ order.customerId }}</td>
            <td><span [class]="statusClass(order.status)">{{ statusLabel(order.status) }}</span></td>
            <td class="num">{{ order.items.length }}</td>
            <td class="num">{{ order.totalAmount | currency:'CLP':'symbol-narrow':'1.0-0' }}</td>
            <td>{{ order.createdAt | date:'short' }}</td>
          </tr>
        </tbody>
      </table>

      <p class="empty" *ngIf="!filteredOrders.length">No hay pedidos que coincidan</p>
    </div>

    <div class="card empty-state" *ngIf="!loading && !errorMessage && !orders.length">
      <p class="empty">Aún no hay pedidos. Crea el primero.</p>
    </div>

    <div class="overlay" *ngIf="showCreate" (click)="closeCreate()">
      <div
        class="modal card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="createTitle"
        (click)="$event.stopPropagation()"
      >
        <h2 class="modal__title" id="createTitle">Nuevo pedido</h2>

        <form class="modal__body" (ngSubmit)="submitCreate()">
          <div class="field">
            <label class="field__label" for="customerId">Cliente</label>
            <input
              id="customerId"
              name="customerId"
              class="input"
              type="text"
              placeholder="Ej. cliente-001"
              [(ngModel)]="draft.customerId"
              required
            />
          </div>

          <div class="items">
            <div class="items__header">
              <span class="field__label">Ítems</span>
              <button type="button" class="btn btn--secondary" (click)="addItem()">
                Agregar ítem
              </button>
            </div>

            <div class="item" *ngFor="let item of draft.items; let i = index">
              <div class="field">
                <label class="field__label" [for]="'productId' + i">Producto (ID)</label>
                <input
                  [id]="'productId' + i"
                  [name]="'productId' + i"
                  class="input"
                  type="number"
                  min="1"
                  [(ngModel)]="item.productId"
                  required
                />
              </div>

              <div class="field item__name">
                <label class="field__label" [for]="'productName' + i">Nombre</label>
                <input
                  [id]="'productName' + i"
                  [name]="'productName' + i"
                  class="input"
                  type="text"
                  [(ngModel)]="item.productName"
                  required
                />
              </div>

              <div class="field">
                <label class="field__label" [for]="'quantity' + i">Cantidad</label>
                <input
                  [id]="'quantity' + i"
                  [name]="'quantity' + i"
                  class="input"
                  type="number"
                  min="1"
                  [(ngModel)]="item.quantity"
                  required
                />
              </div>

              <div class="field">
                <label class="field__label" [for]="'unitPrice' + i">Precio unitario</label>
                <input
                  [id]="'unitPrice' + i"
                  [name]="'unitPrice' + i"
                  class="input"
                  type="number"
                  min="0"
                  [(ngModel)]="item.unitPrice"
                  required
                />
              </div>

              <button
                type="button"
                class="btn btn--link item__remove"
                [attr.aria-label]="'Quitar ítem ' + (i + 1)"
                (click)="removeItem(i)"
              >
                Quitar
              </button>
            </div>

            <p class="muted" *ngIf="!draft.items.length">Agrega al menos un ítem.</p>
          </div>

          <p class="alert" *ngIf="createError">{{ createError }}</p>

          <div class="modal__actions">
            <button type="button" class="btn btn--secondary" (click)="closeCreate()">
              Cancelar
            </button>
            <button type="submit" class="btn btn--primary" [disabled]="saving">
              {{ saving ? 'Guardando...' : 'Guardar pedido' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .filters {
      display: flex;
      flex-wrap: wrap;
      gap: 1rem;
      padding: 1rem 1.25rem;
      margin-bottom: 1.25rem;
    }

    .filters__search { flex: 1 1 260px; }

    .filters__status { flex: 0 1 200px; }

    .table-wrap { overflow-x: auto; }

    .table {
      width: 100%;
      border-collapse: collapse;
      font-variant-numeric: tabular-nums;
    }

    .table th,
    .table td {
      padding: 0.7rem 1rem;
      text-align: left;
      border-bottom: 1px solid var(--border);
      white-space: nowrap;
    }

    .table th {
      font-size: 0.85rem;
      font-weight: 500;
      color: var(--text-muted);
      background: #FAFBFC;
    }

    .table tbody tr:last-child td { border-bottom: none; }

    .table tbody tr:hover { background: #F8FAFC; }

    .table .num { text-align: right; }

    .table th.num { text-align: right; }

    .empty { margin: 0; padding: 2rem 1rem; text-align: center; color: var(--text-muted); }

    .empty-state { padding: 0; }

    .overlay {
      position: fixed;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1.5rem;
      background: rgba(15, 45, 74, 0.45);
      z-index: 50;
    }

    .modal {
      width: min(720px, 100%);
      max-height: 85vh;
      overflow-y: auto;
      padding: 1.5rem;
      box-shadow: var(--shadow-modal);
    }

    .modal__title { font-size: 1.15rem; margin-bottom: 1.25rem; }

    .modal__body { display: flex; flex-direction: column; gap: 1.25rem; }

    .items { display: flex; flex-direction: column; gap: 0.85rem; }

    .items__header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
    }

    .item {
      display: grid;
      grid-template-columns: 110px 1fr 100px 140px auto;
      align-items: end;
      gap: 0.75rem;
      padding: 0.85rem;
      border: 1px solid var(--border);
      border-radius: var(--radius-card);
      background: var(--bg);
    }

    .item__name { min-width: 0; }

    .item__remove { justify-self: start; margin-bottom: 0.35rem; }

    .modal__actions { display: flex; justify-content: flex-end; gap: 0.6rem; }

    @media (max-width: 700px) {
      .item { grid-template-columns: 1fr 1fr; }
    }
  `],
})
export class OrdersComponent implements OnInit {
  private readonly ordersService = inject(OrdersService);

  readonly statuses = [
    'CREADO',
    'ACEPTADO',
    'EN_PREPARACION',
    'DESPACHADO',
    'ENTREGADO',
    'CANCELADO',
  ];

  private readonly statusLabels: Record<string, string> = {
    CREADO: 'Creado',
    ACEPTADO: 'Aceptado',
    EN_PREPARACION: 'En preparación',
    DESPACHADO: 'Despachado',
    ENTREGADO: 'Entregado',
    CANCELADO: 'Cancelado',
  };

  orders: Order[] = [];
  loading = true;
  errorMessage = '';

  search = '';
  statusFilter = '';

  showCreate = false;
  saving = false;
  createError = '';
  draft: { customerId: string; items: OrderItem[] } = { customerId: '', items: [] };

  ngOnInit(): void {
    this.load();
  }

  private load(): void {
    this.loading = true;
    this.errorMessage = '';

    this.ordersService.findAll().subscribe({
      next: (data) => {
        this.orders = data;
        this.loading = false;
      },
      error: (err) => {
        // Si el BFF responde 401/403, MSAL/HttpClient propagan el error aqui
        this.errorMessage = err.status === 403
          ? 'No tienes permisos para ver los pedidos.'
          : 'No fue posible cargar los pedidos.';
        this.loading = false;
      },
    });
  }

  get filteredOrders(): Order[] {
    const term = this.search.trim().toLowerCase();

    return this.orders.filter((order) => {
      const matchesTerm = !term || (order.customerId ?? '').toLowerCase().includes(term);
      const matchesStatus = !this.statusFilter || order.status === this.statusFilter;
      return matchesTerm && matchesStatus;
    });
  }

  statusLabel(status: string): string {
    return this.statusLabels[status] ?? status;
  }

  statusClass(status: string): string {
    return `badge badge--${(status ?? '').toLowerCase()}`;
  }

  openCreate(): void {
    this.draft = { customerId: '', items: [] };
    this.addItem();
    this.createError = '';
    this.showCreate = true;
  }

  closeCreate(): void {
    this.showCreate = false;
    this.saving = false;
  }

  addItem(): void {
    this.draft.items.push({ productId: 1, productName: '', quantity: 1, unitPrice: 0 });
  }

  removeItem(index: number): void {
    this.draft.items.splice(index, 1);
  }

  submitCreate(): void {
    if (!this.draft.customerId.trim()) {
      this.createError = 'Indica el cliente del pedido.';
      return;
    }

    if (!this.draft.items.length) {
      this.createError = 'Agrega al menos un ítem al pedido.';
      return;
    }

    this.saving = true;
    this.createError = '';

    this.ordersService.create({
      customerId: this.draft.customerId.trim(),
      items: this.draft.items.map((item) => ({
        productId: Number(item.productId),
        productName: item.productName.trim(),
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
      })),
    }).subscribe({
      next: () => {
        this.saving = false;
        this.showCreate = false;
        this.load();
      },
      error: (err) => {
        this.saving = false;
        this.createError = err.status === 403
          ? 'No tienes permisos para crear pedidos.'
          : 'No fue posible crear el pedido. Revisa los datos e inténtalo de nuevo.';
      },
    });
  }
}
