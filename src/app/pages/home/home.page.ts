import { Component, Injector, OnInit } from '@angular/core';
import { TorneioDTO } from 'src/app/model/torneio.dto';
import { GenericClass } from 'src/app/model/generic.class';
import { KEY_USUARIO, StorageService } from 'src/app/services/storage.service';
import { JogadorDTO } from 'src/app/model/jogador.dto';

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
})
export class HomePage extends GenericClass implements OnInit {

  public listProximosTorneios: TorneioDTO[] = [];
  public usuario!: JogadorDTO;

  constructor(
    public injector: Injector,
    private storageService: StorageService
  ) {
    super(injector);
  }

  isVisitante() {
    return this.usuario.id === 1;
  }

  ngOnInit(): void {
    this.usuario = this.storageService.get(KEY_USUARIO) as JogadorDTO;
  }

}
