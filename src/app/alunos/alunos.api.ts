import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, switchMap } from 'rxjs';
import { Aluno, DadosAluno, Pagina, ResumoAluno } from './alunos.model';

@Injectable({ providedIn: 'root' })
export class AlunosApi {
  private readonly http = inject(HttpClient);

  listar(pagina: number) {
    return this.http.get<Pagina<ResumoAluno>>('/api/alunos', {
      params: { pagina, tamanho: 10 }
    });
  }
  buscar(id: string) {
    return this.http.get<Aluno>(`/api/alunos/${id}`);
  }
  cadastrar(dados: DadosAluno) {
    return this.csrf().pipe(switchMap(headers =>
      this.http.post<Aluno>('/api/alunos', dados, { headers })
    ));
  }
  atualizar(id: string, versao: number, dados: DadosAluno) {
    return this.csrf().pipe(switchMap(headers =>
      this.http.put<Aluno>(`/api/alunos/${id}`, { versao, dados }, { headers })
    ));
  }
  inativar(id: string, versao: number) {
    return this.csrf().pipe(switchMap(headers =>
      this.http.patch<void>(`/api/alunos/${id}/inativacao`, { versao }, { headers })
    ));
  }
  private csrf() {
    return this.http.get<{ headerName: string; token: string }>('/api/csrf')
      .pipe(map(({ headerName, token }) => ({ [headerName]: token })));
  }
}
