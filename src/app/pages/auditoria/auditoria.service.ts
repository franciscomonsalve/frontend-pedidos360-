import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

/** Coincide con AuditEvent del ms-pedidos360-audit. */
export interface AuditEvent {
  id: number;
  eventId: string;
  eventType: string;
  entityId: string;
  actor: string;
  sourceTopic: string;
  occurredAt: string;
  details: string;
}

/**
 * Consume el BFF (ms-pedidos360-bff), que a su vez reenvia a ms-pedidos360-audit.
 * Solo Admin puede acceder: reforzado en el backend
 * (SecurityConfig: /api/audit/** -> hasRole("ADMIN")) y en el frontend
 * (roleGuard sobre la ruta /auditoria).
 */
@Injectable({ providedIn: 'root' })
export class AuditoriaService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/audit`;

  findAll(): Observable<AuditEvent[]> {
    return this.http.get<AuditEvent[]>(this.baseUrl);
  }
}
