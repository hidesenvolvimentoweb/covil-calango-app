import { Component, Injector } from '@angular/core';
import { ProdutoDTO } from 'src/app/model/produtos.dto';
import { GenericClass } from 'src/app/model/generic.class';
import {
  ModalConfirmarPedidoPage,
  quantidadeMaximaDoProduto
} from './modal-confirmar-pedido/modal-confirmar-pedido.page';
import { ProdutoService } from 'src/app/services/produto.service';
import { ViewWillEnter, ViewWillLeave } from '@ionic/angular';
import { CozinhaDTO, CozinhaService, TOPICO_COZINHA } from 'src/app/services/cozinha.service';
import { WebsocketService } from 'src/app/services/websocket.service';
import { resolverUrlImagem } from 'src/app/utils/imagem.util';
import { semLoading } from 'src/app/interceptors/http-loading.interceptor';
import {
  CategoriaProdutoEnum,
  fromCategoriaProdutoEnumValue,
  getIconeCategoriaProduto
} from 'src/app/enums/categoria-produto.enum';

/** Quantidade de itens fictícios exibidos no skeleton enquanto a tela carrega. */
const ITENS_SKELETON = [1, 2, 3];

/** Valor usado no filtro para exibir produtos de todas as categorias. */
const TODAS = 'TODAS';

interface CategoriaCardapio {
  valor: CategoriaProdutoEnum | typeof TODAS;
  nome: string;
  icone: string;
}

const CATEGORIAS_CARDAPIO: CategoriaCardapio[] = [
  { valor: TODAS, nome: 'Todas', icone: 'apps-outline' },
  ...Object.values(CategoriaProdutoEnum).map(valor => ({
    valor,
    nome: fromCategoriaProdutoEnumValue(valor),
    icone: getIconeCategoriaProduto(valor)
  }))
];

@Component({
  selector: 'app-page',
  templateUrl: './cardapio.page.html',
  styleUrls: ['./cardapio.page.scss'],
})
export class CardapioPage extends GenericClass implements ViewWillEnter, ViewWillLeave {

  /** Nulo enquanto a situação não chega (nada é bloqueado; a API recusa o pedido se a cozinha estiver fechada). */
  public cozinhaAberta: boolean | null = null;
  private cancelarEscutaCozinha?: () => void;

  public listaDeProdutos: ProdutoDTO[] = [];
  public listaDeProdutosFiltrada: ProdutoDTO[] = [];
  public readonly categorias = CATEGORIAS_CARDAPIO;
  public categoriaSelecionada: CategoriaCardapio['valor'] = TODAS;
  public carregando = true;
  public readonly itensSkeleton = ITENS_SKELETON;
  private termoPesquisa = '';
  private imagensComErro = new Set<string | undefined>();

  constructor(
    public injector: Injector,
    private produtoService: ProdutoService,
    private cozinhaService: CozinhaService,
    private websocketService: WebsocketService
  ) {
    super(injector);
  }

  ionViewWillEnter(): void {
    this.carregando = true;
    this.carregarProdutos();
    this.carregarCozinha();
    this.escutarCozinha();
  }

  ionViewWillLeave(): void {
    this.cancelarEscutaCozinha?.();
    this.cancelarEscutaCozinha = undefined;
  }

  carregarCozinha(): void {
    this.cozinhaService.getSituacao().subscribe({
      next: cozinha => (this.cozinhaAberta = cozinha.aberta),
      error: () => {}
    });
  }

  /** A equipe abre ou fecha a cozinha e o cardápio atualiza na hora. */
  private escutarCozinha(): void {
    if (this.cancelarEscutaCozinha) {
      return;
    }
    this.websocketService.createWebSocketConnection().subscribe({ error: () => {} });
    this.cancelarEscutaCozinha = this.websocketService.subscribeToTopic(TOPICO_COZINHA, body => {
      const cozinha: CozinhaDTO = WebsocketService.formatResponse(body);
      this.cozinhaAberta = cozinha.aberta;
    });
  }

  /** Produto da cozinha com ela fechada: aparece no cardápio, mas não pode ser pedido. */
  isCozinhaFechada(produto: ProdutoDTO): boolean {
    return !!produto.usaCozinha && this.cozinhaAberta === false;
  }

  /** Recarrega o cardápio; usado também ao fechar o pedido, já que o estoque pode ter mudado. */
  carregarProdutos(): void {
    this.produtoService.getAll(semLoading()).subscribe({
      next: (listaDeProdutos: unknown[]) => {
        this.montarCardapio(listaDeProdutos as ProdutoDTO[]);
        this.carregando = false;
      },
      error: () => (this.carregando = false)
    });
  }

  isEsgotado(produto: ProdutoDTO): boolean {
    return quantidadeMaximaDoProduto(produto) < 1;
  }

  async openModalConfirmarPedido(produto: ProdutoDTO) {
    const modal = await this.modalController.create({
      component: ModalConfirmarPedidoPage,
      breakpoints: [0.8],
      initialBreakpoint: 0.8,
      componentProps: { produto }
    });
    // O estoque pode ter mudado, e a cozinha pode ter fechado enquanto o cliente escolhia.
    void modal.onDidDismiss().then(() => {
      this.carregarProdutos();
      this.carregarCozinha();
    });
    await modal.present();
  }

  handleInput(event: any) {
    this.termoPesquisa = (event?.target?.value ?? '').trim().toLowerCase();
    this.aplicarFiltros();
  }

  selecionarCategoria(categoria: CategoriaCardapio['valor']) {
    this.categoriaSelecionada = categoria;
    this.aplicarFiltros();
  }

  /** URL da imagem do produto, ou null quando não há imagem ou ela não pôde ser carregada. */
  urlImagem(produto: ProdutoDTO): string | null {
    return this.imagensComErro.has(produto.imagem) ? null : resolverUrlImagem(produto.imagem);
  }

  registrarErroImagem(produto: ProdutoDTO): void {
    this.imagensComErro.add(produto.imagem);
  }

  /** Categoria do produto; valores ausentes ou desconhecidos são tratados como "Outros". */
  getCategoriaProduto(produto: ProdutoDTO): CategoriaProdutoEnum {
    return this.normalizarCategoria(produto?.categoria);
  }

  getIconeCategoria(categoria: CategoriaProdutoEnum): string {
    return getIconeCategoriaProduto(categoria);
  }

  realizarPedido(produto: ProdutoDTO) {
    this.openModalConfirmarPedido(produto);
  }

  private normalizarCategoria(categoria?: string | null): CategoriaProdutoEnum {
    const valores = Object.values(CategoriaProdutoEnum) as string[];
    return valores.includes(categoria ?? '') ? categoria as CategoriaProdutoEnum : CategoriaProdutoEnum.OUTROS;
  }

  private montarCardapio(listaDeProdutos: ProdutoDTO[]): void {
    this.listaDeProdutos = listaDeProdutos;
    this.aplicarFiltros();
  }

  private aplicarFiltros() {
    this.listaDeProdutosFiltrada = this.listaDeProdutos.filter(produto => {
      const correspondeCategoria = this.categoriaSelecionada === TODAS
        || this.getCategoriaProduto(produto) === this.categoriaSelecionada;
      const correspondePesquisa = !this.termoPesquisa
        || (produto?.nome ?? '').toLowerCase().includes(this.termoPesquisa)
        || (produto?.ingredientes ?? '').toLowerCase().includes(this.termoPesquisa);
      return correspondeCategoria && correspondePesquisa;
    });
  }

}
