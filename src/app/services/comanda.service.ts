import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';
import { AbstractGenericClass } from './generic.service';
import { ComandaDTO } from '../model/comanda.dto';
import { semLoading } from '../interceptors/http-loading.interceptor';

@Injectable({ providedIn: 'root' })
export class ComandaService extends AbstractGenericClass {

  override urlController = `${environment.url}/api/comanda`;

  gerarComanda(nome: string) {
    return this.httpClient.post<ComandaDTO>(`${this.urlController}/gerar/${encodeURIComponent(nome)}`, null);
  }

  /** Usado na validação da comanda a cada troca de tela, por isso não exibe o loading global. */
  getByNumero(numero: number | string) {
    return this.httpClient.get<ComandaDTO>(`${this.urlController}/${numero}`, semLoading());
  }

}
