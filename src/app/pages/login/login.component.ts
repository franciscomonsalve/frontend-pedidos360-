import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MsalService } from '@azure/msal-angular';

/**
 * Pantalla de login (ruta publica /login) y punto de retorno de MSAL
 * (ruta /auth/callback). Implementa el flujo de autenticacion con Azure AD:
 *  - Si ya hay una cuenta activa, redirige directo al dashboard.
 *  - Si no, muestra el boton "Iniciar sesion con Microsoft" que dispara
 *    loginRedirect() con los scopes configurados en MSALGuardConfigFactory.
 */
@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="login-container">
      <div class="login-card">
        <h1>Pedidos360</h1>
        <p>Ingresa con tu cuenta corporativa para continuar.</p>
        <button class="ms-button" (click)="login()">
          Iniciar sesión con Microsoft
        </button>
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
  `],
})
export class LoginComponent implements OnInit {
  private readonly msalService = inject(MsalService);
  private readonly router = inject(Router);

  ngOnInit(): void {
    // Si MSAL ya resolvio una cuenta activa (ej. venimos del redirect de /auth/callback),
    // no mostramos el boton: navegamos directo al dashboard.
    const accounts = this.msalService.instance.getAllAccounts();
    if (accounts.length > 0) {
      this.msalService.instance.setActiveAccount(accounts[0]);
      this.router.navigate(['/dashboard']);
    }
  }

  login(): void {
    this.msalService.loginRedirect();
  }
}
