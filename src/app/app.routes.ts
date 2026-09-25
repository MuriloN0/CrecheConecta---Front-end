import { Routes } from '@angular/router';
import { PortalPais } from './portal-pais/portal-pais';
import { termoAceitoGuard } from './portal-pais/termo.guard';
import { Saude } from './saude/saude';
import { SaudeForm } from './saude/saude-form';
import { SaudeDetalhe } from './saude/saude-detalhe';
import { SaudeEditar } from './saude/saude-editar';

export const routes: Routes = [
  { path: 'portal-pais', component: PortalPais },
  { path: 'saude', component: Saude, canActivate: [termoAceitoGuard] },
  { path: 'saude/nova', component: SaudeForm, canActivate: [termoAceitoGuard] },
  { path: 'saude/:id/editar', component: SaudeEditar, canActivate: [termoAceitoGuard] },
  { path: 'saude/:id', component: SaudeDetalhe, canActivate: [termoAceitoGuard] },
  { path: '', redirectTo: 'portal-pais', pathMatch: 'full' },
];