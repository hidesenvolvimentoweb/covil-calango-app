import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { KEY_USUARIO, StorageService } from '../services/storage.service';
import { JogadorDTO } from '../model/jogador.dto';
import { ComandaService } from '../services/comanda.service';

@Injectable({ providedIn: 'root' })
export class LoginGuard implements CanActivate {

  constructor(
    private storageService: StorageService,
    private comandaService: ComandaService,
    private router: Router
  ) {}

  canActivate(): Observable<boolean> | boolean {
    const usuario: JogadorDTO = this.storageService.get(KEY_USUARIO) as JogadorDTO;
    const numeroComanda = usuario?.comanda?.numero;

    if (!usuario) {
      this.router.navigate(['login']);
      return false;
    }

    if (!numeroComanda) {
      return true;
    }

    return this.comandaService.getByNumero(numeroComanda).pipe(
      map(comanda => {
        if (comanda.status === 'Fechada') {
          this.storageService.remove(KEY_USUARIO);
          this.router.navigate(['login']);
          return false;
        }
        return true;
      }),
      // The HTTP error interceptor notifies the user; preserve the stored session if status cannot be checked.
      catchError(() => of(true))
    );
  }

}
