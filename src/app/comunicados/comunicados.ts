import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../core/services/auth.service';
import { Comunicado, ComunicadosService } from './comunicados.service';

@Component({
  selector: 'app-comunicados',
  standalone: true,
  imports: [DatePipe, FormsModule],
  templateUrl: './comunicados.html',
})
export class Comunicados implements OnInit {
  private readonly servico = inject(ComunicadosService);
  private readonly auth = inject(AuthService);

  readonly podeGerenciar = computed(() => this.auth.usuario()?.perfil === 'DIRECAO');
  readonly comunicados = signal<Comunicado[]>([]);
  readonly pagina = signal(0);
  readonly totalPaginas = signal(0);
  readonly ocupada = signal(false);
  readonly falhaListagem = signal(false);
  readonly erro = signal('');
  readonly sucesso = signal('');
  readonly formularioAberto = signal(false);
  readonly editando = signal<Comunicado | null>(null);
  readonly paraInativar = signal<Comunicado | null>(null);

  readonly cartao = 'space-y-4 rounded-2xl border border-stone-200 bg-white p-4 md:p-6';
  readonly campo = 'w-full rounded-xl border border-stone-300 px-3 py-2 focus-visible:ring-2 focus-visible:ring-creche-verde disabled:bg-stone-100';
  readonly botao = 'cursor-pointer rounded-xl border border-stone-300 px-4 py-2 text-sm font-semibold hover:bg-stone-50 focus-visible:ring-2 focus-visible:ring-creche-verde disabled:cursor-not-allowed disabled:opacity-50';
  readonly primario = 'cursor-pointer rounded-xl bg-creche-verde px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 focus-visible:ring-2 focus-visible:ring-creche-verde focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';

  titulo = '';
  conteudo = '';

  ngOnInit(): void {
    void this.carregar(0);
  }

  carregar(pagina: number): Promise<void> {
    if (pagina < 0 || this.ocupada()) return Promise.resolve();

    this.fecharPaineis();
    return this.executar(() => this.buscarComunicados(pagina));
  }

  abrirFormulario(comunicado: Comunicado | null = null): void {
    if (!this.podeGerenciar() || this.ocupada()) return;

    this.fecharPaineis();
    this.limparMensagens();
    this.editando.set(comunicado);
    this.titulo = comunicado?.titulo ?? '';
    this.conteudo = comunicado?.conteudo ?? '';
    this.formularioAberto.set(true);
  }

  pedirInativacao(comunicado: Comunicado): void {
    if (!this.podeGerenciar() || this.ocupada() || !comunicado.ativo) return;

    this.fecharPaineis();
    this.limparMensagens();
    this.paraInativar.set(comunicado);
  }

  fecharPaineis(): void {
    this.formularioAberto.set(false);
    this.editando.set(null);
    this.paraInativar.set(null);
  }

  salvar(formulario: NgForm): Promise<void> {
    if (!this.podeGerenciar() || !this.formularioAberto() || this.ocupada()) {
      return Promise.resolve();
    }

    return this.executar(async () => {
      formulario.form.markAllAsTouched();

      const titulo = this.titulo.trim();
      const conteudo = this.conteudo.trim();

      if (!titulo || !conteudo || titulo.length > 150 || conteudo.length > 5000) {
        this.erro.set('Preencha o título e o texto dentro dos limites indicados.');
        return;
      }

      const comunicado = this.editando();
      const dados = { titulo, conteudo };

      if (comunicado) {
        await firstValueFrom(this.servico.atualizar(comunicado, dados));
      } else {
        await firstValueFrom(this.servico.criar(dados));
      }

      this.fecharPaineis();
      this.sucesso.set(comunicado ? 'Comunicado atualizado.' : 'Comunicado publicado.');
      await this.buscarComunicados(comunicado ? this.pagina() : 0);
    });
  }

  confirmarInativacao(): Promise<void> {
    const comunicado = this.paraInativar();

    if (!this.podeGerenciar() || !comunicado || this.ocupada()) {
      return Promise.resolve();
    }

    return this.executar(async () => {
      await firstValueFrom(this.servico.inativar(comunicado));
      this.fecharPaineis();
      this.sucesso.set('Comunicado retirado do mural.');
      await this.buscarComunicados(this.pagina());
    });
  }

  private async buscarComunicados(pagina: number): Promise<void> {
    try {
      let resposta = await firstValueFrom(this.servico.listar(pagina));
      const ultimaPagina = Math.max(0, resposta.totalPages - 1);

      if (pagina > ultimaPagina) {
        pagina = ultimaPagina;
        resposta = await firstValueFrom(this.servico.listar(pagina));
      }

      this.comunicados.set(resposta.content);
      this.pagina.set(pagina);
      this.totalPaginas.set(resposta.totalPages);
      this.falhaListagem.set(false);
    } catch (erro: unknown) {
      this.comunicados.set([]);
      this.falhaListagem.set(true);
      throw erro;
    }
  }

  private async executar(acao: () => Promise<void>): Promise<void> {
    if (this.ocupada()) return;

    this.limparMensagens();
    this.ocupada.set(true);

    try {
      await acao();
    } catch (erro: unknown) {
      this.erro.set(this.mensagemErro(erro));
    } finally {
      this.ocupada.set(false);
    }
  }

  private limparMensagens(): void {
    this.erro.set('');
    this.sucesso.set('');
  }

  private mensagemErro(erro: unknown): string {
    if (erro instanceof HttpErrorResponse) {
      switch (erro.status) {
        case 0:
          return 'Não foi possível conectar à API.';
        case 400:
          return 'Confira o título e o texto do comunicado.';
        case 401:
          return 'Sua sessão expirou. Entre novamente.';
        case 403:
          return 'Sua conta não tem permissão para esta operação.';
        case 404:
          return 'O comunicado não está mais disponível. Atualize o mural.';
        case 409:
          return 'O comunicado foi alterado. Atualize o mural antes de tentar novamente.';
      }
    }

    return 'Não foi possível concluir a operação. Tente novamente.';
  }
}
