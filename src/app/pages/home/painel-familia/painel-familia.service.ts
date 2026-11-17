import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

export interface Filho {
  id: string;
  nome: string;
  turma: { id: string; nome: string; numeroSala: string } | null;
}

export interface DiarioFilho {
  data: string;
  alimentacao: string;
  sono: string;
  evacuacao: boolean;
  humor: string;
  higiene: string;
  observacaoProfessor: string | null;
}

export interface FrequenciaFilho {
  mes: string;
  presencas: number;
  faltas: number;
}

export interface MalaFilho {
  id: string;
  data: string;
  observacao: string | null;
  itensPendentes: number;
  itens: {
    id: string;
    nome: string;
    quantidade: number;
    enviado: boolean;
  }[];
}

@Injectable({ providedIn: 'root' })
export class PainelFamiliaService {
  private readonly http = inject(HttpClient);
  private readonly base = '/api/meus-filhos';

  listarFilhos() {
    return this.http.get<Filho[]>(this.base);
  }

  // Sem "data" o back devolve o diário mais recente.
  consultarDiario(alunoId: string, data?: string) {
    return this.http.get<DiarioFilho>(`${this.base}/${alunoId}/diario`, {
      params: data ? { data } : {},
    });
  }

  consultarFrequencia(alunoId: string) {
    return this.http.get<FrequenciaFilho>(`${this.base}/${alunoId}/chamada`);
  }

  listarMalas(alunoId: string) {
    return this.http.get<MalaFilho[]>(`${this.base}/${alunoId}/mala`);
  }
}
