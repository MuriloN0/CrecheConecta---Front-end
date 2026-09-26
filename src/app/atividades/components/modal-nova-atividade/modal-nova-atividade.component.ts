import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AtividadeTabela } from '../../model/atividades.model';

@Component({
  selector: 'app-modal-nova-atividade',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './modal-nova-atividade.component.html',
  styleUrls: ['./modal-nova-atividade.component.scss']
})
export class ModalNovaAtividadeComponent implements OnInit {
  @Input() isHome: boolean = true;
  @Input() isEditing: boolean = false;
  @Input() atividadeEdicao: AtividadeTabela | null = null;
  @Output() fechar = new EventEmitter<void>();
  @Output() salvar = new EventEmitter<any>();

  turmasMock = [
    { id: '735cbac2-e883-4b4a-9323-c19f356ef4f0', nome: 'Turma 3' }];

  turmaSelecionada: string = '';
  tentouSalvar: boolean = false;

  novaAtividade = {
    nome: '',
    dataEntrega: '',
    observacoes: ''
  };

  ngOnInit(): void {
    if (this.isEditing && this.atividadeEdicao) {
      this.novaAtividade = {
        nome: this.atividadeEdicao.atividadeOriginal.titulo,
        dataEntrega: this.atividadeEdicao.atividadeOriginal.prazoConclusao || '',
        observacoes: this.atividadeEdicao.atividadeOriginal.descricao || ''
      };
      this.turmaSelecionada = this.atividadeEdicao.atividadeOriginal.turmaId || '';
    }
  }

  fecharModal(): void {
    this.fechar.emit();
  }

  salvarAtividade(): void {
    this.tentouSalvar = true;

    const nomeValido = !!this.novaAtividade.nome.trim();
    const turmaValida = !!this.turmaSelecionada;
    const dataValida = !this.isHome || !!this.novaAtividade.dataEntrega;

    if (!nomeValido || !turmaValida || !dataValida) {
      return;
    }

    this.salvar.emit({
      isEdit: this.isEditing,
      id: this.atividadeEdicao?.id,
      atividade: this.novaAtividade,
      turmaId: this.turmaSelecionada
    });
  }
}