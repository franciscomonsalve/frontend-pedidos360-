import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { MsalService } from '@azure/msal-angular';
import { getApiRoles } from '../auth/roles.util';

/**
 * Guard funcional que exige que el usuario autenticado tenga al menos uno
 * de los roles requeridos por la ruta (definidos vía route.data['roles']).
 *
 * Los roles se leen del ACCESS TOKEN de la API (claim "roles"), porque los
 * App Roles están definidos/asignados en el App Registration del backend.
 *
 * `route.data['redirectTo']` permite elegir a dónde mandar al usuario sin
 * el rol requerido (por defecto `/unauthorized`); algunas rutas prefieren
 * volver directo al dashboard en vez de mostrar la pantalla de "sin acceso".
 */
export const roleGuard: CanActivateFn = async (route) => {
  const msalService = inject(MsalService);
  const router = inject(Router);

  const requiredRoles: string[] = route.data?.['roles'] ?? [];
  const redirectTo: string = route.data?.['redirectTo'] ?? '/unauthorized';
  const account = msalService.instance.getActiveAccount();

  if (!account) {
    router.navigate(['/login']);
    return false;
  }

  if (requiredRoles.length === 0) {
    return true; // ruta solo requiere estar autenticado
  }

  const userRoles = await getApiRoles(msalService);

  const hasRole = requiredRoles.some((role) => userRoles.includes(role));
  if (!hasRole) {
    // El backend habria respondido 401/403 igual; lo dejamos explicito en
    // consola para que quede claro por que se corto la navegacion.
    console.error(
      `401 Unauthorized: la cuenta activa no tiene ninguno de los roles requeridos [${requiredRoles.join(', ')}] para acceder a "${route.routeConfig?.path}".`
    );
    router.navigate([redirectTo]);
    return false;
  }

  return true;
};