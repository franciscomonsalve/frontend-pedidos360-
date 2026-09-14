import { MsalService } from '@azure/msal-angular';
import { environment } from '../../environments/environment';

/**
 * Obtiene los roles del usuario autenticado leyéndolos del ACCESS TOKEN
 * emitido para la API (aud = api://<backend>), NO del ID token.
 *
 * Motivo: los App Roles (Admin/Operator/Customer) están definidos y asignados
 * en el App Registration del BACKEND. Esos roles viajan en el access token cuyo
 * audience es la API, no en el ID token del SPA. Por eso hay que pedir el token
 * de la API y decodificar su claim "roles".
 *
 * Usa acquireTokenSilent: como el login ya solicita environment.apiScope
 * (ver MSALGuardConfigFactory), el token está en caché y la llamada es inmediata.
 */
export async function getApiRoles(msal: MsalService): Promise<string[]> {
  const account =
    msal.instance.getActiveAccount() ?? msal.instance.getAllAccounts()[0];

  if (!account) {
    return [];
  }

  try {
    const result = await msal.instance.acquireTokenSilent({
      scopes: [environment.apiScope],
      account,
    });
    return rolesFromJwt(result.accessToken);
  } catch {
    // Fallback: si no se pudo obtener el access token en silencio,
    // intenta leerlos del ID token (por si en el futuro se definen ahí).
    const claims = account.idTokenClaims as { roles?: string[] } | undefined;
    return claims?.roles ?? [];
  }
}

/** Decodifica el payload de un JWT y devuelve su claim "roles" (o []). */
function rolesFromJwt(token: string): string[] {
  try {
    const payload = token.split('.')[1];
    const json = JSON.parse(decodeBase64Url(payload));
    return Array.isArray(json.roles) ? json.roles : [];
  } catch {
    return [];
  }
}

/** base64url -> string (agrega padding y convierte los caracteres URL-safe). */
function decodeBase64Url(input: string): string {
  let base64 = input.replace(/-/g, '+').replace(/_/g, '/');
  const pad = base64.length % 4;
  if (pad) {
    base64 += '='.repeat(4 - pad);
  }
  return atob(base64);
}