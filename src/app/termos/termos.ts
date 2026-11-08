import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { ROTULOS_STATUS_TERMO, TermoVersao } from './termos.model';
import { TermosService } from './termos.service';

const LIMITE_TEXTO = 20000;
const PADRAO_IDENTIFICADOR = /^[A-Za-z0-9._-]{1,40}$/;

@Component({
  selector: 'app-termos',
  standalone: true,
  imports: [DatePipe, FormsModule],
  templateUrl: './termos.html',
})
export class Termos implements OnInit {
  private readonly servico = inject(TermosService);

  readonly hoje = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'America/Sao_Paulo',
  }).format(new Date());

  readonly versoes = signal<TermoVersao[]>([]);
  readonly ocupada = signal(false);
  readonly falhaListagem = signal(false);
  readonly erro = signal('');
  readonly sucesso = signal('');
  readonly formularioAberto = signal(false);
  readonly editando = signal<TermoVersao | null>(null);
  readonly detalhe = signal<TermoVersao | null>(null);
  readonly paraPublicar = signal<TermoVersao | null>(null);
  readonly paraExcluir = signal<TermoVersao | null>(null);

  readonly vigente = computed(
    () => this.versoes().find((versao) => versao.status === 'VIGENTE') ?? null,
  );
  readonly rotulos = ROTULOS_STATUS_TERMO;

  readonly cartao = 'space-y-4 rounded-2xl border border-stone-200 bg-white p-4 md:p-6';
  readonly campo = 'w-full rounded-xl border border-stone-300 bg-white px-3 py-2 focus-visible:ring-2 focus-visible:ring-creche-verde disabled:bg-stone-100';
  readonly botao = 'cursor-pointer rounded-xl border border-stone-300 px-4 py-2 text-sm font-semibold hover:bg-stone-50 focus-visible:ring-2 focus-visible:ring-creche-verde disabled:cursor-not-allowed disabled:opacity-50';
  readonly primario = 'cursor-pointer rounded-xl bg-creche-verde px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 focus-visible:ring-2 focus-visible:ring-creche-verde focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';

  identificador = '';
  termoUso = '';
  politicaPrivacidade = '';

  ngOnInit(): void {
    void this.carregar();
  }

  carregar(): Promise<void> {
    return this.executar(async () => {
      this.fecharPaineis();
      await this.buscar();
    });
  }

  // Uma nova versão começa com o texto da vigente, para a direção só ajustar o que mudou.
  abrirFormulario(termo: TermoVersao | null = null): void {
    if (this.ocupada()) return;
    if (termo && termo.status !== 'RASCUNHO') return;
    this.fecharPaineis();
    this.limparMensagens();
    this.editando.set(termo);
    const base = termo ?? this.vigente();
    this.identificador = termo?.identificador ?? `${this.hoje}-v`;
    this.termoUso = base?.termoUso ?? '';
    this.politicaPrivacidade = base?.politicaPrivacidade ?? '';
    this.formularioAberto.set(true);
  }

  ver(termo: TermoVersao): void {
    if (this.ocupada()) return;
    this.fecharPaineis();
    this.limparMensagens();
    this.detalhe.set(termo);
  }

  pedirPublicacao(termo: TermoVersao): void {
    if (this.ocupada() || termo.status !== 'RASCUNHO') return;
    this.fecharPaineis();
    this.limparMensagens();
    this.paraPublicar.set(termo);
  }

  pedirExclusao(termo: TermoVersao): void {
    if (this.ocupada() || termo.status !== 'RASCUNHO') return;
    this.fecharPaineis();
    this.limparMensagens();
    this.paraExcluir.set(termo);
  }

  fecharPaineis(): void {
    this.formularioAberto.set(false);
    this.editando.set(null);
    this.detalhe.set(null);
    this.paraPublicar.set(null);
    this.paraExcluir.set(null);
  }

  salvar(): Promise<void> {
    if (!this.formularioAberto() || this.ocupada()) return Promise.resolve();
    return this.executar(async () => {
      const identificador = this.identificador.trim();
      const termoUso = this.termoUso.trim();
      const politicaPrivacidade = this.politicaPrivacidade.trim();
      if (!PADRAO_IDENTIFICADOR.test(identificador)) {
        this.erro.set('Informe um identificador com até 40 caracteres, só letras, números, ponto, hífen e sublinhado.');
        return;
      }
      if (!termoUso || !politicaPrivacidade) {
        this.erro.set('Preencha o termo de uso e a política de privacidade.');
        return;
      }
      if (termoUso.length > LIMITE_TEXTO || politicaPrivacidade.length > LIMITE_TEXTO) {
        this.erro.set('Cada texto pode ter no máximo 20.000 caracteres.');
        return;
      }
      const termo = this.editando();
      const dados = { identificador, termoUso, politicaPrivacidade };
      if (termo) {
        await firstValueFrom(this.servico.atualizar(termo, dados));
      } else {
        await firstValueFrom(this.servico.criar(dados));
      }
      this.fecharPaineis();
      this.sucesso.set(termo ? 'Rascunho atualizado.' : 'Rascunho criado. Revise e publique quando estiver pronto.');
      await this.buscar();
    });
  }

  confirmarPublicacao(): Promise<void> {
    const termo = this.paraPublicar();
    if (!termo || this.ocupada()) return Promise.resolve();
    return this.executar(async () => {
      await firstValueFrom(this.servico.publicar(termo));
      this.fecharPaineis();
      this.sucesso.set(`Versão ${termo.identificador} publicada. Todos os responsáveis precisarão aceitá-la.`);
      await this.buscar();
    });
  }

  confirmarExclusao(): Promise<void> {
    const termo = this.paraExcluir();
    if (!termo || this.ocupada()) return Promise.resolve();
    return this.executar(async () => {
      await firstValueFrom(this.servico.excluir(termo));
      this.fecharPaineis();
      this.sucesso.set('Rascunho excluído.');
      await this.buscar();
    });
  }

  private async buscar(): Promise<void> {
    try {
      this.versoes.set(await firstValueFrom(this.servico.listar()));
      this.falhaListagem.set(false);
    } catch (erro: unknown) {
      this.versoes.set([]);
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
      if (erro instanceof HttpErrorResponse && (erro.status === 409 || erro.status === 404)) {
        // Alguém mexeu na versão: recarrega para pegar o estado atual.
        this.fecharPaineis();
        try {
          await this.buscar();
        } catch {
          // a mensagem de erro principal já foi mostrada
        }
      }
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
        case 400: {
          const mensagem: unknown = erro.error?.mensagem;
          if (typeof mensagem === 'string' && mensagem.trim()) return mensagem;
          return 'Confira o identificador e os textos.';
        }
        case 401:
          return 'Sua sessão expirou. Entre novamente.';
        case 403:
          return 'A gestão dos termos é restrita à direção.';
        case 404:
          return 'A versão não está mais disponível. A lista foi atualizada.';
        case 409:
          return 'A versão foi alterada por outra pessoa. A lista foi atualizada; revise e tente de novo.';
      }
    }
    return 'Não foi possível concluir a operação. Tente novamente.';
  }
}
