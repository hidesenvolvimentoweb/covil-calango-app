import { Component, Injector } from '@angular/core';
import { ProdutoDTO } from 'src/app/model/produtos.dto';
import { GenericClass } from 'src/app/model/generic.class';
import { ModalConfirmarPedidoPage } from './modal-confirmar-pedido/modal-confirmar-pedido.page';
import { ProdutoService } from 'src/app/services/produto.service';
import { ViewWillEnter } from '@ionic/angular';

interface CategoriaCardapio {
  nome: string;
  icone: string;
}

const CATEGORIAS_PADRAO: CategoriaCardapio[] = [
  { nome: 'Burguers', icone: 'fast-food-outline' },
  { nome: 'Bebidas', icone: 'water-outline' },
  { nome: 'Doces', icone: 'ice-cream-outline' },
  { nome: 'Gelados', icone: 'snow-outline' }
];

@Component({
  selector: 'app-page',
  templateUrl: './cardapio.page.html',
  styleUrls: ['./cardapio.page.scss'],
})
export class CardapioPage extends GenericClass implements ViewWillEnter {

  public listaDeProdutos: ProdutoDTO[] = [];
  public listaDeProdutosFiltrada: ProdutoDTO[] = [];
  public categorias: CategoriaCardapio[] = [
    { nome: 'Todas', icone: 'apps-outline' },
    ...CATEGORIAS_PADRAO
  ];
  public categoriaSelecionada = 'Todas';
  private termoPesquisa = '';

  constructor(
    public injector: Injector,
    private produtoService: ProdutoService
  ) {
    super(injector);
  }

  ionViewWillEnter(): void {
    this.produtoService.getAll().subscribe((listaDeProdutos: unknown[]) => {
      this.listaDeProdutos = listaDeProdutos as ProdutoDTO[];
      const nomesCategorias = Array.from(new Set(this.listaDeProdutos.map(produto => this.getCategoriaProduto(produto))))
        .sort((a, b) => a.localeCompare(b, 'pt-BR'));
      const categoriasPorChave = new Map<string, CategoriaCardapio>();
      [...CATEGORIAS_PADRAO, ...nomesCategorias.map(nome => ({ nome, icone: this.getIconeCategoria(nome) }))]
        .forEach(categoria => {
          const chave = this.normalizarCategoria(categoria.nome);
          if (!categoriasPorChave.has(chave)) {
            categoriasPorChave.set(chave, categoria);
          }
        });
      this.categorias = [
        { nome: 'Todas', icone: 'apps-outline' },
        ...categoriasPorChave.values()
      ];
      this.aplicarFiltros();
    });
  }

  async openModalConfirmarPedido(produto: ProdutoDTO) {
    (await this.modalController.create({
      component: ModalConfirmarPedidoPage,
      breakpoints: [0.5],
      initialBreakpoint: 0.5,
      componentProps: { produto }
    })).present();
  }

  handleInput(event: any) {
    this.termoPesquisa = (event?.target?.value ?? '').trim().toLowerCase();
    this.aplicarFiltros();
  }

  selecionarCategoria(categoria: string) {
    this.categoriaSelecionada = categoria;
    this.aplicarFiltros();
  }

  getCategoriaProduto(produto: ProdutoDTO): string {
    return produto.categoria?.trim() || 'Outros';
  }

  getIconeCategoria(categoria: string): string {
    const nomeCategoria = this.normalizarCategoria(categoria);
    if (nomeCategoria === 'hamburguers' || nomeCategoria.includes('burger')) {
      return 'fast-food-outline';
    }
    if (nomeCategoria.includes('bebid') || nomeCategoria.includes('drink')) {
      return 'water-outline';
    }
    if (nomeCategoria.includes('sobrem') || nomeCategoria.includes('dessert') || nomeCategoria.includes('doce') || nomeCategoria.includes('gelad')) {
      return 'ice-cream-outline';
    }
    if (nomeCategoria.includes('lanche') || nomeCategoria.includes('comida') || nomeCategoria.includes('food')) {
      return 'fast-food-outline';
    }
    if (nomeCategoria.includes('porção') || nomeCategoria.includes('porcao') || nomeCategoria.includes('snack')) {
      return 'pizza-outline';
    }
    return 'restaurant-outline';
  }

  realizarPedido(produto: ProdutoDTO) {
    this.openModalConfirmarPedido(produto);
  }

  private normalizarCategoria(categoria: string): string {
    const nomeNormalizado = categoria.trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    if (['hamburguer', 'hamburgueres', 'hamburguers', 'hamburgers', 'burger', 'burgers'].includes(nomeNormalizado)) {
      return 'hamburguers';
    }
    if (nomeNormalizado === 'bebida') {
      return 'bebidas';
    }
    if (nomeNormalizado === 'doce') {
      return 'doces';
    }
    if (nomeNormalizado === 'gelado') {
      return 'gelados';
    }
    return nomeNormalizado;
  }

  private aplicarFiltros() {
    this.listaDeProdutosFiltrada = this.listaDeProdutos.filter(produto => {
      const correspondeCategoria = this.categoriaSelecionada === 'Todas'
        || this.normalizarCategoria(this.getCategoriaProduto(produto)) === this.normalizarCategoria(this.categoriaSelecionada);
      const correspondePesquisa = !this.termoPesquisa
        || (produto?.nome ?? '').toLowerCase().includes(this.termoPesquisa)
        || (produto?.ingredientes ?? '').toLowerCase().includes(this.termoPesquisa);
      return correspondeCategoria && correspondePesquisa;
    });
  }

}
