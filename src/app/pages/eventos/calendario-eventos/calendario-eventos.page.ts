import { Component, Injector } from '@angular/core';
import { ViewWillEnter } from '@ionic/angular';
import { CalendarOptions, EventClickArg, EventInput, EventSourceFuncArg } from '@fullcalendar/core';
import ptBrLocale from '@fullcalendar/core/locales/pt-br';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin, { DateClickArg } from '@fullcalendar/interaction';
import { getCorTipoEvento } from 'src/app/enums/tipo-evento.enum';
import { EventoDTO } from 'src/app/model/evento.dto';
import { GenericClass } from 'src/app/model/generic.class';
import { EventoService } from 'src/app/services/evento.service';
import { ModalDetalharEventoPage } from '../modal-detalhar-evento/modal-detalhar-evento.page';

/** Período da lista de próximos eventos, a partir de agora. */
const DIAS_PROXIMOS_EVENTOS = 60;
const ITENS_SKELETON = [1, 2];

/**
 * Calendário do mês e, abaixo, a lista de próximos eventos. Tocar em um dia troca a lista pelos eventos daquele dia.
 */
@Component({
  selector: 'app-calendario-eventos',
  templateUrl: './calendario-eventos.page.html',
  styleUrls: ['./calendario-eventos.page.scss'],
})
export class CalendarioEventosPage extends GenericClass implements ViewWillEnter {

  public eventos: EventoDTO[] = [];
  public carregando = true;
  public readonly itensSkeleton = ITENS_SKELETON;
  /** Dia tocado no calendário; nulo: lista de próximos eventos. */
  public diaSelecionado: Date | null = null;

  public readonly opcoesCalendario: CalendarOptions = {
    plugins: [dayGridPlugin, interactionPlugin],
    locale: ptBrLocale,
    initialView: 'dayGridMonth',
    headerToolbar: { left: 'prev', center: 'title', right: 'next' },
    height: 'auto',
    fixedWeekCount: false,
    dayMaxEvents: 2,
    eventDisplay: 'block',
    displayEventTime: false,
    eventClick: clique => this.abrirEventoDoCalendario(clique),
    dateClick: clique => this.selecionarDia(clique),
    events: (periodo, sucesso, falha) => this.carregarEventosDoCalendario(periodo, sucesso, falha)
  };

  constructor(
    public injector: Injector,
    private eventoService: EventoService
  ) {
    super(injector);
  }

  ionViewWillEnter(): void {
    this.carregarLista();
  }

  verProximos(): void {
    this.diaSelecionado = null;
    this.carregarLista();
  }

  /** Ao fechar o detalhe, a lista é recarregada: o cliente pode ter entrado ou saído do evento. */
  async abrirEvento(evento: EventoDTO) {
    const modal = await this.modalController.create({
      component: ModalDetalharEventoPage,
      breakpoints: [0.8, 1],
      initialBreakpoint: 0.8,
      componentProps: { evento }
    });
    void modal.onDidDismiss().then(() => this.carregarLista());
    await modal.present();
  }

  private selecionarDia(clique: DateClickArg): void {
    this.diaSelecionado = clique.date;
    this.carregarLista();
  }

  private abrirEventoDoCalendario(clique: EventClickArg): void {
    this.abrirEvento(clique.event.extendedProps.evento as EventoDTO);
  }

  /** Lista abaixo do calendário: eventos do dia tocado ou, sem dia, os próximos a partir de agora. */
  private carregarLista(): void {
    const inicio = this.diaSelecionado ? new Date(this.diaSelecionado) : new Date();
    const fim = new Date(inicio);
    fim.setDate(fim.getDate() + (this.diaSelecionado ? 1 : DIAS_PROXIMOS_EVENTOS));
    this.carregando = true;
    this.eventoService.getByPeriodo(inicio, fim).subscribe({
      next: res => {
        this.eventos = res;
        this.carregando = false;
      },
      error: () => (this.carregando = false)
    });
  }

  private carregarEventosDoCalendario(
    periodo: EventSourceFuncArg,
    sucesso: (eventos: EventInput[]) => void,
    falha: (erro: Error) => void
  ): void {
    this.eventoService.getByPeriodo(periodo.start, periodo.end).subscribe({
      next: res => sucesso(res.map(evento => {
        const cor = getCorTipoEvento(evento.tipo);
        return {
          id: String(evento.id),
          title: evento.nome,
          start: evento.dataHoraInicio,
          end: evento.dataHoraFim,
          backgroundColor: cor,
          borderColor: cor,
          textColor: '#fff',
          extendedProps: { evento }
        };
      })),
      error: erro => falha(erro)
    });
  }

}
