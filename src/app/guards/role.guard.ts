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
 */
export const roleGuard: CanActivateFn = async (route) => {
  const msalService = inject(MsalService);
  const router = inject(Router);

  const requiredRoles: string[] = route.data?.['roles'] ?? [];
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
    router.navigate(['/unauthorized']);
    return false;
  }

  return true;
};