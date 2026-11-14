import { Component, Injector, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { GenericClass } from 'src/app/model/generic.class';
import { KEY_COMANDA, KEY_USUARIO, StorageService } from 'src/app/services/storage.service';
import { WebsocketService } from 'src/app/services/websocket.service';
import { ComandaDTO } from 'src/app/model/comanda.dto';
import { SolicitacaoDTO } from 'src/app/model/solicitacao.dto';
import { LoadingController } from '@ionic/angular';
import { fromStatusSolicitacaoEnumValue, StatusSolicitacaoEnum } from 'src/app/enums/status-solicitacao.enum';
import { UsuarioDTO } from 'src/app/model/usuario.dto';
import { SessaoService } from 'src/app/services/sessao.service';

/** Celular com DDD, com ou sem máscara: (83) 99999-9999 ou (83) 3333-3333. */
const CELULAR_PATTERN = /^\(?\d{2}\)?\s?\d{4,5}-?\d{4}$/;

/** Formata os dígitos digitados como (DD) 99999-9999 ou (DD) 3333-3333. */
const aplicarMascaraCelular = (valor: string): string => {
  const digitos = String(valor).replace(/\D/g, '').slice(0, 11);
  if (digitos.length <= 2) {
    return digitos.length ? `(${digitos}` : '';
  }
  const ddd = digitos.slice(0, 2);
  const numero = digitos.slice(2);
  const corte = numero.length > 8 ? 5 : 4;
  return numero.length > 4
    ? `(${ddd}) ${numero.slice(0, corte)}-${numero.slice(corte)}`
    : `(${ddd}) ${numero}`;
};

@Component({
  selector: 'app-modal-informar-nome',
  templateUrl: './modal-informar-nome.page.html',
  styleUrls: ['./modal-informar-nome.page.scss'],
})
export class ModalInformarNomePage extends GenericClass implements OnInit {

  public form!: FormGroup;
  public usuario: UsuarioDTO | null = null;
  private loading: HTMLIonLoadingElement | null = null;
  private comandaRequestId: string | null = null;

  constructor(
    public injector: Injector,
    private formBuilder: FormBuilder,
    private websocketService: WebsocketService,
    private storageService: StorageService,
    private sessaoService: SessaoService,
    private loadingController: LoadingController
  ) {
    super(injector);
    this.createWebSocketConnection();
  }

  get notificarWhatsapp(): boolean {
    return !!this.form.get('notificarWhatsapp')?.value;
  }

  ngOnInit(): void {
    this.configurarForm();
  }

  configurarForm() {
    this.form = this.formBuilder.group({
      usuario: [null, [Validators.required, Validators.minLength(3)]],
      notificarWhatsapp: [false],
      celular: [{ value: null, disabled: true }, [Validators.required, Validators.pattern(CELULAR_PATTERN)]],
    });

    // O celular só é pedido (e validado) quando o cliente aceita receber as notificações.
    this.form.get('notificarWhatsapp').valueChanges.subscribe((notificar: boolean) => {
      const celular = this.form.get('celular');
      if (notificar) {
        celular.enable();
        return;
      }
      celular.reset({ value: null, disabled: true });
    });
  }

  formatarCelular(event: any): void {
    const celular = this.form.get('celular');
    const formatado = aplicarMascaraCelular(event?.target?.value ?? '');
    if (celular.value !== formatado) {
      celular.setValue(formatado, { emitEvent: false });
    }
  }

  createWebSocketConnection() {
    this.websocketService.createWebSocketConnection().subscribe(() => {}, () => {
      void this.showConnectionError();
    });
  }

  setarDadosResponse(res: ComandaDTO | undefined): void {
    this.storageService.set(KEY_USUARIO, res?.usuario);
    this.storageService.set(KEY_COMANDA, res);
    this.sessaoService.monitorarComanda();
    this.router.navigate(['/home']);
  }

  async gerarNumeroComanda(): Promise<void> {
    await this.showLoading();
    try {
      const requestId = this.createRequestId();
      this.comandaRequestId = requestId;
      this.websocketService.subscribeToComanda(requestId, body => {
        const solicitacao: SolicitacaoDTO = WebsocketService.formatResponse(body);
        void this.handleSolicitacaoResponse(solicitacao);
      });
      this.websocketService.send('/app/solicitacao/solicitar', this.buildSolicitacao(requestId));
      await this.modalController.dismiss();
    } catch (error) {
      if (this.comandaRequestId) {
        this.websocketService.unsubscribeFromComanda(this.comandaRequestId);
        this.comandaRequestId = null;
      }
      await this.hideLoading();
      await this.showConnectionError();
    }
  }

  private async handleSolicitacaoResponse(solicitacao: SolicitacaoDTO): Promise<void> {
    const requestId = this.comandaRequestId;
    if (!requestId) {
      return;
    }

    this.comandaRequestId = null;
    this.websocketService.unsubscribeFromComanda(requestId);
    await this.hideLoading();
    if (solicitacao.status === fromStatusSolicitacaoEnumValue(StatusSolicitacaoEnum.ACEITA)) {
      this.setarDadosResponse(solicitacao.comanda);
    }
  }

  private buildSolicitacao(requestId: string) {
    const { usuario, notificarWhatsapp, celular } = this.form.getRawValue();
    return {
      usuario,
      requestId,
      notificarWhatsapp: !!notificarWhatsapp,
      celular: notificarWhatsapp ? String(celular ?? '').replace(/\D/g, '') : null,
    };
  }

  private createRequestId(): string {
    const bytes = new Uint8Array(16);
    window.crypto.getRandomValues(bytes);
    const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }

  private async showConnectionError(): Promise<void> {
    const alert = await this.alertController.create({
      header: 'Falha na conexão',
      message: 'Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.',
      buttons: ['OK'],
    });
    await alert.present();
  }

  private async showLoading(): Promise<void> {
    if (!this.loading) {
      this.loading = await this.loadingController.create({
        message: 'Aguardando aprovação...',
        spinner: 'crescent',
      });
      await this.loading.present();
    }
  }

  private async hideLoading(): Promise<void> {
    if (this.loading) {
      await this.loading.dismiss();
      this.loading = null;
    }
  }

}
