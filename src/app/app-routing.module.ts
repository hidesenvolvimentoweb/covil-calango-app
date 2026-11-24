import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';
import { HomePage } from './pages/home/home.page';
import { PerfilPage } from './pages/menu-pages/perfil/perfil.page';
import { LoginPage } from './pages/login/login.page';
import { LoginGuard } from './guards/login.guard';
import { CardapioPage } from './pages/cardapio/cardapio.page';
import { MeusPedidosPage } from './pages/meus-pedidos/meus-pedidos.page';
import { MinhaComandaPage } from './pages/minha-comanda/minha-comanda.page';
import { HasLoginGuard } from './guards/has-login.guard';
import { EventosPage } from './pages/eventos/eventos.page';
import { CalendarioEventosPage } from './pages/eventos/calendario-eventos/calendario-eventos.page';

const routes: Routes = [
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full'
  },
  {
    path: 'home',
    component: HomePage,
    canActivate: [LoginGuard]
  },
  {
    path: 'perfil',
    component: PerfilPage,
    canActivate: [LoginGuard]
  },
  {
    path: 'cardapio',
    component: CardapioPage,
    canActivate: [LoginGuard]
  },
  {
    path: 'meus-pedidos',
    component: MeusPedidosPage,
    canActivate: [LoginGuard]
  },
  {
    path: 'minha-comanda',
    component: MinhaComandaPage,
    canActivate: [LoginGuard]
  },
  {
    path: 'eventos',
    component: EventosPage,
    canActivate: [LoginGuard]
  },
  {
    path: 'eventos/calendario',
    component: CalendarioEventosPage,
    canActivate: [LoginGuard]
  },
  {
    path: 'login',
    component: LoginPage,
    canActivate: [HasLoginGuard]
  },
];
@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule { }
