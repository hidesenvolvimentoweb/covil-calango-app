import { Component, Input } from '@angular/core';
import { fromTipoEventoEnumValue, getIconeTipoEvento } from 'src/app/enums/tipo-evento.enum';
import { EventoDTO } from 'src/app/model/evento.dto';
import { mesmoDia } from 'src/app/utils/data-hora.util';

@Component({
  selector: 'app-modal-detalhar-evento',
  templateUrl: './modal-detalhar-evento.page.html',
  styleUrls: ['./modal-detalhar-evento.page.scss'],
})
export class ModalDetalharEventoPage {

  @Input()
  public evento!: EventoDTO;

  get rotuloTipo(): string {
    return fromTipoEventoEnumValue(this.evento?.tipo);
  }

  get icone(): string {
    return getIconeTipoEvento(this.evento?.tipo);
  }

  get mesmoDia(): boolean {
    return mesmoDia(this.evento?.dataHoraInicio, this.evento?.dataHoraFim);
  }

}
