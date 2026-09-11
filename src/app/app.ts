import { Component } from '@angular/core';
import { Alunos } from './alunos/alunos';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [Alunos],
  template: '<app-alunos />'
})
export class App {}
