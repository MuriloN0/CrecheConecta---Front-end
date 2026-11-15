import { DatePipe } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';

const ASSUNTOS = {
  CHAT: 'Conversas',
  USUARIOS: 'Usuários e sessões',
  TURMAS: 'Turmas e matrículas',
  ALUNOS: 'Alunos e responsáveis',
  FREQUENCIA: 'Frequência',
  COMUNICADOS: 'Comunicados',
  TERMOS: 'Termos',
  ATIVIDADES: 'Atividades',
  ROTINA: 'Diário de rotina',
  MALA_VIRTUAL: 'Mala Virtual',
  MATERIAIS: 'Solicitações de materiais',
  INFORMACOES: 'Informações e observações',
  ERROS: 'Erros',
  OUTROS: 'Outros',
};

type Assunto = keyof typeof ASSUNTOS;

interface EventoAuditoria {
  id: string;
  instante: string;
  assunto: Assunto;
  acao: string;
  usuarioId: string | null;
  usuarioNome: string | null;
  recursoId: string | null;
}

interface PaginaAuditoria {
  itens: EventoAuditoria[];
  temProxima: boolean;
}

interface FiltrosAuditoria {
  assunto: Assunto | '';
  acao: string;
  inicio: string;
  fim: string;
}

@Component({
  selector: 'app-auditoria',
  standalone: true,
  imports: [DatePipe, FormsModule],
  templateUrl: './auditoria.html',
})
export class Auditoria implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly destroy = inject(DestroyRef);

  readonly assuntos = Object.entries(ASSUNTOS);
  readonly rotulos = ASSUNTOS;
  readonly eventos = signal<EventoAuditoria[]>([]);
  readonly pagina = signal(0);
  readonly temProxima = signal(false);
  readonly carregando = signal(false);
  readonly erro = signal('');

  readonly campo =
    'w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-creche-verde';
  readonly botao =
    'rounded-lg border border-stone-300 px-3 py-2 text-sm font-semibold hover:bg-stone-50 disabled:opacity-50';

  filtros: FiltrosAuditoria = { assunto: '', acao: '', inicio: '', fim: '' };
  private aplicados = { ...this.filtros };

  ngOnInit(): void {
    void this.carregar(0);
  }

  aplicar(): void {
    if (this.carregando()) return;

    const { inicio, fim } = this.filtros;
    if (inicio && fim && inicio > fim) {
      this.erro.set('A data inicial deve ser anterior ou igual à final.');
      return;
    }

    this.aplicados = { ...this.filtros, acao: this.filtros.acao.trim() };
    this.eventos.set([]);
    this.pagina.set(0);
    this.temProxima.set(false);

    void this.carregar(0);
  }

  limpar(): void {
    if (this.carregando()) return;

    this.filtros = { assunto: '', acao: '', inicio: '', fim: '' };
    this.aplicar();
  }

  async carregar(pagina: number): Promise<void> {
    if (pagina < 0 || this.carregando()) return;

    this.carregando.set(true);
    this.erro.set('');

    const params: Record<string, string | number> = { pagina };

    for (const [campo, valor] of Object.entries(this.aplicados)) {
      if (valor) params[campo] = valor;
    }

    try {
      const dados = await firstValueFrom(
        this.http.get<PaginaAuditoria>('/api/auditoria', { params })
          .pipe(takeUntilDestroyed(this.destroy)),
        { defaultValue: null },
      );

      if (!dados) return;

      this.eventos.set(dados.itens);
      this.pagina.set(pagina);
      this.temProxima.set(dados.temProxima);
    } catch (erro: unknown) {
      const detalhe: unknown = erro instanceof HttpErrorResponse ? erro.error?.detail : null;
      this.erro.set(
        typeof detalhe === 'string' ? detalhe : 'Não foi possível carregar a auditoria.',
      );
    } finally {
      this.carregando.set(false);
    }
  }
}
