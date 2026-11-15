import { Component, Input, OnInit } from '@angular/core';
import { ParametrosService } from 'src/app/services/parametros.service';

@Component({
  selector: 'app-modal-informacoes',
  templateUrl: './modal-informacoes.page.html',
  styleUrls: ['./modal-informacoes.page.scss'],
})
export class ModalInformacoesPage implements OnInit {

  /** Parâmetro cujo conteúdo é exibido; carregado aqui para o modal abrir na hora, com skeleton. */
  @Input()
  public nomeParametro: string;

  @Input()
  public title: string;

  public content = '';
  public carregando = true;

  constructor(private parametrosService: ParametrosService) { }

  ngOnInit(): void {
    this.parametrosService.getByName(this.nomeParametro).subscribe({
      next: res => {
        this.content = res?.descricao ?? '';
        this.carregando = false;
      },
      error: () => (this.carregando = false)
    });
  }

}
