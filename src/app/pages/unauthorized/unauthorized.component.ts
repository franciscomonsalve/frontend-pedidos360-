import { Component } from '@angular/core';

@Component({
  selector: 'app-unauthorized',
  standalone: true,
  template: `
    <div class="unauthorized">
      <h2>Acceso no autorizado</h2>
      <p>Tu cuenta no tiene el rol necesario para ver esta sección.</p>
    </div>
  `,
  styles: [`.unauthorized { text-align: center; margin-top: 3rem; }`],
})
export class UnauthorizedComponent {}
