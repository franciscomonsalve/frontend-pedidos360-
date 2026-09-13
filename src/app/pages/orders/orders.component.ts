import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Order, OrdersService } from './orders.service';

@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [CommonModule],
  template: `
    <h2>Gestión de pedidos</h2>

    <p *ngIf="loading">Cargando pedidos...</p>
    <p *ngIf="errorMessage" class="error">{{ errorMessage }}</p>

    <table *ngIf="!loading && orders.length" class="orders-table">
      <thead>
        <tr>
          <th>ID</th>
          <th>Cliente</th>
          <th>Estado</th>
          <th>Total</th>
        </tr>
      </thead>
      <tbody>
        <tr *ngFor="let order of orders">
          <td>{{ order.id }}</td>
          <td>{{ order.customerId }}</td>
          <td><span class="badge">{{ order.status }}</span></td>
          <td>{{ order.totalAmount | number: '1.0-0' }}</td>
        </tr>
      </tbody>
    </table>

    <p *ngIf="!loading && !orders.length && !errorMessage">No hay pedidos para mostrar.</p>
  `,
  styles: [`
    .orders-table { width: 100%; border-collapse: collapse; margin-top: 1rem; }
    .orders-table th, .orders-table td { border: 1px solid #ddd; padding: 0.5rem 0.75rem; text-align: left; }
    .orders-table th { background: #f2f2f2; }
    .badge { background: #dce6f1; padding: 0.15rem 0.5rem; border-radius: 4px; font-size: 0.85rem; }
    .error { color: #b00020; }
  `],
})
export class OrdersComponent implements OnInit {
  private readonly ordersService = inject(OrdersService);

  orders: Order[] = [];
  loading = true;
  errorMessage = '';

  ngOnInit(): void {
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
}
