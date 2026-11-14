import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { KEY_COMANDA, StorageService } from '../services/storage.service';
import { ComandaService } from '../services/comanda.service';
import { SessaoService } from '../services/sessao.service';
import { ComandaDTO } from '../model/comanda.dto';

/**
 * Só permite acessar o app com uma comanda aberta. Comanda fechada expira a sessão
 * e volta para a tela de geração de comanda.
 */
@Injectable({ providedIn: 'root' })
export class LoginGuard implements CanActivate {

  constructor(
    private storageService: StorageService,
    private comandaService: ComandaService,
    private sessaoService: SessaoService,
    private router: Router
  ) {}

  canActivate(): Observable<boolean> | boolean {
    const comanda = this.storageService.get<ComandaDTO>(KEY_COMANDA);

    if (!comanda?.numero) {
      void this.sessaoService.encerrarSessao();
      this.router.navigate(['login']);
      return false;
    }

    return this.comandaService.getByNumero(comanda.numero).pipe(
      map(c => {
        if (SessaoService.isComandaFechada(c)) {
          void this.sessaoService.encerrarSessao(true);
          return false;
        }
        return true;
      }),
      catchError(() => of(true))
    );
  }

}
