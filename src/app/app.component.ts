import { Component, OnInit } from '@angular/core';
import { JogadorDTO } from './model/jogador.dto';
import { KEY_USUARIO, StorageService } from './services/storage.service';
import { WebsocketService } from './services/websocket.service';
import packageJson from '../../package.json';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
})
export class AppComponent implements OnInit {

  public usuario: JogadorDTO | null;

  static get version() {
    return packageJson.version;
  }

  constructor(
    private storageService: StorageService,
    private websocketService: WebsocketService
  ) {
    this.usuario = this.storageService.get(KEY_USUARIO);
  }

  ngOnInit(): void {
    this.websocketService.createWebSocketConnection().subscribe();
  }

}
