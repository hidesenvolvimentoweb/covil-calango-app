import { Component, NgZone, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ModalController, Platform } from '@ionic/angular';
import { StorageService } from './services/storage.service';
import { WebsocketService } from './services/websocket.service';
import { SessaoService } from './services/sessao.service';
import { ModalHistoricoService } from './services/modal-historico.service';
import packageJson from '../../package.json';

/**
 * Prioridade acima da dos overlays do Ionic (100) e da navegação do router (0):
 * o botão voltar fecha primeiro o modal aberto e só depois volta de tela.
 */
const PRIORIDADE_VOLTAR_MODAL = 101;
/** Deep link do app (cordova-plugin-customurlscheme). A página de retorno do Checkout Pro abre covilcalango://minha-comanda. */
const ESQUEMA_DEEP_LINK = 'covilcalango://';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
})
export class AppComponent implements OnInit {

  public usuario: any | null;

  constructor(
    private storageService: StorageService,
    private websocketService: WebsocketService,
    private sessaoService: SessaoService,
    private platform: Platform,
    private modalController: ModalController,
    private modalHistoricoService: ModalHistoricoService,
    private router: Router,
    private ngZone: NgZone
  ) {
    this.usuario = this.storageService.getUsuario();
  }

  static get version() {
    return packageJson.version;
  }

  ngOnInit(): void {
    this.websocketService.createWebSocketConnection().subscribe();
    this.sessaoService.monitorarComanda();
    this.modalHistoricoService.iniciar();
    this.configurarBotaoVoltar();
    this.configurarDeepLink();
  }

  /**
   * O cliente volta do Mercado Pago (Checkout Pro) pelo deep link. Com o modal de pagamento aberto, ele mesmo mostra o
   * resultado (websocket e consulta periódica); sem modal, o app abre a tela indicada no link (ex.: Minha comanda).
   */
  private configurarDeepLink(): void {
    (window as any).handleOpenURL = (url: string) => {
      if (typeof url !== 'string' || !url.toLowerCase().startsWith(ESQUEMA_DEEP_LINK)) {
        return;
      }
      const rota = url.substring(ESQUEMA_DEEP_LINK.length).split(/[?#]/)[0].replace(/[^a-z0-9/-]/gi, '');
      setTimeout(() => this.ngZone.run(async () => {
        if (await this.modalController.getTop() || !rota) {
          return;
        }
        this.router.navigateByUrl('/' + rota).catch(() => this.router.navigateByUrl('/home'));
      }), 0);
    };
  }

  /**
   * Botão voltar do celular: se houver modal aberto, fecha apenas o modal;
   * sem modal, segue para os demais handlers (alertas do Ionic e, por fim, voltar de tela).
   */
  private configurarBotaoVoltar(): void {
    this.platform.backButton.subscribeWithPriority(PRIORIDADE_VOLTAR_MODAL, async processNextHandler => {
      const modal = await this.modalController.getTop();
      if (modal) {
        await modal.dismiss();
        return;
      }
      processNextHandler();
    });
  }

}
