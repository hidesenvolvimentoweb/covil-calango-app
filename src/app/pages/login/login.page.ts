import { Component } from '@angular/core';
import { AppComponent } from 'src/app/app.component';
import { GenericClass } from 'src/app/model/generic.class';
import { ModalInformarNomePage } from './modal-informar-nome/modal-informar-nome.page';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
})
export class LoginPage extends GenericClass {
  get version() {
    return AppComponent.version;
  }

  async openModalInformarNome() {
    (await this.modalController.create({
      component: ModalInformarNomePage,
      breakpoints: [0.8],
      initialBreakpoint: 0.8,
    })).present();
  }
}
