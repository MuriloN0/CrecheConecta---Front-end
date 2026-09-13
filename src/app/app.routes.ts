import { Routes } from '@angular/router';
import { Saude } from './saude/saude';
import { SaudeForm } from './saude/saude-form';
import { SaudeDetalhe } from './saude/saude-detalhe';
import { SaudeEditar } from './saude/saude-editar';

export const routes: Routes = [
  { path: 'saude', component: Saude },
  { path: 'saude/nova', component: SaudeForm },
  { path: 'saude/:id/editar', component: SaudeEditar },
  { path: 'saude/:id', component: SaudeDetalhe },
  { path: '', redirectTo: 'saude', pathMatch: 'full' },
];
