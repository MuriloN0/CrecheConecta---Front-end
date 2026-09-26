import { Routes } from '@angular/router';
import { PortalPais } from './portal-pais/portal-pais';
import { TermosLeitura } from './portal-pais/termos-leitura';
import { termoAceitoGuard } from './portal-pais/termo.guard';
import { Saude } from './saude/saude';
import { SaudeForm } from './saude/saude-form';
import { SaudeDetalhe } from './saude/saude-detalhe';
import { SaudeEditar } from './saude/saude-editar';

export const routes: Routes = [
  { path: 'portal-pais', component: PortalPais },
  { path: 'informacoes', component: Saude, canActivate: [termoAceitoGuard] },
  { path: 'informacoes/termos', component: TermosLeitura, canActivate: [termoAceitoGuard] },
  { path: 'informacoes/nova', component: SaudeForm, canActivate: [termoAceitoGuard] },
  { path: 'informacoes/:id/editar', component: SaudeEditar, canActivate: [termoAceitoGuard] },
  { path: 'informacoes/:id', component: SaudeDetalhe, canActivate: [termoAceitoGuard] },
  { path: '', redirectTo: 'portal-pais', pathMatch: 'full' },
];
