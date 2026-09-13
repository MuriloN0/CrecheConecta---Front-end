import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { finalize } from 'rxjs';
import { AlunosApi } from './alunos.api';
import { Aluno, DadosAluno, Pagina, ResumoAluno } from './alunos.model';

@Component({
  selector: 'app-alunos',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './alunos.html',
  styleUrl: './alunos.scss'
})
export class Alunos implements OnInit {
  private readonly api = inject(AlunosApi);
  readonly resultado = signal<Pagina<ResumoAluno> | null>(null);
  readonly ocupado = signal(false);
  readonly erro = signal('');
  readonly aviso = signal('');
  readonly modo = signal<'lista' | 'novo' | 'editar' | 'visualizar'>('lista');
  selecionado: Aluno | null = null;
  dados = this.vazio();
  tentouSalvar = false;
  readonly telefonePattern = '[0-9 ()+.\\-]{10,30}';

  ngOnInit() { this.carregar(); }

  carregar(pagina = 0) {
    this.ocupado.set(true);
    this.erro.set('');
    this.api.listar(pagina).pipe(finalize(() => this.ocupado.set(false)))
      .subscribe({
        next: resultado => this.resultado.set(resultado),
        error: erro => this.falha(erro)
      });
  }

  novo() {
    this.dados = this.vazio();
    this.selecionado = null;
    this.tentouSalvar = false;
    this.erro.set('');
    this.aviso.set('');
    this.modo.set('novo');
  }

  abrir(id: string, editar: boolean) {
    this.ocupado.set(true);
    this.erro.set('');
    this.aviso.set('');
    this.api.buscar(id).pipe(finalize(() => this.ocupado.set(false)))
      .subscribe({
        next: aluno => {
          this.selecionado = aluno;
          this.dados = {
            nome: aluno.nome, endereco: aluno.endereco,
            emailContato: aluno.emailContato, telefoneContato: aluno.telefoneContato,
            responsaveis: aluno.responsaveis.map(r => ({ ...r }))
          };
          this.tentouSalvar = false;
          this.modo.set(editar && aluno.ativo ? 'editar' : 'visualizar');
        },
        error: erro => this.falha(erro)
      });
  }

  adicionarResponsavel() {
    if (this.dados.responsaveis.length < 5) {
      this.dados.responsaveis.push({ nome: '', parentesco: '', email: null, telefone: '' });
    }
  }

  salvar(formulario: NgForm) {
    if (this.ocupado() || this.modo() === 'visualizar') return;
    this.tentouSalvar = true;
    if (formulario.invalid) { formulario.control.markAllAsTouched(); return; }
    const dados: DadosAluno = {
      ...this.dados,
      nome: this.dados.nome.trim(),
      endereco: this.dados.endereco?.trim() || null,
      emailContato: this.dados.emailContato.trim(),
      responsaveis: this.dados.responsaveis.map(r => ({ ...r, email: r.email?.trim() || null }))
    };
    this.ocupado.set(true);
    this.erro.set('');
    const operacao = this.selecionado
      ? this.api.atualizar(this.selecionado.id, this.selecionado.versao, dados)
      : this.api.cadastrar(dados);
    operacao.subscribe({
      next: () => {
        this.modo.set('lista');
        this.aviso.set('Cadastro salvo com sucesso.');
        this.carregar(this.resultado()?.pagina ?? 0);
      },
      error: erro => { this.ocupado.set(false); this.falha(erro); }
    });
  }

  voltar() {
    if (this.modo() !== 'visualizar' && !window.confirm('Sair do formulário? Alterações não salvas serão descartadas.')) return;
    this.modo.set('lista');
    this.erro.set('');
  }

  inativar(aluno: ResumoAluno) {
    if (!window.confirm(`Inativar ${aluno.nome}? O cadastro será preservado.`)) return;
    this.ocupado.set(true);
    this.erro.set('');
    this.api.inativar(aluno.id, aluno.versao).subscribe({
      next: () => {
        this.aviso.set('Aluno inativado.');
        this.carregar(this.resultado()?.pagina ?? 0);
      },
      error: erro => { this.ocupado.set(false); this.falha(erro); }
    });
  }

  private vazio(): DadosAluno {
    return { nome: '', endereco: null, emailContato: '', telefoneContato: '', responsaveis: [] };
  }

  private falha(erro: HttpErrorResponse) {
    if (erro.status === 401) this.erro.set('Sua sessão não está autenticada. Entre novamente.');
    else if (erro.status === 403) this.erro.set('A operação foi bloqueada. Confira sua sessão e autorização.');
    else if (erro.status === 409) this.erro.set('O cadastro mudou. Volte à lista, atualize e abra o aluno novamente antes de editar.');
    else if (erro.status === 0) this.erro.set('Não foi possível conectar ao servidor. Tente novamente.');
    else this.erro.set(erro.error?.detail || 'Não foi possível concluir a operação.');
  }
}
