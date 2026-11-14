import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { KEY_COMANDA, StorageService } from '../services/storage.service';
import { ComandaDTO } from '../model/comanda.dto';

/**
 * Quem já possui uma comanda vai direto para a home, sem passar pela geração de comanda.
 */
@Injectable({ providedIn: 'root' })
export class HasLoginGuard implements CanActivate {

  constructor(private storageService: StorageService, private router: Router) {}

  canActivate() {
    const comanda = this.storageService.get<ComandaDTO>(KEY_COMANDA);
    if (comanda?.numero) {
      this.router.navigate(['home']);
      return false;
    }
    return true;
  }

}
