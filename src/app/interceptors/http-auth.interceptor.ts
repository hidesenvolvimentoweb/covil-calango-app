import { Injectable, Injector } from '@angular/core';
import {
  HTTP_INTERCEPTORS, HttpErrorResponse, HttpEvent, HttpHandler, HttpInterceptor, HttpRequest
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { KEY_TOKEN, StorageService } from '../services/storage.service';
import { SessaoService } from '../services/sessao.service';

const HTTP_STATUS_UNAUTHORIZED = 401;

/**
 * Envia o token do visitante (recebido quando o balcão aceita a solicitação de comanda) em todas as
 * chamadas à API. Se a API responder 401 (token ausente, inválido ou expirado), a sessão é encerrada
 * e o app volta para a geração de comanda.
 */
@Injectable()
export class HttpAuthInterceptor implements HttpInterceptor {

  constructor(private storageService: StorageService, private injector: Injector) {}

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    if (!request.url.startsWith(environment.url)) {
      return next.handle(request);
    }
    const token = this.storageService.get<string>(KEY_TOKEN);
    const autenticada = token
      ? request.clone({ setHeaders: { authorization: `Bearer ${token}` } })
      : request;

    return next.handle(autenticada).pipe(
      catchError((error: unknown) => {
        if (token && error instanceof HttpErrorResponse && error.status === HTTP_STATUS_UNAUTHORIZED) {
          // Obtido sob demanda para evitar dependência circular (HttpClient -> interceptor -> sessão).
          void this.injector.get(SessaoService).encerrarSessao();
        }
        return throwError(() => error);
      })
    );
  }
}

export const HTTP_AUTH_INTERCEPTOR_PROVIDER = {
  provide: HTTP_INTERCEPTORS,
  useClass: HttpAuthInterceptor,
  multi: true
};
