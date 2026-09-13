import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-modal-excluir-atividade',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './modal-excluir-atividade.component.html',
  styleUrls: ['./modal-excluir-atividade.component.scss']
})
export class ModalExcluirAtividadeComponent {
  @Output() cancelar = new EventEmitter<void>();
  @Output() confirmar = new EventEmitter<void>();

  aoCancelar(): void {
    this.cancelar.emit();
  }

  aoConfirmar(): void {
    this.confirmar.emit();
  }
}