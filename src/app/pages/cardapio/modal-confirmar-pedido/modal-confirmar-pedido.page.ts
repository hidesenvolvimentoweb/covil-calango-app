import { Component, Input } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AlertController, ModalController, ViewWillEnter } from '@ionic/angular';
import { PedidoDTO } from 'src/app/model/pedido.dto';
import { ProdutoDTO } from 'src/app/model/produtos.dto';
import { PedidoService } from 'src/app/services/pedido.service';
import { StorageService } from 'src/app/services/storage.service';
import { resolverUrlImagem } from 'src/app/utils/imagem.util';
import { SessaoService } from 'src/app/services/sessao.service';
import { ComandaService } from 'src/app/services/comanda.service';

const HTTP_STATUS_CONFLICT = 409;
/** Mesmo limite validado pela API (Produto.QUANTIDADE_MAXIMA_POR_PEDIDO), usado se a API não informar outro. */
export const QUANTIDADE_MAXIMA = 20;

/** Quantidade que pode ser pedida do produto: o limite por pedido, já reduzido pela API ao estoque disponível. */
export const quantidadeMaximaDoProduto = (produto?: ProdutoDTO): number =>
  produto?.quantidadeMaximaPedido ?? QUANTIDADE_MAXIMA;

@Component({
  selector: 'app-modal-confirmar-pedido',
  templateUrl: './modal-confirmar-pedido.page.html',
  styleUrls: ['./modal-confirmar-pedido.page.scss'],
})
export class ModalConfirmarPedidoPage implements ViewWillEnter {

  @Input()
  public produto: ProdutoDTO;
  public form: FormGroup;
  public imagemComErro = false;
  public quantidadeMaxima = QUANTIDADE_MAXIMA;

  constructor(
    private formBuilder: FormBuilder,
    private alertController: AlertController,
    private modalController: ModalController,
    private pedidoService: PedidoService,
    private storageService: StorageService,
    private sessaoService: SessaoService,
    private comandaService: ComandaService
  ) { }

  get urlImagem(): string | null {
    return this.imagemComErro ? null : resolverUrlImagem(this.produto?.imagem);
  }

  get quantidade() {
    return this.form?.get('quantidade');
  }

  ionViewWillEnter() {
    this.configurarForm();
  }

  configurarForm() {
    this.quantidadeMaxima = quantidadeMaximaDoProduto(this.produto);
    this.form = this.formBuilder.group({
      quantidade: [1, [Validators.required, Validators.min(1), Validators.max(this.quantidadeMaxima)]],
      observacao: [null],
      produto: [this.produto, Validators.required],
      comanda: [this.storageService.getNumeroDaComanda(), Validators.required]
    });
  }

  async confirmarPedido() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const pedido = new PedidoDTO(this.form.value);
    this.pedidoService.save(pedido).subscribe({
      next: async () => (await this.alertController.create({
        message: `Pedido realizado com sucesso! Acompanhe-o na aba de 'Meus Pedidos'`,
        buttons: ['OK']
      })).present().then(() => this.modalController.dismiss()),
      // 409: a comanda foi finalizada, há um PIX pendente (pedidos bloqueados até pagar ou cancelar) ou o produto
      // não tem mais unidades suficientes (outro cliente comprou antes) ou a cozinha fechou (o cardápio é recarregado
      // ao fechar o modal).
      // O aviso da API é exibido pelo interceptor de erros; a sessão só expira se a comanda estiver fechada.
      error: (error: HttpErrorResponse) => {
        if (error.status === HTTP_STATUS_CONFLICT) {
          this.encerrarSessaoSeComandaFechada();
        }
      }
    });
  }

  addProduto() {
    const quantidadeAtual = Number(this.quantidade.value) || 0;
    if (quantidadeAtual < this.quantidadeMaxima) {
      this.quantidade.setValue(quantidadeAtual + 1);
    }
  }

  removerProduto() {
    let quantidadeAtual = this.quantidade.value;
    if (quantidadeAtual > 1) {
      this.quantidade.setValue(--quantidadeAtual);
    }
  }

  private encerrarSessaoSeComandaFechada(): void {
    this.comandaService.getByNumero(this.storageService.getNumeroDaComanda()).subscribe({
      next: comanda => {
        if (SessaoService.isComandaFechada(comanda)) {
          void this.sessaoService.encerrarSessao();
        } else {
          void this.modalController.dismiss();
        }
      },
      error: () => {}
    });
  }

}
