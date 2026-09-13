import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { MsalService } from '@azure/msal-angular';

/**
 * Guard funcional que exige que el usuario autenticado tenga al menos uno
 * de los roles requeridos por la ruta (definidos via route.data['roles']).
 * Los roles llegan en el claim "roles" del ID token / access token,
 * configurados como App Roles en el App Registration de Azure AD.
 */
export const roleGuard: CanActivateFn = (route) => {
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

  const idTokenClaims = account.idTokenClaims as { roles?: string[] } | undefined;
  const userRoles = idTokenClaims?.roles ?? [];

  const hasRole = requiredRoles.some((role) => userRoles.includes(role));
  if (!hasRole) {
    router.navigate(['/unauthorized']);
    return false;
  }

  return true;
};
