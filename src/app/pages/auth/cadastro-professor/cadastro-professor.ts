import { Location } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { CadastroProfessorService, DadosConviteProfessor } from './cadastro-professor.service';

@Component({
  selector: 'app-cadastro-professor',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './cadastro-professor.html',
})
export class CadastroProfessor implements OnInit {
  private readonly servico = inject(CadastroProfessorService);
  private readonly rota = inject(ActivatedRoute);
  private readonly localizacao = inject(Location);

  private token = '';

  readonly convite = signal<DadosConviteProfessor | null>(null);
  readonly consultando = signal(false);
  readonly enviando = signal(false);
  readonly podeConsultar = signal(false);
  readonly erro = signal('');
  readonly sucesso = signal('');

  nome = '';
  telefone = '';
  senha = '';
  confirmarSenha = '';

  ngOnInit(): void {
    const fragmento = this.rota.snapshot.fragment ?? '';
    const token = new URLSearchParams(fragmento).get('token') ?? '';

    if (!/^[A-Za-z0-9_-]{43}$/.test(token)) {
      this.erro.set('O link do convite está incompleto. Abra o link enviado por e-mail.');
      return;
    }

    this.token = token;
    this.podeConsultar.set(true);
    void this.consultar();
  }

  async consultar(): Promise<void> {
    if (!this.podeConsultar() || this.consultando()) return;

    this.erro.set('');
    this.consultando.set(true);

    try {
      const convite = await firstValueFrom(this.servico.consultarConvite(this.token));
      this.nome = convite.nome;
      this.convite.set(convite);
    } catch (erro: unknown) {
      this.erro.set(this.mensagemErro(erro, 'Não foi possível consultar o convite.'));
    } finally {
      this.consultando.set(false);
    }
  }

  async concluir(formulario: NgForm): Promise<void> {
    if (this.enviando() || !this.convite()) return;

    this.erro.set('');
    formulario.form.markAllAsTouched();

    const nome = this.nome.trim();
    const telefone = this.telefone.trim();

    if (!nome || nome.length > 150) {
      this.erro.set('Informe um nome com até 150 caracteres.');
      return;
    }

    if (!/^[1-9][0-9]{9,10}$/.test(telefone)) {
      this.erro.set('Informe o telefone com DDD e somente números.');
      return;
    }

    if (
      this.senha.length < 8 ||
      !this.senha.trim() ||
      new TextEncoder().encode(this.senha).length > 72
    ) {
      this.erro.set('A senha deve ter ao menos 8 caracteres e no máximo 72 bytes.');
      return;
    }

    if (this.senha !== this.confirmarSenha) {
      this.erro.set('A confirmação precisa ser igual à senha.');
      return;
    }

    if (formulario.invalid) {
      this.erro.set('Confira os campos do cadastro.');
      return;
    }

    this.enviando.set(true);

    try {
      const resultado = await firstValueFrom(
        this.servico.concluir({
          token: this.token,
          nome,
          telefone,
          senha: this.senha,
        }),
      );

      this.token = '';
      this.senha = '';
      this.confirmarSenha = '';
      this.podeConsultar.set(false);
      this.convite.set(null);
      this.localizacao.replaceState(this.localizacao.path(false));
      this.sucesso.set(resultado.mensagem || 'Cadastro concluído. Você já pode entrar.');
    } catch (erro: unknown) {
      this.erro.set(this.mensagemErro(erro, 'Não foi possível concluir o cadastro.'));
    } finally {
      this.enviando.set(false);
    }
  }

  private mensagemErro(erro: unknown, alternativa: string): string {
    if (erro instanceof HttpErrorResponse) {
      if (erro.status === 0) return 'Não foi possível conectar à API. Tente novamente.';

      if (erro.status >= 400 && erro.status < 500) {
        const mensagem: unknown = erro.error?.mensagem;
        if (typeof mensagem === 'string' && mensagem.trim()) {
          return mensagem;
        }
      }
    }

    return alternativa;
  }
}
