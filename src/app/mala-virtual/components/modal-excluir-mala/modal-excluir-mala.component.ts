import { DatePipe } from '@angular/common';
import { Component, input, output } from '@angular/core';
import { MalaTurma } from '../../model/mala-virtual.model';
import { DialogoModalDirective } from '../dialogo-modal.directive';

@Component({
  selector: 'app-modal-excluir-mala',
  standalone: true,
  imports: [DatePipe, DialogoModalDirective],
  templateUrl: './modal-excluir-mala.component.html',
})
export class ModalExcluirMalaComponent {
  readonly mala = input.required<MalaTurma>();
  readonly excluindo = input(false);
  readonly erro = input('');

  readonly confirmar = output<void>();
  readonly cancelar = output<void>();
}
