import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface OrderItem {
  productId: number;
  productName: string;
  quantity: number;
  unitPrice: number;
}

export interface Order {
  id: number;
  customerId: string;
  status: string;
  totalAmount: number;
  createdAt: string;
  items: OrderItem[];
}

/**
 * Consume el BFF (ms-pedidos360-bff). No es necesario adjuntar el header
 * Authorization manualmente: el MsalInterceptor lo hace automaticamente
 * para toda URL que calce con el protectedResourceMap configurado en
 * MSALInterceptorConfigFactory.
 */
@Injectable({ providedIn: 'root' })
export class OrdersService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/orders`;

  findAll(): Observable<Order[]> {
    return this.http.get<Order[]>(this.baseUrl);
  }

  findById(id: number): Observable<Order> {
    return this.http.get<Order>(`${this.baseUrl}/${id}`);
  }

  changeStatus(id: number, status: string): Observable<Order> {
    return this.http.patch<Order>(`${this.baseUrl}/${id}/status`, { status });
  }
}
