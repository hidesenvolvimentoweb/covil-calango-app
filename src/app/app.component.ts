import { Component, OnInit } from '@angular/core';
import { KEY_USUARIO, StorageService } from './services/storage.service';
import { WebsocketService } from './services/websocket.service';
import packageJson from '../../package.json';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
})
export class AppComponent implements OnInit {

  public usuario: any | null;

  constructor(
    private storageService: StorageService,
    private websocketService: WebsocketService
  ) {
    this.usuario = this.storageService.get(KEY_USUARIO);
  }

  static get version() {
    return packageJson.version;
  }

  ngOnInit(): void {
    this.websocketService.createWebSocketConnection().subscribe();
  }

}
