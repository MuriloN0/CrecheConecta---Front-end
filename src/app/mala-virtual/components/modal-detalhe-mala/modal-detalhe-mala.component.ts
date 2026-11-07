import { DatePipe } from '@angular/common';
import { Component, computed, input, output } from '@angular/core';
import { MalaTurma, ProgressoAluno } from '../../model/mala-virtual.model';
import { DialogoModalDirective } from '../dialogo-modal.directive';

@Component({
  selector: 'app-modal-detalhe-mala',
  standalone: true,
  imports: [DatePipe, DialogoModalDirective],
  templateUrl: './modal-detalhe-mala.component.html',
})
export class ModalDetalheMalaComponent {
  readonly mala = input.required<MalaTurma>();
  readonly nomeTurma = input('');
  readonly progresso = input<ProgressoAluno[]>([]);
  readonly carregando = input(false);
  readonly erro = input('');
  readonly podeAlterar = input(false);

  readonly fechar = output<void>();
  readonly atualizar = output<void>();
  readonly editar = output<void>();
  readonly excluir = output<void>();

  readonly completos = computed(
    () => this.progresso().filter((aluno) => aluno.completo).length,
  );

  observacoes(aluno: ProgressoAluno): number {
    return aluno.itens.filter((item) => item.observacao).length;
  }

  percentual(aluno: ProgressoAluno): number {
    return aluno.totalItens > 0 ? (aluno.itensEnviados / aluno.totalItens) * 100 : 0;
  }
}
