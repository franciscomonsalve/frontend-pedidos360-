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
  return async () => {
    await msalInstance.initialize();

    // El redirect se procesa AQUI, no en AppComponent.
    //
    // POR QUE: AppComponent y el Router arrancan en paralelo. Si
    // handleRedirectPromise() vive en ngOnInit, el MsalGuard de la ruta
    // destino puede evaluar ANTES de que el hash de Microsoft este
    // procesado; entonces no ve ninguna cuenta y dispara un loginRedirect
    // nuevo. El resultado es un rebote a /auth/callback que a veces se
    // resuelve solo al segundo o tercer intento, segun quien gane la
    // carrera. Ademas MSAL no admite dos manejos de redirect simultaneos:
    // el segundo falla con interaction_in_progress.
    //
    // Dentro del APP_INITIALIZER, Angular no arranca el Router hasta que
    // esta promesa se resuelve, asi que cuando el primer guard corre la
    // cuenta ya existe y esta activa.
    const resultado = await msalInstance.handleRedirectPromise();

    const cuenta = resultado?.account ?? msalInstance.getAllAccounts()[0];
    if (cuenta) {
      msalInstance.setActiveAccount(cuenta);
    }
  };
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
