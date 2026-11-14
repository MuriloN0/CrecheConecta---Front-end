import { Location } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

interface ConviteResponsavel {
  nome: string;
  email: string;
  faixaNascimento: {
    dataMinima: string;
    dataMaxima: string;
  };
  documentos: {
    versao: string;
    termoUso: string;
    politicaPrivacidade: string;
  };
}

@Component({
  selector: 'app-cadastro-responsavel',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './cadastro-responsavel.html',
})
export class CadastroResponsavel implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly rota = inject(ActivatedRoute);
  private readonly localizacao = inject(Location);
  private readonly api = '/api/cadastro/responsavel';
  private token = '';

  readonly convite = signal<ConviteResponsavel | null>(null);
  readonly ocupada = signal(false);
  readonly podeConsultar = signal(false);
  readonly erro = signal('');
  readonly sucesso = signal('');
  readonly campo =
    'w-full rounded-xl border border-stone-300 px-3 py-2 focus-visible:ring-2 focus-visible:ring-creche-verde';

  aceitouDocumentos = false;
  nome = '';
  nomeAluno = '';
  dataNascimento = '';
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
      const dados = await firstValueFrom(
        this.http.post<ConviteResponsavel>(`${this.api}/consultar-convite`, {
          token: this.token,
        }),
      );

      if (!this.convite()) this.nome = dados.nome;

      this.aceitouDocumentos = false;
      this.convite.set(dados);
    });
  }

  erroDataNascimento(): string {
    const faixa = this.convite()?.faixaNascimento;
    const data = this.dataNascimento;

    if (!faixa || !data) return '';

    if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) {
      return 'Informe uma data de nascimento válida.';
    }

    const calendario = new Date(data + 'T00:00:00Z');
    if (
      Number.isNaN(calendario.getTime()) ||
      calendario.toISOString().slice(0, 10) !== data
    ) {
      return 'Informe uma data de nascimento válida.';
    }

    if (data < faixa.dataMinima) {
      return 'O aluno deve ter no máximo 4 anos pelo ano de nascimento.';
    }

    if (data > faixa.dataMaxima) {
      return 'O aluno deve ter pelo menos 6 meses completos.';
    }

    return '';
  }

  concluir(formulario: NgForm): Promise<void> {
    const convite = this.convite();
    if (!convite || formulario.invalid || !this.aceitouDocumentos) {
      return Promise.resolve();
    }

    return this.executar(async () => {
      const telefone = this.telefone.trim();

      if (!/^[1-9][0-9]{9,10}$/.test(telefone)) {
        this.erro.set('Informe o telefone com DDD e somente números.');
        return;
      }

      if (
        !this.senha.trim() ||
        this.senha.length < 12 ||
        new TextEncoder().encode(this.senha).length > 72
      ) {
        this.erro.set('Use uma senha com pelo menos 12 caracteres e até 72 bytes.');
        return;
      }

      if (this.senha !== this.confirmarSenha) {
        this.erro.set('A confirmação precisa ser igual à senha.');
        return;
      }

      const nome = this.nome.trim();
      const nomeAluno = this.nomeAluno.trim();
      const dataNascimento = this.dataNascimento;

      if (!nome || !nomeAluno) {
        this.erro.set('Informe o nome do responsável e o nome do aluno.');
        return;
      }

      const erroNascimento = this.erroDataNascimento();
      if (erroNascimento) {
        this.erro.set(erroNascimento);
        return;
      }

      const resultado = await firstValueFrom(
        this.http.post<{ mensagem: string }>(`${this.api}/concluir`, {
          token: this.token,
          nome,
          telefone,
          senha: this.senha,
          nomeAluno,
          dataNascimento,
          aceitouDocumentos: this.aceitouDocumentos,
          versaoTermos: convite.documentos.versao,
        }),
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
      const mensagem: unknown =
        erro instanceof HttpErrorResponse && erro.status >= 400 && erro.status < 500
          ? (erro.error?.detail ?? erro.error?.mensagem)
          : null;

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
