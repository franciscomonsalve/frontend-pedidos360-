import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';

/** Datos que el formulario "Crear cuenta" envia al BFF. */
export interface CreateUserRequest {
  displayName: string;
  mailNickname: string;
  password: string;
  role?: string;
  recoveryEmail?: string;
}

/** Respuesta del BFF tras crear el usuario en Entra ID. */
export interface CreateUserResponse {
  id: string;
  userPrincipalName: string;
  displayName: string;
  assignedRole: string;
  roleAssigned: boolean;
  message: string;
}

/**
 * Alta de usuarios contra el BFF, que a su vez los crea en Entra ID via
 * Microsoft Graph. Es un endpoint publico (el usuario aun no tiene sesion),
 * por eso esta excluido del MsalInterceptor en msal.config.ts.
 */
@Injectable({ providedIn: 'root' })
export class RegisterService {
  private readonly http = inject(HttpClient);

  register(payload: CreateUserRequest): Observable<CreateUserResponse> {
    return this.http
      .post<CreateUserResponse>(`${environment.apiBaseUrl}/users/register`, payload)
      .pipe(catchError((err: HttpErrorResponse) => throwError(() => new Error(this.toMessage(err)))));
  }

  /** Extrae el {"error": "..."} que devuelve ApiExceptionHandler del BFF. */
  private toMessage(err: HttpErrorResponse): string {
    if (err.error?.error) {
      return err.error.error;
    }
    if (err.status === 0) {
      return 'No se pudo contactar al servidor. Verifica que el BFF este arriba.';
    }
    return `Error ${err.status}: no se pudo crear el usuario.`;
  }
}
