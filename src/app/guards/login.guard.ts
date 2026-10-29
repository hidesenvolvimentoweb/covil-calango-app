import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { KEY_COMANDA, KEY_USUARIO, StorageService } from '../services/storage.service';
import { ComandaService } from '../services/comanda.service';
import { ComandaDTO } from '../model/comanda.dto';
import { UsuarioDTO } from '../model/usuario.dto';

@Injectable({ providedIn: 'root' })
export class LoginGuard implements CanActivate {

  constructor(
    private storageService: StorageService,
    private comandaService: ComandaService,
    private router: Router
  ) {}

  canActivate(): Observable<boolean> | boolean {
    const comanda: ComandaDTO | null = this.storageService.get(KEY_COMANDA) as ComandaDTO | null;

    if (!comanda?.usuario) {
      const usuario = this.storageService.get<UsuarioDTO>(KEY_USUARIO);
      if (usuario?.perfis?.length) {
        return true;
      }
      this.router.navigate(['login']);
      return false;
    }

    if (!comanda?.numero) {
      return true;
    }

    return this.comandaService.getByNumero(comanda?.numero).pipe(
      map(c => {
        if (c.status === 'Fechada') {
          this.storageService.remove(KEY_USUARIO);
          this.storageService.remove(KEY_COMANDA);
          this.router.navigate(['login']);
          return false;
        }
        return true;
      }),
      catchError(() => of(true))
    );
  }

}
