import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AtividadeTabela } from '../../model/atividades.model';

@Component({
  selector: 'app-modal-visualizar-atividade',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './modal-visualizar-atividade.component.html',
  styleUrls: ['./modal-visualizar-atividade.component.scss']
})
export class ModalVisualizarAtividadeComponent {
  @Input() isHome: boolean = true;
  @Input() atividade: AtividadeTabela | null = null;
  
  @Output() fechar = new EventEmitter<void>();

  fecharModal(): void {
    this.fechar.emit();
  }
}