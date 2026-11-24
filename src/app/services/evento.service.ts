import { HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';
import { semLoading } from '../interceptors/http-loading.interceptor';
import { EventoDTO, EventoParticipanteDTO } from '../model/evento.dto';
import { formatarDataHoraLocal } from '../utils/data-hora.util';
import { AbstractGenericClass } from './generic.service';

/** As telas de eventos exibem skeleton enquanto carregam, por isso as consultas não usam o loading global. */
@Injectable({ providedIn: 'root' })
export class EventoService extends AbstractGenericClass {

  override urlController = `${environment.url}/api/evento`;

  /** Eventos acontecendo hoje (no dia do estabelecimento). */
  getHoje() {
    return this.httpClient.get<EventoDTO[]>(`${this.urlController}/hoje`, semLoading());
  }

  /** Eventos que acontecem, ao menos em parte, no período informado. */
  getByPeriodo(inicio: Date, fim: Date) {
    const params = new HttpParams()
      .set('inicio', formatarDataHoraLocal(inicio))
      .set('fim', formatarDataHoraLocal(fim));
    return this.httpClient.get<EventoDTO[]>(`${this.urlController}`, { params, ...semLoading() });
  }

  /** Evento atualizado (participantes e se a comanda deste aparelho está inscrita). */
  getEvento(id: number) {
    return this.httpClient.get<EventoDTO>(`${this.urlController}/${id}`, semLoading());
  }

  getParticipantes(id: number) {
    return this.httpClient.get<EventoParticipanteDTO[]>(`${this.urlController}/${id}/participantes`, semLoading());
  }

  /** Participa com a comanda deste aparelho; a inscrição paga entra na comanda. */
  participar(id: number) {
    return this.httpClient.post<void>(`${this.urlController}/${id}/participacao`, null);
  }

  /** Sai do evento; o valor da inscrição sai da comanda. */
  sair(id: number) {
    return this.httpClient.delete<void>(`${this.urlController}/${id}/participacao`);
  }

}
