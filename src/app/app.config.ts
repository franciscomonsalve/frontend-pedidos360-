import { APP_INITIALIZER, ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { HTTP_INTERCEPTORS } from '@angular/common/http';
import {
  MSAL_INSTANCE,
  MSAL_GUARD_CONFIG,
  MSAL_INTERCEPTOR_CONFIG,
  MsalService,
  MsalGuard,
  MsalBroadcastService,
  MsalInterceptor,
  MsalModule,
} from '@azure/msal-angular';
import { IPublicClientApplication } from '@azure/msal-browser';
import { importProvidersFrom } from '@angular/core';

import { routes } from './app.routes';
import {
  MSALInstanceFactory,
  MSALGuardConfigFactory,
  MSALInterceptorConfigFactory,
} from './auth/msal.config';

/**
 * Sin esto, `msalInstance.initialize()` solo corria dentro de
 * AppComponent.ngOnInit, compitiendo contra la navegacion inicial del
 * Router: en una recarga dura de una ruta protegida (ej. /orders), los
 * guards podian evaluar ANTES de que MSAL terminara de inicializarse ->
 * acquireTokenSilent fallaba -> getApiRoles caia al fallback del ID token
 * (sin claim "roles") -> redirect incorrecto a /unauthorized. Al bloquear
 * el bootstrap de Angular con APP_INITIALIZER, ningun guard ni componente
 * corre hasta que MSAL este listo.
 */
export function initializeMsal(msalInstance: IPublicClientApplication): () => Promise<void> {
  return () => msalInstance.initialize();
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(withInterceptorsFromDi()),
    importProvidersFrom(MsalModule),

    { provide: MSAL_INSTANCE, useFactory: MSALInstanceFactory },
    { provide: MSAL_GUARD_CONFIG, useFactory: MSALGuardConfigFactory },
    { provide: MSAL_INTERCEPTOR_CONFIG, useFactory: MSALInterceptorConfigFactory },
    {
      provide: APP_INITIALIZER,
      useFactory: initializeMsal,
      deps: [MSAL_INSTANCE],
      multi: true,
    },

    // Adjunta el access token automaticamente a las llamadas HTTP protegidas
    { provide: HTTP_INTERCEPTORS, useClass: MsalInterceptor, multi: true },

    MsalService,
    MsalGuard,
    MsalBroadcastService,
  ],
};
