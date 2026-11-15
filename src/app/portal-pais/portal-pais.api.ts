import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { TermoStatus } from './portal-pais.model';

@Injectable({ providedIn: 'root' })
export class PortalPaisApi {
  private readonly http = inject(HttpClient);

  statusTermo() {
    return this.http.get<TermoStatus>('/api/termo/status');
  }

  aceitarTermo(versao: string) {
    return this.http.post<void>('/api/termo/aceite', { versao });
  }
}
