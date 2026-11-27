import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';
import { semLoading } from '../interceptors/http-loading.interceptor';
import { AbstractGenericClass } from './generic.service';

/** Avisos de abertura e fechamento da cozinha, enviados pela equipe (tela de Pedidos do web). */
export const TOPICO_COZINHA = '/topic/cozinha';

export interface CozinhaDTO {
  aberta: boolean;
}

/** Com a cozinha fechada, os produtos preparados nela (usaCozinha) não podem ser pedidos. */
@Injectable({ providedIn: 'root' })
export class CozinhaService extends AbstractGenericClass {

  override urlController = `${environment.url}/api/cozinha`;

  getSituacao() {
    return this.httpClient.get<CozinhaDTO>(this.urlController, semLoading());
  }

}
