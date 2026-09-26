import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { TermoStatus } from './portal-pais.model';

@Injectable({ providedIn: 'root' })
export class PortalPaisApi {
  private readonly http = inject(HttpClient);

  statusTermo() {
    return this.http.get<TermoStatus>('/api/termo/status');
  }

  aceitarTermo() {
    return this.http.post<void>('/api/termo/aceite', {});
  }
}