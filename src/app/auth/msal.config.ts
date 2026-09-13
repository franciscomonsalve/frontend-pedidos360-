import {
  IPublicClientApplication,
  PublicClientApplication,
  InteractionType,
  BrowserCacheLocation,
  LogLevel,
} from '@azure/msal-browser';
import {
  MsalGuardConfiguration,
  MsalInterceptorConfiguration,
} from '@azure/msal-angular';
import { environment } from '../../environments/environment';

/**
 * Instancia principal de MSAL. Se registra en app.config.ts mediante
 * MSAL_INSTANCE. Usa sessionStorage (recomendado por seguridad frente a
 * localStorage) y habilita el manejo automatico de la respuesta de redirect.
 */
export function MSALInstanceFactory(): IPublicClientApplication {
  return new PublicClientApplication({
    auth: {
      clientId: environment.azureAd.clientId,
      authority: environment.azureAd.authority,
      redirectUri: environment.azureAd.redirectUri,
      postLogoutRedirectUri: environment.azureAd.postLogoutRedirectUri,
      navigateToLoginRequestUrl: true,
    },
    cache: {
      cacheLocation: BrowserCacheLocation.SessionStorage,
      storeAuthStateInCookie: false,
    },
    system: {
      loggerOptions: {
        loggerCallback: (level, message, containsPii) => {
          if (containsPii) return;
          switch (level) {
            case LogLevel.Error:
              console.error(message);
              return;
            case LogLevel.Warning:
              console.warn(message);
              return;
            default:
              return; // silenciar Info/Verbose en consola
          }
        },
      },
    },
  });
}

/**
 * Configuracion del MsalGuard: protege rutas exigiendo login interactivo
 * mediante redirect (mas simple y compatible que popup en la mayoria de entornos).
 */
export function MSALGuardConfigFactory(): MsalGuardConfiguration {
  return {
    interactionType: InteractionType.Redirect,
    authRequest: {
      scopes: ['openid', 'profile', environment.apiScope],
    },
  };
}

/**
 * Configuracion del MsalInterceptor: adjunta automaticamente el header
 * Authorization: Bearer <access_token> a cada llamada HTTP dirigida al BFF.
 * Esto cumple el requisito "el frontend debe implementar el flujo de login
 * con IDaaS y utilizar el JWT en las llamadas al backend".
 */
export function MSALInterceptorConfigFactory(): MsalInterceptorConfiguration {
  const protectedResourceMap = new Map<string, Array<string> | null>();
  protectedResourceMap.set(`${environment.apiBaseUrl}/*`, [environment.apiScope]);

  return {
    interactionType: InteractionType.Redirect,
    protectedResourceMap,
  };
}
