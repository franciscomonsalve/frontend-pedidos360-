import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuditEvent, AuditoriaService } from './auditoria.service';

/**
 * Panel de auditoria: linea de tiempo de eventos del sistema (quien / que /
 * cuando). Ruta protegida en app.routes.ts con roleGuard (roles: ['Admin'],
 * redirectTo: '/dashboard') ademas de la proteccion real en el backend
 * (BFF: /api/audit/** exige rol ADMIN).
 */
@Component({
  selector: 'app-auditoria',
  standalone: true,
  imports: [CommonModule],
  template: `
    <header class="page-header">
      <div>
        <h1 class="page-title">Auditoría</h1>
        <p class="page-subtitle">Línea de tiempo de eventos del sistema (solo Admin).</p>
      </div>
    </header>

    <p *ngIf="loading" class="muted">Cargando eventos...</p>
    <p *ngIf="errorMessage" class="alert">{{ errorMessage }}</p>

    <div class="card table-wrap" *ngIf="!loading && !errorMessage && events.length">
      <table class="table">
        <thead>
          <tr>
            <th scope="col">Fecha</th>
            <th scope="col">Evento</th>
            <th scope="col">Entidad</th>
            <th scope="col">Actor</th>
            <th scope="col">Origen</th>
            <th scope="col">Detalle</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let event of events">
            <td>{{ event.occurredAt | date:'short' }}</td>
            <td><span class="badge badge--role">{{ event.eventType }}</span></td>
            <td>{{ event.entityId }}</td>
            <td>{{ event.actor }}</td>
            <td>{{ event.sourceTopic }}</td>
            <td class="detail">{{ event.details }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="card empty-state" *ngIf="!loading && !errorMessage && !events.length">
      <p class="empty">Aún no hay eventos registrados.</p>
    </div>
  `,
  styles: [`
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

    .detail { white-space: normal; max-width: 360px; color: var(--text-muted); }

    .empty { margin: 0; padding: 2rem 1rem; text-align: center; color: var(--text-muted); }

    .empty-state { padding: 0; }
  `],
})
export class AuditoriaComponent implements OnInit {
  private readonly auditoriaService = inject(AuditoriaService);

  events: AuditEvent[] = [];
  loading = true;
  errorMessage = '';

  ngOnInit(): void {
    this.load();
  }

  private load(): void {
    this.loading = true;
    this.errorMessage = '';

    this.auditoriaService.findAll().subscribe({
      next: (data) => {
        this.events = data;
        this.loading = false;
      },
      error: (err) => {
        // Si el BFF responde 401/403, MSAL/HttpClient propagan el error aqui.
        this.errorMessage = err.status === 403
          ? 'No tienes permisos para ver la auditoría.'
          : 'No fue posible cargar los eventos de auditoría.';
        this.loading = false;
      },
    });
  }
}
