import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { environment } from '../../../environments/environment';
import { CreateUserResponse, RegisterService } from './register.service';

/**
 * Formulario de alta de cuenta (ruta publica /register), al que se llega desde
 * el boton "Crear cuenta" del login. Envia los datos al BFF, que crea al usuario
 * en Entra ID (Azure AD) via Microsoft Graph y le asigna su App Role.
 *
 * El usuario creado queda con forceChangePasswordNextSignIn = true, asi que en
 * su primer "Iniciar sesion con Microsoft" Azure le pedira cambiar la clave.
 */
@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="register-container">
      <form class="register-card" [formGroup]="form" (ngSubmit)="submit()">
        <h1>Crear cuenta</h1>
        <p class="subtitle">La cuenta se crea directamente en Entra ID (Azure AD).</p>

        <label>
          Nombre completo
          <input type="text" formControlName="displayName" autocomplete="name" placeholder="Ana Pérez" />
        </label>
        <small class="error" *ngIf="showError('displayName')">Ingresa tu nombre completo.</small>

        <label>
          Usuario
          <span class="upn-row">
            <input type="text" formControlName="mailNickname" autocomplete="username" placeholder="ana.perez" />
            <span class="domain">&#64;{{ domain }}</span>
          </span>
        </label>
        <small class="error" *ngIf="showError('mailNickname')">
          Solo letras, números, punto, guion y guion bajo (mínimo 3 caracteres).
        </small>

        <label>
          Correo de recuperación (opcional)
          <input type="email" formControlName="recoveryEmail" autocomplete="email" placeholder="ana@gmail.com" />
        </label>
        <small class="error" *ngIf="showError('recoveryEmail')">Correo no válido.</small>

        <label>
          Contraseña
          <input type="password" formControlName="password" autocomplete="new-password" />
        </label>
        <small class="hint">
          Mínimo 8 caracteres, con mayúsculas, minúsculas y números o símbolos (política de Azure AD).
        </small>
        <small class="error" *ngIf="showError('password')">La contraseña no cumple el mínimo de 8 caracteres.</small>

        <label>
          Confirmar contraseña
          <input type="password" formControlName="confirmPassword" autocomplete="new-password" />
        </label>
        <small class="error" *ngIf="form.hasError('passwordMismatch') && form.get('confirmPassword')?.touched">
          Las contraseñas no coinciden.
        </small>

        <button class="ms-button" type="submit" [disabled]="loading()">
          {{ loading() ? 'Creando usuario...' : 'Crear cuenta en Azure' }}
        </button>

        <p class="server-error" *ngIf="errorMessage()">{{ errorMessage() }}</p>

        <div class="success" *ngIf="created() as user">
          <strong>¡Cuenta creada!</strong>
          <p>Inicia sesión con <code>{{ user.userPrincipalName }}</code></p>
          <p>{{ user.message }}</p>
          <button class="ms-button" type="button" (click)="goToLogin()">Ir a iniciar sesión</button>
        </div>

        <a class="back-link" routerLink="/login">Volver al inicio de sesión</a>
      </form>
    </div>
  `,
  styles: [`
    .register-container { display: flex; justify-content: center; align-items: center;
      min-height: 80vh; padding: 2rem 1rem; }
    .register-card { display: flex; flex-direction: column; gap: 0.25rem; width: 100%;
      max-width: 420px; padding: 2rem; border: 1px solid #ddd; border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
    h1 { margin: 0; font-size: 1.5rem; }
    .subtitle { margin: 0 0 1rem; color: #666; font-size: 0.9rem; }
    label { display: flex; flex-direction: column; gap: 0.25rem; margin-top: 0.75rem;
      font-size: 0.9rem; font-weight: 500; }
    input { padding: 0.55rem 0.7rem; border: 1px solid #ccc; border-radius: 4px;
      font-size: 0.95rem; width: 100%; box-sizing: border-box; }
    .upn-row { display: flex; align-items: center; gap: 0.4rem; }
    .domain { color: #666; font-size: 0.85rem; white-space: nowrap; }
    .hint { color: #777; font-size: 0.78rem; }
    .error { color: #c0392b; font-size: 0.78rem; }
    .server-error { color: #c0392b; background: #fdecea; border-radius: 4px;
      padding: 0.6rem; font-size: 0.85rem; margin-top: 0.75rem; }
    .success { background: #eaf7ed; border-radius: 4px; padding: 0.75rem;
      margin-top: 0.75rem; font-size: 0.85rem; }
    .ms-button { background: #2f2f2f; color: white; border: none; padding: 0.75rem 1.5rem;
      border-radius: 4px; cursor: pointer; font-size: 1rem; margin-top: 1.25rem; }
    .ms-button:hover:enabled { background: #1f1f1f; }
    .ms-button:disabled { opacity: 0.6; cursor: not-allowed; }
    .back-link { margin-top: 1rem; text-align: center; font-size: 0.85rem; color: #2f6fdb; }
  `],
})
export class RegisterComponent {
  private readonly fb = inject(FormBuilder);
  private readonly registerService = inject(RegisterService);
  private readonly router = inject(Router);

  /** Dominio del tenant que se concatena al alias para formar el userPrincipalName. */
  readonly domain = environment.signupDomain;

  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly created = signal<CreateUserResponse | null>(null);

  readonly form = this.fb.nonNullable.group(
    {
      displayName: ['', [Validators.required, Validators.maxLength(120)]],
      mailNickname: ['', [Validators.required, Validators.pattern(/^[a-zA-Z0-9._-]{3,60}$/)]],
      recoveryEmail: ['', [Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required]],
    },
    { validators: [passwordsMatch] },
  );

  submit(): void {
    this.errorMessage.set(null);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { displayName, mailNickname, password, recoveryEmail } = this.form.getRawValue();
    this.loading.set(true);

    this.registerService
      .register({
        displayName,
        mailNickname,
        password,
        // El rol lo fija el BFF (self-service-roles); no se envia desde el navegador
        // para que nadie pueda auto-asignarse Admin manipulando la peticion.
        recoveryEmail: recoveryEmail || undefined,
      })
      .subscribe({
        next: (user) => {
          this.loading.set(false);
          this.created.set(user);
          this.form.disable();
        },
        error: (err: Error) => {
          this.loading.set(false);
          this.errorMessage.set(err.message);
        },
      });
  }

  goToLogin(): void {
    this.router.navigate(['/login']);
  }

  /** true cuando el campo es invalido y ya fue tocado (evita marcar todo en rojo al cargar). */
  showError(control: string): boolean {
    const c = this.form.get(control);
    return !!c && c.invalid && (c.touched || c.dirty);
  }
}

/** Valida que ambas contraseñas coincidan a nivel del grupo. */
function passwordsMatch(group: import('@angular/forms').AbstractControl) {
  const password = group.get('password')?.value;
  const confirm = group.get('confirmPassword')?.value;
  return password && confirm && password !== confirm ? { passwordMismatch: true } : null;
}
