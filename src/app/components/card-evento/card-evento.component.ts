import { Component, Input } from '@angular/core';
import { fromTipoEventoEnumValue, getIconeTipoEvento } from 'src/app/enums/tipo-evento.enum';
import { EventoDTO } from 'src/app/model/evento.dto';
import { mesmoDia } from 'src/app/utils/data-hora.util';

/** Cartão de um evento nas listas do app (hoje e próximos). O toque é tratado por quem usa o componente. */
@Component({
  selector: 'app-ygo-card-evento',
  templateUrl: './card-evento.component.html',
  styleUrls: ['./card-evento.component.scss'],
})
export class CardEventoComponent {

  @Input()
  public evento!: EventoDTO;

  /** Exibe a data além do horário (nas listas de próximos eventos). */
  @Input()
  public exibirData = false;

  get rotuloTipo(): string {
    return fromTipoEventoEnumValue(this.evento?.tipo);
  }

  get icone(): string {
    return getIconeTipoEvento(this.evento?.tipo);
  }

  get mesmoDia(): boolean {
    return mesmoDia(this.evento?.dataHoraInicio, this.evento?.dataHoraFim);
  }

  /** O evento já começou e ainda não terminou. */
  get acontecendoAgora(): boolean {
    const agora = Date.now();
    return !!this.evento?.dataHoraInicio && !!this.evento?.dataHoraFim
      && new Date(this.evento.dataHoraInicio).getTime() <= agora
      && agora < new Date(this.evento.dataHoraFim).getTime();
  }

}
