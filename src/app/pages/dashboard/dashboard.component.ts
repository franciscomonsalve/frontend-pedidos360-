import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MsalService } from '@azure/msal-angular';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <h2>Bienvenido, {{ userName }}</h2>
    <p>Roles asignados: {{ roles.length ? roles.join(', ') : 'Sin roles asignados' }}</p>
    <p>Desde aquí puedes acceder a la gestión de pedidos según tu rol.</p>
  `,
})
export class DashboardComponent implements OnInit {
  private readonly msalService = inject(MsalService);

  userName = '';
  roles: string[] = [];

  ngOnInit(): void {
    const account = this.msalService.instance.getActiveAccount();
    if (account) {
      this.userName = account.name ?? account.username;
      const claims = account.idTokenClaims as { roles?: string[] } | undefined;
      this.roles = claims?.roles ?? [];
    }
  }
}
