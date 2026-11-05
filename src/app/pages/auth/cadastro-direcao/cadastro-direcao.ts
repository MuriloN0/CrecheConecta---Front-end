import { Location } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { DirecaoService } from '../../../direcao/direcao.service';

@Component({
  selector: 'app-cadastro-direcao',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './cadastro-direcao.html',
})
export class CadastroDirecao implements OnInit {
  private readonly servico = inject(DirecaoService);
  private readonly rota = inject(ActivatedRoute);
  private readonly localizacao = inject(Location);
  private token = '';

  readonly convite = signal<{ nome: string; email: string } | null>(null);
  readonly ocupada = signal(false);
  readonly podeConsultar = signal(false);
  readonly erro = signal('');
  readonly sucesso = signal('');
  readonly campo = 'w-full rounded-xl border border-stone-300 px-3 py-2 focus-visible:ring-2 focus-visible:ring-creche-verde';

  telefone = '';
  senha = '';
  confirmarSenha = '';

  ngOnInit(): void {
    const fragmento = this.rota.snapshot.fragment ?? '';
    const token = new URLSearchParams(fragmento).get('token') ?? '';

    if (!/^[A-Za-z0-9_-]{43}$/.test(token)) {
      this.erro.set('Abra o link completo enviado no e-mail do convite.');
      return;
    }

    this.token = token;
    this.podeConsultar.set(true);
    void this.consultar();
  }

  consultar(): Promise<void> {
    if (!this.podeConsultar()) return Promise.resolve();

    return this.executar(async () => {
      this.convite.set(await firstValueFrom(this.servico.consultarConvite(this.token)));
    });
  }

  concluir(formulario: NgForm): Promise<void> {
    if (!this.convite() || formulario.invalid) return Promise.resolve();

    return this.executar(async () => {
      const telefone = this.telefone.trim();

      if (!/^[1-9][0-9]{9,10}$/.test(telefone)) {
        this.erro.set('Informe o telefone com DDD e somente números.');
        return;
      }

      if (!this.senha.trim() || this.senha.length < 12 ||
          new TextEncoder().encode(this.senha).length > 72) {
        this.erro.set('Use uma senha com pelo menos 12 caracteres e até 72 bytes.');
        return;
      }

      if (this.senha !== this.confirmarSenha) {
        this.erro.set('A confirmação precisa ser igual à senha.');
        return;
      }

      const resultado = await firstValueFrom(
        this.servico.concluirCadastro(this.token, telefone, this.senha),
      );

      this.token = '';
      this.senha = '';
      this.confirmarSenha = '';
      this.convite.set(null);
      this.podeConsultar.set(false);
      this.localizacao.replaceState(this.localizacao.path(false));
      this.sucesso.set(resultado.mensagem || 'Cadastro concluído. Você já pode entrar.');
    });
  }

  private async executar(acao: () => Promise<void>): Promise<void> {
    if (this.ocupada()) return;

    this.ocupada.set(true);
    this.erro.set('');

    try {
      await acao();
    } catch (erro: unknown) {
      const mensagem: unknown = erro instanceof HttpErrorResponse &&
        erro.status >= 400 && erro.status < 500 ? erro.error?.mensagem : null;

      this.erro.set(
        typeof mensagem === 'string' && mensagem.trim()
          ? mensagem
          : 'Não foi possível processar o convite. Tente novamente.',
      );
    } finally {
      this.ocupada.set(false);
    }
  }
}
