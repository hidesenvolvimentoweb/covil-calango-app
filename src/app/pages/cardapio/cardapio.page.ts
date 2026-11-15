import { Component, Injector } from '@angular/core';
import { ProdutoDTO } from 'src/app/model/produtos.dto';
import { GenericClass } from 'src/app/model/generic.class';
import { ModalConfirmarPedidoPage } from './modal-confirmar-pedido/modal-confirmar-pedido.page';
import { ProdutoService } from 'src/app/services/produto.service';
import { ViewWillEnter } from '@ionic/angular';
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
export class CardapioPage extends GenericClass implements ViewWillEnter {

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
    private produtoService: ProdutoService
  ) {
    super(injector);
  }

  ionViewWillEnter(): void {
    this.carregando = true;
    this.produtoService.getAll(semLoading()).subscribe({
      next: (listaDeProdutos: unknown[]) => {
        this.montarCardapio(listaDeProdutos as ProdutoDTO[]);
        this.carregando = false;
      },
      error: () => (this.carregando = false)
    });
  }

  private montarCardapio(listaDeProdutos: ProdutoDTO[]): void {
    this.listaDeProdutos = listaDeProdutos;
    this.aplicarFiltros();
  }

  async openModalConfirmarPedido(produto: ProdutoDTO) {
    (await this.modalController.create({
      component: ModalConfirmarPedidoPage,
      breakpoints: [0.8],
      initialBreakpoint: 0.8,
      componentProps: { produto }
    })).present();
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
