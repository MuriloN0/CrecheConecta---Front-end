import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ModalNovaAtividadeComponent } from './components/modal-nova-atividade/modal-nova-atividade.component';
import { ModalExcluirAtividadeComponent } from './components/modal-excluir-atividade/modal-excluir-atividade.component';
import { AtividadeTabela, AtividadeResponseDTO, NovaAtividadeRequestDTO } from './model/atividades.model';
import { ModalVisualizarAtividadeComponent } from './components/modal-visualizar-atividade/modal-visualizar-atividade.component';
import { AtividadesService } from './service/atividades.service';

@Component({
  selector: 'app-atividades',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ModalNovaAtividadeComponent,
    ModalExcluirAtividadeComponent,
    ModalVisualizarAtividadeComponent
  ],
  templateUrl: './atividades.component.html',
  styleUrls: ['./atividades.component.scss']
})
export class AtividadesComponent implements OnInit {
  atividades: AtividadeTabela[] = [];
  isHome: boolean = true;
  mostrarModal: boolean = false;
  isEditing: boolean = false;
  atividadeParaEditar: AtividadeTabela | null = null;
  mostrarModalExcluir: boolean = false;
  atividadeParaExcluir: AtividadeTabela | null = null;
  mostrarModalVisualizar: boolean = false;
  atividadeParaVisualizar: AtividadeTabela | null = null;
  mensagemSucesso: string = '';

  constructor(
    private atividadesService: AtividadesService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.carregarAtividades();
  }

  carregarAtividades(): void {
    const tipoFiltro = this.isHome ? 'CASA' : 'DIA';
    
    this.atividadesService.listarTodas(undefined, tipoFiltro).subscribe({
      next: (dados: AtividadeResponseDTO[]) => {
        this.atividades = dados.map(atividade => ({
          id: atividade.id,
          titulo: atividade.titulo,
          turma: 'Turma Geral',
          dataCriacao: this.formatarData(atividade.dataCriacao),
          dataEntrega: atividade.prazoConclusao ? this.formatarData(atividade.prazoConclusao) : '-',
          atividadeOriginal: atividade
        }));
        this.cdr.detectChanges();
      },
      error: (erro) => {
        console.error(erro);
      }
    });
  }

  private formatarData(dataString: string): string {
    if (!dataString) return '';
    if (dataString.length === 10 && dataString.includes('-')) {
      const [ano, mes, dia] = dataString.split('-');
      return `${dia}/${mes}/${ano}`;
    }
    const date = new Date(dataString);
    return date.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
  }

  private exibirMensagem(texto: string): void {
    this.mensagemSucesso = texto;
    setTimeout(() => {
      this.mensagemSucesso = '';
      this.cdr.detectChanges();
    }, 4000);
  }

  setHome(value: boolean): void {
    if (this.isHome === value) {
      return; 
    }
    this.isHome = value;
    this.carregarAtividades();
  }

  abrirModalCriar(): void {
    this.isEditing = false;
    this.atividadeParaEditar = null;
    this.mostrarModal = true;
  }

  abrirModalEditar(atividade: AtividadeTabela): void {
    this.isEditing = true;
    this.atividadeParaEditar = atividade;
    this.mostrarModal = true;
  }

  fecharModal(): void {
    this.mostrarModal = false;
    this.isEditing = false;
    this.atividadeParaEditar = null;
  }

  salvarAtividade(dadosModal: any): void {
    const tipoAtividade = this.isHome ? 'CASA' : 'DIA';
    const professorIdTemp = '735cbac2-e883-4b4a-9323-c19f356ef4f0';

    if (dadosModal.isEdit) {
      const payloadAtualizacao = {
        tipo: tipoAtividade,
        titulo: dadosModal.atividade.nome,
        descricao: dadosModal.atividade.observacoes || null,
        prazoConclusao: this.isHome && dadosModal.atividade.dataEntrega ? dadosModal.atividade.dataEntrega : null
      };

      this.atividadesService.atualizarParcial(dadosModal.id, payloadAtualizacao).subscribe({
        next: () => {
          this.fecharModal();
          this.carregarAtividades();
          this.exibirMensagem('Atividade editada com sucesso!');
        },
        error: (erro) => {
          console.error(erro);
        }
      });
    } else {
      const novaAtiv: NovaAtividadeRequestDTO = {
        professorId: dadosModal.atividade.professorId || professorIdTemp,
        tipo: tipoAtividade,
        titulo: dadosModal.atividade.nome,
        descricao: dadosModal.atividade.observacoes || undefined,
        prazoConclusao: this.isHome && dadosModal.atividade.dataEntrega ? dadosModal.atividade.dataEntrega : undefined
      };

      this.atividadesService.criar(novaAtiv, dadosModal.turmaId).subscribe({
        next: () => {
          this.fecharModal();
          this.carregarAtividades();
          this.exibirMensagem('Atividade cadastrada com sucesso!');
        },
        error: (erro) => {
          console.error(erro);
        }
      });
    }
  }

  visualizarAtividade(atividade: AtividadeTabela): void {
    this.atividadeParaVisualizar = atividade;
    this.mostrarModalVisualizar = true;
  }

  fecharModalVisualizar(): void {
    this.mostrarModalVisualizar = false;
    this.atividadeParaVisualizar = null;
  }

  abrirModalApagar(atividade: AtividadeTabela): void {
    this.atividadeParaExcluir = atividade;
    this.mostrarModalExcluir = true;
  }

  fecharModalApagar(): void {
    this.mostrarModalExcluir = false;
    this.atividadeParaExcluir = null;
  }

  confirmarExclusao(): void {
    if (this.atividadeParaExcluir) {
      this.atividadesService.deletar(this.atividadeParaExcluir.id).subscribe({
        next: () => {
          this.fecharModalApagar();
          this.carregarAtividades();
          this.exibirMensagem('Atividade excluída com sucesso!');
        },
        error: (erro) => {
          console.error(erro);
          this.fecharModalApagar();
        }
      });
    } else {
      this.fecharModalApagar();
    }
  }
}