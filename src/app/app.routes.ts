import { Routes } from '@angular/router';
import { MsalGuard } from '@azure/msal-angular';
import { roleGuard } from './guards/role.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },

  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.component').then((m) => m.LoginComponent),
  },

  {
    // Alta de cuenta en Entra ID: publica, se llega desde el boton del login
    path: 'register',
    loadComponent: () => import('./pages/register/register.component').then((m) => m.RegisterComponent),
  },

  {
    // MSAL redirige aqui tras un login exitoso antes de continuar a la ruta original
    path: 'auth/callback',
    loadComponent: () => import('./pages/login/login.component').then((m) => m.LoginComponent),
  },

  {
    path: 'dashboard',
    canActivate: [MsalGuard],
    loadComponent: () => import('./pages/dashboard/dashboard.component').then((m) => m.DashboardComponent),
  },

  {
    path: 'orders',
    canActivate: [MsalGuard, roleGuard],
    data: { roles: ['Admin', 'Operator', 'Customer'] },
    loadComponent: () => import('./pages/orders/orders.component').then((m) => m.OrdersComponent),
  },

  {
    // Solo Admin. Si un usuario sin ese rol pega la URL, roleGuard loguea
    // un 401 en consola y redirige directo al dashboard (no a /unauthorized).
    path: 'auditoria',
    canActivate: [MsalGuard, roleGuard],
    data: { roles: ['Admin'], redirectTo: '/dashboard' },
    loadComponent: () => import('./pages/auditoria/auditoria.component').then((m) => m.AuditoriaComponent),
  },

  {
    path: 'unauthorized',
    loadComponent: () => import('./pages/unauthorized/unauthorized.component').then((m) => m.UnauthorizedComponent),
  },

  { path: '**', redirectTo: 'dashboard' },
];
