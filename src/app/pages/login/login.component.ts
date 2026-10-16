import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { MsalService, MsalBroadcastService } from '@azure/msal-angular';
import { InteractionStatus } from '@azure/msal-browser';
import { Subject } from 'rxjs';
import { filter, takeUntil } from 'rxjs/operators';

/**
 * Pantalla de login (ruta publica /login) y punto de retorno de MSAL
 * (ruta /auth/callback). Implementa el flujo de autenticacion con Azure AD:
 *  - Si ya hay una cuenta activa, redirige directo al dashboard. La comprobacion
 *    espera a que MSAL termine (inProgress$ === None): el retorno del redirect de
 *    Microsoft es asincrono, asi que mirar getAllAccounts() una sola vez en ngOnInit
 *    devuelve vacio y la pantalla de login se queda pegada aunque el login haya
 *    funcionado. Mismo patron que AppComponent.
 *  - Si no, muestra el boton "Iniciar sesion con Microsoft" que dispara
 *    loginRedirect() con los scopes configurados en MSALGuardConfigFactory.
 */
@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="login-container">
      <div class="login-card">
        <h1>Pedidos360</h1>
        <p>Ingresa con tu cuenta corporativa para continuar.</p>
        <button class="ms-button" (click)="login()">
          Iniciar sesión con Microsoft
        </button>

        <div class="divider"><span>o</span></div>

        <button class="create-button" type="button" routerLink="/register">
          Crear cuenta
        </button>
        <p class="hint">Se crea directamente en Entra ID (Azure AD).</p>
      </div>
    </div>
  `,
  styles: [`
    .login-container { display: flex; justify-content: center; align-items: center;
      height: 80vh; }
    .login-card { text-align: center; padding: 2rem 3rem; border: 1px solid #ddd;
      border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
    .ms-button { background: #2f2f2f; color: white; border: none; padding: 0.75rem 1.5rem;
      border-radius: 4px; cursor: pointer; font-size: 1rem; margin-top: 1rem; }
    .ms-button:hover { background: #1f1f1f; }
    .divider { display: flex; align-items: center; gap: 0.75rem; margin: 1.25rem 0 0.75rem;
      color: #999; font-size: 0.8rem; }
    .divider::before, .divider::after { content: ""; flex: 1; height: 1px; background: #e0e0e0; }
    .create-button { background: white; color: #2f2f2f; border: 1px solid #2f2f2f;
      padding: 0.7rem 1.5rem; border-radius: 4px; cursor: pointer; font-size: 0.95rem;
      width: 100%; }
    .create-button:hover { background: #f4f4f4; }
    .hint { color: #777; font-size: 0.78rem; margin: 0.5rem 0 0; }
  `],
})
export class LoginComponent implements OnInit, OnDestroy {
  private readonly msalService = inject(MsalService);
  private readonly msalBroadcastService = inject(MsalBroadcastService);
  private readonly router = inject(Router);
  private readonly destroy$ = new Subject<void>();

  ngOnInit(): void {
    // AppComponent ya hace el handleRedirectPromise(); aca basta con esperar a que
    // MSAL no tenga ninguna interaccion en curso para leer las cuentas.
    this.msalBroadcastService.inProgress$
      .pipe(
        filter((status) => status === InteractionStatus.None),
        takeUntil(this.destroy$)
      )
      .subscribe(() => this.redirigirSiHayCuenta());

    // Caso sin redirect de por medio: el usuario ya logueado entra a /login a mano.
    this.redirigirSiHayCuenta();
  }

  private redirigirSiHayCuenta(): void {
    const accounts = this.msalService.instance.getAllAccounts();
    if (accounts.length > 0) {
      this.msalService.instance.setActiveAccount(accounts[0]);
      this.router.navigate(['/dashboard']);
    }
  }

  login(): void {
    this.msalService.loginRedirect();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
