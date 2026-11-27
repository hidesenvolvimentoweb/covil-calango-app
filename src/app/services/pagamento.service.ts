import { Injectable } from '@angular/core';
import { HttpClient, HttpContext } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { PagamentoCartaoRequestDTO, PagamentoConfiguracaoDTO, PagamentoDTO } from '../model/pagamento.dto';
import { SEM_LOADING } from '../interceptors/http-loading.interceptor';
import { SEM_ALERTA_ERRO } from '../interceptors/http-error.interceptor';

/** Tópico do websocket que recebe as atualizações de pagamento da comanda (ex.: PIX aprovado). */
export const topicoPagamentosDaComanda = (numeroComanda: number | string) => `/topic/pagamentos/${numeroComanda}`;

/**
 * Pagamento da comanda pelo app. O valor é sempre calculado pela API; com o pagamento aprovado
 * a API fecha a comanda.
 */
@Injectable({ providedIn: 'root' })
export class PagamentoService {

  private readonly urlController = `${environment.url}/api/pagamento`;

  constructor(private httpClient: HttpClient) {}

  /** Gera o PIX da comanda, ou devolve o PIX pendente se ainda for válido. */
  gerarPix(numeroComanda: number | string): Observable<PagamentoDTO> {
    return this.httpClient.post<PagamentoDTO>(`${this.urlController}/comanda/${numeroComanda}/pix`, null);
  }

  /**
   * Último pagamento da comanda (null se ainda não houve tentativa). Usada em segundo plano:
   * sem loading global e sem alerta de erro.
   */
  consultar(numeroComanda: number | string): Observable<PagamentoDTO | null> {
    return this.httpClient.get<PagamentoDTO | null>(`${this.urlController}/comanda/${numeroComanda}`, {
      context: new HttpContext().set(SEM_LOADING, true).set(SEM_ALERTA_ERRO, true)
    });
  }

  /** Formas de pagamento disponíveis e a chave pública do formulário de cartão. */
  getConfiguracao(): Observable<PagamentoConfiguracaoDTO> {
    return this.httpClient.get<PagamentoConfiguracaoDTO>(`${this.urlController}/configuracao`, {
      context: new HttpContext().set(SEM_LOADING, true).set(SEM_ALERTA_ERRO, true)
    });
  }

  /**
   * Cobra a comanda à vista no cartão (token gerado pelo formulário do Mercado Pago). A resposta traz o resultado:
   * pago, recusado (com o motivo) ou pendente (em análise ou aguardando a verificação do banco).
   * Sem loading global: o formulário mostra o próprio andamento.
   */
  pagarComCartao(numeroComanda: number | string, cartao: PagamentoCartaoRequestDTO): Observable<PagamentoDTO> {
    return this.httpClient.post<PagamentoDTO>(`${this.urlController}/comanda/${numeroComanda}/cartao`, cartao, {
      context: new HttpContext().set(SEM_LOADING, true)
    });
  }

  /** Link para pagar na conta do Mercado Pago (ou o link pendente, se ainda valer). */
  pagarComMercadoPago(numeroComanda: number | string): Observable<PagamentoDTO> {
    return this.httpClient.post<PagamentoDTO>(`${this.urlController}/comanda/${numeroComanda}/mercado-pago`, null);
  }

  /** Cancela o pagamento pendente (PIX, cartão ou Mercado Pago). Se ele já tinha sido pago, devolve o aprovado. */
  cancelarPix(numeroComanda: number | string): Observable<PagamentoDTO> {
    return this.httpClient.delete<PagamentoDTO>(`${this.urlController}/comanda/${numeroComanda}/pix`);
  }

}
