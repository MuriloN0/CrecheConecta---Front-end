import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../core/services/auth.service';
import { ContaDirecao, DirecaoService } from './direcao.service';

@Component({
  selector: 'app-direcao',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './direcao.html',
})
export class Direcao implements OnInit {
  private readonly servico = inject(DirecaoService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly minhaConta = signal<ContaDirecao | null>(null);
  readonly equipe = signal<ContaDirecao[]>([]);
  readonly pagina = signal(0);
  readonly totalPaginas = signal(0);
  readonly ocupada = signal(false);
  readonly erro = signal('');
  readonly sucesso = signal('');

  readonly campo = 'w-full rounded-xl border border-stone-300 px-3 py-2 focus-visible:ring-2 focus-visible:ring-creche-verde';
  readonly botao = 'rounded-xl border border-stone-300 px-4 py-2 text-sm font-semibold hover:bg-stone-50 disabled:opacity-50';
  readonly primario = 'rounded-xl bg-creche-verde px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-50';

  nome = '';
  telefone = '';
  nomeConvite = '';
  emailConvite = '';

  ngOnInit(): void {
    void this.recarregar();
  }

  recarregar(): Promise<void> {
    return this.executar(async () => {
      const conta = await firstValueFrom(this.servico.minhaConta());
      this.preencherConta(conta);
      await this.buscarEquipe(this.pagina());
    });
  }

  carregarEquipe(pagina: number): Promise<void> {
    return this.executar(() => this.buscarEquipe(pagina));
  }

  salvarConta(formulario: NgForm): Promise<void> {
    const conta = this.minhaConta();
    if (!conta || formulario.invalid) return Promise.resolve();

    return this.executar(async () => {
      const nome = this.nome.trim();
      const telefone = this.telefone.trim();

      if (!nome || nome.length > 150 || !/^[1-9][0-9]{9,10}$/.test(telefone)) {
        this.erro.set('Confira o nome e informe o telefone com DDD e somente números.');
        return;
      }

      const atualizada = await firstValueFrom(
        this.servico.atualizarMinhaConta(nome, telefone, conta.versao),
      );

      this.preencherConta(atualizada);
      this.sucesso.set('Sua conta foi atualizada.');
      await this.auth.carregarUsuario();
      await this.buscarEquipe(this.pagina());
    });
  }

  enviarConvite(formulario: NgForm): Promise<void> {
    if (formulario.invalid) return Promise.resolve();

    return this.executar(async () => {
      const nome = this.nomeConvite.trim();
      const email = this.emailConvite.trim();

      if (!nome || nome.length > 150 || !email) {
        this.erro.set('Informe o nome e o e-mail do convidado.');
        return;
      }

      const resposta = await firstValueFrom(this.servico.convidar(nome, email));

      formulario.resetForm({ nomeConvite: '', emailConvite: '' });
      this.sucesso.set(resposta.mensagem || 'Convite enviado.');
    });
  }

  inativarConta(): Promise<void> {
    const conta = this.minhaConta();
    if (!conta || this.ocupada()) return Promise.resolve();

    if (!window.confirm('Deseja inativar sua conta? Você será desconectado.')) {
      return Promise.resolve();
    }

    return this.executar(async () => {
      await firstValueFrom(this.servico.inativarMinhaConta(conta.versao));
      this.auth.limparSessao();
      await this.router.navigateByUrl('/login', { replaceUrl: true });
    });
  }

  private preencherConta(conta: ContaDirecao): void {
    this.minhaConta.set(conta);
    this.nome = conta.nome;
    this.telefone = conta.telefone ?? '';
  }

  private async buscarEquipe(pagina: number): Promise<void> {
    const resposta = await firstValueFrom(this.servico.listar(pagina));
    this.equipe.set(resposta.content);
    this.pagina.set(pagina);
    this.totalPaginas.set(resposta.totalPages);
  }

  private async executar(acao: () => Promise<void>): Promise<void> {
    if (this.ocupada()) return;

    this.ocupada.set(true);
    this.erro.set('');
    this.sucesso.set('');

    try {
      await acao();
    } catch (erro: unknown) {
      this.erro.set(this.mensagemErro(erro));
    } finally {
      this.ocupada.set(false);
    }
  }

  private mensagemErro(erro: unknown): string {
    if (erro instanceof HttpErrorResponse) {
      if (erro.status === 0) return 'Não foi possível conectar à API.';
      if (erro.status === 401) return 'Sua sessão expirou. Entre novamente.';
      if (erro.status === 403) return 'Esta operação é restrita à direção.';
      if (erro.status === 409) return 'Sua conta mudou. Use Atualizar dados antes de tentar novamente.';

      if (erro.status >= 400 && erro.status < 500) {
        const mensagem: unknown = erro.error?.mensagem;
        if (typeof mensagem === 'string' && mensagem.trim()) return mensagem;
      }
    }

    return 'Não foi possível concluir a operação. Tente novamente.';
  }
}
