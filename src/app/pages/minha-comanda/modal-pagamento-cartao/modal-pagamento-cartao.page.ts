import { ChangeDetectorRef, Component, Input, OnDestroy, OnInit } from '@angular/core';
import { AlertController, ModalController } from '@ionic/angular';
import { CartaoSalvoDTO, CartoesSalvosDTO, PagamentoConfiguracaoDTO, PagamentoDTO } from 'src/app/model/pagamento.dto';
import { MetodoPagamentoEnum, StatusPagamentoEnum } from 'src/app/enums/status-pagamento.enum';
import { PagamentoService, topicoPagamentosDaComanda } from 'src/app/services/pagamento.service';
import { SessaoService } from 'src/app/services/sessao.service';
import { StorageService } from 'src/app/services/storage.service';
import { WebsocketService } from 'src/app/services/websocket.service';
import { abrirLinkExterno, carregarMercadoPago, enviarDesafio3ds } from 'src/app/utils/mercado-pago.util';

/**
 * Etapas da tela:
 * - carregando: buscando as formas de pagamento e o último pagamento da comanda;
 * - formulario: cartão digitado (formulário do Mercado Pago) e o botão de pagar na conta do Mercado Pago;
 * - desafio: verificação do banco (3DS) aberta dentro do app;
 * - aguardando: cartão em análise (ou sem resposta do provedor): a confirmação chega pelo websocket;
 * - mercado-pago: o cliente está pagando no app/site do Mercado Pago;
 * - pago, recusado, encerrado (cancelado/expirado/estornado) e erro.
 */
export type EtapaPagamentoCartao = 'carregando' | 'formulario' | 'desafio' | 'aguardando' | 'mercado-pago'
  | 'pago' | 'recusado' | 'encerrado' | 'erro';

const ID_CONTAINER_FORMULARIO = 'formulario-cartao-mercado-pago';
export const NOME_IFRAME_DESAFIO = 'desafio-3ds';
/** Consulta periódica enquanto o pagamento está pendente, caso a confirmação pelo websocket não chegue. */
const INTERVALO_CONSULTA_MS = 8000;

/**
 * Pagamento da comanda com cartão de crédito ou débito à vista, pelo formulário do Mercado Pago (o cartão vira um token de uso
 * único: o número nunca passa pelo app nem pela API), ou na conta do Mercado Pago do cliente (cartão salvo lá).
 * O valor é sempre o total calculado pela API; com o pagamento aprovado a comanda é fechada e a sessão termina.
 */
@Component({
  selector: 'app-modal-pagamento-cartao',
  templateUrl: './modal-pagamento-cartao.page.html',
  styleUrls: ['../modal-pagamento-pix/modal-pagamento-pix.page.scss', './modal-pagamento-cartao.page.scss'],
})
export class ModalPagamentoCartaoPage implements OnInit, OnDestroy {

  /** Total exibido no formulário; a cobrança usa sempre o valor calculado pela API. */
  @Input() valorTotal = 0;

  public readonly idContainerFormulario = ID_CONTAINER_FORMULARIO;
  public readonly nomeIframeDesafio = NOME_IFRAME_DESAFIO;
  public etapa: EtapaPagamentoCartao = 'carregando';
  public configuracao?: PagamentoConfiguracaoDTO;
  public pagamento: PagamentoDTO | null = null;
  public carregandoFormulario = false;
  public formularioIndisponivel = false;
  public abrindoMercadoPago = false;
  public cancelando = false;
  /** Cartões salvos neste celular (o formulário os oferece); a lista abaixo dele permite removê-los. */
  public cartoesSalvos: CartaoSalvoDTO[] = [];
  /** "Salvar este cartão neste celular", marcado pelo cliente (desmarcado por padrão). */
  public salvarCartao = false;
  public removendoCartao?: string;

  private numeroComanda: string | number;
  private formulario?: any;
  private cancelarEscutaPagamento?: () => void;
  private timerConsulta?: ReturnType<typeof setInterval>;

  constructor(
    private modalController: ModalController,
    private alertController: AlertController,
    private pagamentoService: PagamentoService,
    private sessaoService: SessaoService,
    private storageService: StorageService,
    private websocketService: WebsocketService,
    private changeDetector: ChangeDetectorRef
  ) { }

  get final(): string {
    if (!this.pagamento?.cartaoFinal) {
      return '';
    }
    const tipo = this.pagamento.cartaoTipo === 'DEBITO' ? 'de débito ' : this.pagamento.cartaoTipo === 'CREDITO' ? 'de crédito ' : '';
    return `${tipo}•••• ${this.pagamento.cartaoFinal}`;
  }

  get tituloEncerrado(): string {
    switch (this.pagamento?.status) {
      case StatusPagamentoEnum.ESTORNADO:
        return 'Pagamento estornado';
      case StatusPagamentoEnum.EXPIRADO:
        return 'O pagamento expirou';
      default:
        return 'Pagamento cancelado';
    }
  }

  ngOnInit(): void {
    this.numeroComanda = this.storageService.getNumeroDaComanda();
    this.sessaoService.definirTratamentoDoFechamento(() => this.aoFecharComanda());
    this.escutarPagamento();
    this.pagamentoService.getConfiguracao().subscribe({
      next: configuracao => {
        this.configuracao = configuracao;
        this.retomarPagamento();
      },
      error: () => (this.etapa = 'erro')
    });
  }

  ngOnDestroy(): void {
    this.pararConsulta();
    this.desmontarFormulario();
    this.cancelarEscutaPagamento?.();
    this.sessaoService.definirTratamentoDoFechamento(undefined);
    if (this.etapa === 'pago') {
      void this.sessaoService.encerrarSessao();
    }
  }

  /** Abre o formulário de cartão (de novo, depois de uma recusa ou de um cancelamento). */
  mostrarFormulario(): void {
    this.etapa = 'formulario';
    this.pararConsulta();
    // O container precisa estar na tela antes de o Mercado Pago montar o formulário nele.
    this.changeDetector.detectChanges();
    void this.montarFormulario();
  }

  /** Gera (ou reaproveita) o link e abre o app/site do Mercado Pago. */
  pagarComMercadoPago(): void {
    if (this.abrindoMercadoPago) {
      return;
    }
    this.abrindoMercadoPago = true;
    this.pagamentoService.pagarComMercadoPago(this.numeroComanda).subscribe({
      next: pagamento => {
        this.abrindoMercadoPago = false;
        this.aplicar(pagamento, true);
        if (this.etapa === 'mercado-pago') {
          this.abrirMercadoPago();
        }
      },
      error: () => (this.abrindoMercadoPago = false)
    });
  }

  abrirMercadoPago(): void {
    if (this.pagamento?.urlCheckout) {
      abrirLinkExterno(this.pagamento.urlCheckout);
    }
  }

  async cancelarPagamento(): Promise<void> {
    const alert = await this.alertController.create({
      header: 'Cancelar o pagamento?',
      message: 'Você poderá fazer novos pedidos e pagar depois, por aqui ou no balcão.',
      buttons: [
        { text: 'Voltar', role: 'cancel' },
        { text: 'Cancelar', role: 'destructive', handler: () => this.confirmarCancelamento() }
      ]
    });
    await alert.present();
  }

  fechar(): void {
    void this.modalController.dismiss();
  }

  /** Continua de onde o cliente parou (ex.: fechou a tela enquanto pagava no Mercado Pago). */
  private retomarPagamento(): void {
    this.pagamentoService.consultar(this.numeroComanda).subscribe({
      next: pagamento => {
        if (pagamento?.status === StatusPagamentoEnum.PENDENTE && pagamento.metodo !== MetodoPagamentoEnum.PIX) {
          this.aplicar(pagamento, true);
        } else {
          this.mostrarFormulario();
        }
      },
      error: () => this.mostrarFormulario()
    });
  }

  private async montarFormulario(): Promise<void> {
    this.desmontarFormulario();
    if (!this.configuracao?.cartao || !this.configuracao.publicKey) {
      return;
    }
    this.carregandoFormulario = true;
    this.formularioIndisponivel = false;
    try {
      const MercadoPago = await carregarMercadoPago();
      if (this.etapa !== 'formulario') {
        return;
      }
      const salvos = await this.carregarCartoesSalvos();
      if (this.etapa !== 'formulario') {
        return;
      }
      const mercadoPago = new MercadoPago(this.configuracao.publicKey, { locale: 'pt-BR' });
      this.formulario = await mercadoPago.bricks().create('cardPayment', ID_CONTAINER_FORMULARIO, {
        initialization: {
          amount: Number(this.valorTotal) || 0,
          // Com cartões salvos neste celular, o formulário os oferece e pede só o código de segurança.
          ...(salvos.clienteId && salvos.cartoes.length
            ? { payer: { customerId: salvos.clienteId, cardsIds: salvos.cartoes.map(cartao => cartao.id) } }
            : {})
        },
        customization: {
          // Crédito ou débito, à vista (sem pré-pago).
          paymentMethods: {
            minInstallments: 1,
            maxInstallments: 1,
            types: { excluded: ['prepaid_card'] }
          },
          visual: { texts: { formSubmit: 'Pagar' } }
        },
        callbacks: {
          onReady: () => {
            this.carregandoFormulario = false;
            this.changeDetector.detectChanges();
          },
          onSubmit: (dados: any) => this.cobrar(dados),
          onError: (erro: any) => {
            // Erros de validação dos campos são exibidos pelo próprio formulário.
            if (erro?.type === 'critical') {
              this.carregandoFormulario = false;
              this.formularioIndisponivel = true;
              this.changeDetector.detectChanges();
            }
          }
        }
      });
    } catch {
      this.carregandoFormulario = false;
      this.formularioIndisponivel = true;
    }
  }

  /** Marca ou desmarca "salvar este cartão neste celular". */
  alterarSalvarCartao(evento: any): void {
    this.salvarCartao = !!evento?.detail?.checked;
  }

  descricaoCartaoSalvo(cartao: CartaoSalvoDTO): string {
    const tipo = cartao.tipo === 'debit_card' ? 'débito' : cartao.tipo === 'credit_card' ? 'crédito' : '';
    const nome = cartao.nomeBandeira || cartao.bandeira || 'Cartão';
    return `${nome}${tipo ? ' ' + tipo : ''} •••• ${cartao.finalCartao ?? ''}`.trim();
  }

  async removerCartaoSalvo(cartao: CartaoSalvoDTO): Promise<void> {
    const alert = await this.alertController.create({
      header: 'Remover cartão?',
      message: `O cartão ${this.descricaoCartaoSalvo(cartao)} deixará de aparecer neste celular.`,
      buttons: [
        { text: 'Voltar', role: 'cancel' },
        { text: 'Remover', role: 'destructive', handler: () => this.confirmarRemocao(cartao) }
      ]
    });
    await alert.present();
  }

  private confirmarRemocao(cartao: CartaoSalvoDTO): void {
    this.removendoCartao = cartao.id;
    this.pagamentoService.excluirCartaoSalvo(cartao.id).subscribe({
      next: () => {
        this.removendoCartao = undefined;
        // Remonta o formulário sem o cartão removido.
        this.mostrarFormulario();
      },
      error: () => (this.removendoCartao = undefined)
    });
  }

  /** Cartões salvos neste celular; sem eles (ou com erro) o formulário abre só para digitar o cartão. */
  private carregarCartoesSalvos(): Promise<CartoesSalvosDTO> {
    return new Promise(resolve => {
      this.pagamentoService.listarCartoesSalvos().subscribe({
        next: salvos => {
          this.cartoesSalvos = salvos?.cartoes ?? [];
          resolve({ clienteId: salvos?.clienteId, cartoes: this.cartoesSalvos });
        },
        error: () => {
          this.cartoesSalvos = [];
          resolve({ cartoes: [] });
        }
      });
    });
  }

  /** onSubmit do formulário: a promessa mantém o botão "Pagar" carregando até a resposta da API. */
  private cobrar(dados: any): Promise<void> {
    return new Promise((resolve, reject) => {
      this.pagamentoService.pagarComCartao(this.numeroComanda, {
        token: dados?.token,
        bandeira: dados?.payment_method_id,
        emissorId: dados?.issuer_id != null ? String(dados.issuer_id) : undefined,
        email: dados?.payer?.email,
        tipoDocumento: dados?.payer?.identification?.type,
        documento: dados?.payer?.identification?.number,
        salvarCartao: this.salvarCartao || undefined
      }).subscribe({
        next: pagamento => {
          resolve();
          this.aplicar(pagamento, true);
        },
        // A mensagem da API (ex.: comanda fechada, dados inválidos) é exibida pelo interceptor de erros.
        error: () => reject()
      });
    });
  }

  private desmontarFormulario(): void {
    try {
      this.formulario?.unmount();
    } catch {
      // O formulário já foi removido da tela.
    }
    this.formulario = undefined;
  }

  private confirmarCancelamento(): void {
    this.cancelando = true;
    this.pagamentoService.cancelarPix(this.numeroComanda).subscribe({
      next: pagamento => {
        this.cancelando = false;
        this.aplicar(pagamento, true);
        if (this.etapa !== 'pago') {
          this.mostrarFormulario();
        }
      },
      error: () => (this.cancelando = false)
    });
  }

  private escutarPagamento(): void {
    if (!this.numeroComanda) {
      return;
    }
    this.websocketService.createWebSocketConnection().subscribe({ error: () => {} });
    this.cancelarEscutaPagamento = this.websocketService.subscribeToTopic(topicoPagamentosDaComanda(this.numeroComanda),
      body => this.aplicar(WebsocketService.formatResponse(body), false));
  }

  /**
   * Aplica a situação do pagamento. Notificações de um pagamento anterior (ex.: o PIX cancelado ao pagar com cartão)
   * são ignoradas, exceto a aprovação, que sempre vale. Notificações também são ignoradas com o formulário aberto e
   * nenhum pagamento em andamento nesta tela.
   *
   * @param resposta a situação veio de uma ação desta tela, e não de uma notificação.
   */
  private aplicar(pagamento: PagamentoDTO | null, resposta: boolean): void {
    if (!pagamento || this.etapa === 'pago') {
      return;
    }
    const aprovado = pagamento.status === StatusPagamentoEnum.PAGO;
    if (!resposta && !aprovado) {
      const outroPagamento = !this.pagamento?.id || pagamento.id !== this.pagamento.id;
      if (outroPagamento) {
        return;
      }
    }
    // Notificações não trazem o desafio do banco nem sempre o link: preserva o que está na tela.
    this.pagamento = pagamento.id === this.pagamento?.id
      ? { ...this.pagamento, ...pagamento,
        urlCheckout: pagamento.urlCheckout ?? this.pagamento.urlCheckout,
        desafioUrl: pagamento.desafioUrl ?? this.pagamento.desafioUrl,
        desafioCreq: pagamento.desafioCreq ?? this.pagamento.desafioCreq }
      : pagamento;

    switch (pagamento.status) {
      case StatusPagamentoEnum.PAGO:
        this.irPara('pago');
        break;
      case StatusPagamentoEnum.RECUSADO:
        this.irPara('recusado');
        break;
      case StatusPagamentoEnum.PENDENTE:
        this.aoFicarPendente(resposta);
        break;
      default:
        this.irPara('encerrado');
    }
  }

  private aoFicarPendente(resposta: boolean): void {
    if (this.pagamento?.metodo === MetodoPagamentoEnum.CARTEIRA_MERCADO_PAGO) {
      this.irPara('mercado-pago');
    } else if (resposta && this.pagamento?.desafioUrl && this.pagamento.desafioCreq) {
      this.irPara('desafio');
      this.changeDetector.detectChanges();
      if (!enviarDesafio3ds(this.pagamento.desafioUrl, this.pagamento.desafioCreq, NOME_IFRAME_DESAFIO)) {
        this.irPara('aguardando');
      }
    } else if (this.etapa !== 'desafio') {
      this.irPara('aguardando');
    }
    this.iniciarConsulta();
  }

  private irPara(etapa: EtapaPagamentoCartao): void {
    if (etapa !== 'formulario') {
      this.desmontarFormulario();
    }
    if (!['desafio', 'aguardando', 'mercado-pago'].includes(etapa)) {
      this.pararConsulta();
    }
    this.etapa = etapa;
  }

  /** A comanda fechou enquanto esta tela estava aberta: pelo pagamento (confirmação) ou pela equipe. */
  private aoFecharComanda(): void {
    this.pagamentoService.consultar(this.numeroComanda).subscribe({
      next: pagamento => {
        if (pagamento?.status === StatusPagamentoEnum.PAGO) {
          this.aplicar(pagamento, false);
        } else {
          void this.sessaoService.encerrarSessao(true);
        }
      },
      error: () => void this.sessaoService.encerrarSessao(true)
    });
  }

  private iniciarConsulta(): void {
    if (this.timerConsulta) {
      return;
    }
    this.timerConsulta = setInterval(() => {
      this.pagamentoService.consultar(this.numeroComanda).subscribe({
        next: pagamento => this.aplicar(pagamento, false),
        error: () => {}
      });
    }, INTERVALO_CONSULTA_MS);
  }

  private pararConsulta(): void {
    clearInterval(this.timerConsulta);
    this.timerConsulta = undefined;
  }

}
