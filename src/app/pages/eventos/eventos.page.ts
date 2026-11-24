import { Component, Injector } from '@angular/core';
import { ViewWillEnter } from '@ionic/angular';
import { EventoDTO } from 'src/app/model/evento.dto';
import { GenericClass } from 'src/app/model/generic.class';
import { EventoService } from 'src/app/services/evento.service';
import { ModalDetalharEventoPage } from './modal-detalhar-evento/modal-detalhar-evento.page';

/** Quantidade de itens fictícios exibidos no skeleton enquanto a tela carrega. */
const ITENS_SKELETON = [1, 2];

/** Eventos acontecendo hoje na loja; o calendário completo fica em /eventos/calendario. */
@Component({
  selector: 'app-eventos',
  templateUrl: './eventos.page.html',
  styleUrls: ['./eventos.page.scss'],
})
export class EventosPage extends GenericClass implements ViewWillEnter {

  public eventosDeHoje: EventoDTO[] = [];
  public carregando = true;
  public readonly itensSkeleton = ITENS_SKELETON;
  public readonly hoje = new Date();

  constructor(
    public injector: Injector,
    private eventoService: EventoService
  ) {
    super(injector);
  }

  ionViewWillEnter(): void {
    this.carregando = true;
    this.eventoService.getHoje().subscribe({
      next: res => {
        this.eventosDeHoje = res;
        this.carregando = false;
      },
      error: () => (this.carregando = false)
    });
  }

  async abrirEvento(evento: EventoDTO) {
    (await this.modalController.create({
      component: ModalDetalharEventoPage,
      breakpoints: [0.8, 1],
      initialBreakpoint: 0.8,
      componentProps: { evento }
    })).present();
  }

}
