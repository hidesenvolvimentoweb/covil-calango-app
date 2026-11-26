import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';
import { semLoading } from '../interceptors/http-loading.interceptor';
import { PacoteConfiguracaoDTO, PacoteDTO } from '../model/pacote.dto';
import { AbstractGenericClass } from './generic.service';

@Injectable({ providedIn: 'root' })
export class PacoteService extends AbstractGenericClass {

  override urlController = `${environment.url}/api/pacote`;

  getConfiguracao() {
    return this.httpClient.get<PacoteConfiguracaoDTO>(`${this.urlController}/configuracao`, semLoading());
  }

  /** Pacotes deixados com a comanda deste aparelho. */
  getMeus() {
    return this.httpClient.get<PacoteDTO[]>(`${this.urlController}/meus`, semLoading());
  }

  /** Deixa um pacote: a foto é obrigatória e a taxa entra na comanda. */
  depositar(dados: { categoria: string; descricao: string; destinatario: string }, foto: Blob) {
    const formulario = new FormData();
    formulario.append('categoria', dados.categoria);
    formulario.append('descricao', dados.descricao);
    formulario.append('destinatario', dados.destinatario);
    formulario.append('foto', foto, 'pacote.jpg');
    return this.httpClient.post<PacoteDTO>(this.urlController, formulario);
  }

  /** Cancela um pacote ainda não retirado; a taxa sai da comanda. */
  cancelar(id: number) {
    return this.httpClient.delete<void>(`${this.urlController}/meus/${id}`);
  }

}
