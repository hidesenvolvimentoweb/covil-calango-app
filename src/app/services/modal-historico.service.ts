import { Injectable, NgZone } from '@angular/core';
import { ModalController } from '@ionic/angular';

/** Marcação gravada no estado do histórico para cada modal aberto. */
const CHAVE_ESTADO_MODAL = 'covilModalAberto';

/** Role usado quando o modal é fechado pelo botão voltar. */
export const ROLE_VOLTAR = 'voltar';

const TEMPO_MAXIMO_ESPERA_HISTORICO_MS = 500;

/**
 * Faz cada modal aberto ocupar uma entrada no histórico do navegador/WebView.
 *
 * Assim, o "voltar" do celular (que no WebView do Android executa um history.back()
 * quando o evento nativo não é interceptado) consome essa entrada e fecha o modal,
 * em vez de voltar a página que está atrás dele.
 */
@Injectable({ providedIn: 'root' })
export class ModalHistoricoService {

  private iniciado = false;
  /** Quantidade de history.back() disparados por nós e ainda não processados. */
  private voltasPendentes = 0;
  private aguardandoVoltas: Array<() => void> = [];

  constructor(private modalController: ModalController, private zone: NgZone) { }

  iniciar(): void {
    if (this.iniciado) {
      return;
    }
    this.iniciado = true;
    document.addEventListener('ionModalDidPresent', () => this.registrarModalAberto());
    document.addEventListener('ionModalDidDismiss', (ev: Event) => this.registrarModalFechado(ev as CustomEvent));
    window.addEventListener('popstate', () => this.zone.run(() => this.tratarVoltar()));
  }

  /** Resolve quando as entradas de histórico dos modais fechados já foram removidas. */
  aguardarHistorico(): Promise<void> {
    if (this.voltasPendentes === 0) {
      return Promise.resolve();
    }
    // O timeout evita travar quem aguarda caso o navegador não emita o popstate.
    return new Promise(resolve => {
      this.aguardandoVoltas.push(resolve);
      setTimeout(resolve, TEMPO_MAXIMO_ESPERA_HISTORICO_MS);
    });
  }

  private registrarModalAberto(): void {
    history.pushState({ ...(history.state ?? {}), [CHAVE_ESTADO_MODAL]: true }, '');
  }

  /** Modal fechado por botão, gesto ou código: remove a entrada que ele criou no histórico. */
  private registrarModalFechado(ev: CustomEvent): void {
    if (ev.detail?.role === ROLE_VOLTAR || !history.state?.[CHAVE_ESTADO_MODAL]) {
      return;
    }
    this.voltasPendentes++;
    history.back();
  }

  private async tratarVoltar(): Promise<void> {
    if (this.voltasPendentes > 0) {
      this.voltasPendentes--;
      if (this.voltasPendentes === 0) {
        this.aguardandoVoltas.splice(0).forEach(resolve => resolve());
      }
      return;
    }
    const modal = await this.modalController.getTop();
    if (modal) {
      await modal.dismiss(undefined, ROLE_VOLTAR);
    }
  }

}
