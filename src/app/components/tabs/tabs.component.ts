import { Component, Injector } from '@angular/core';
import { NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { GenericClass } from 'src/app/model/generic.class';

@Component({
  selector: 'app-ygo-tabs-component',
  templateUrl: 'tabs.component.html',
  styleUrls: ['tabs.component.scss']
})
export class TabsComponent extends GenericClass {

  public showTabs = this.isNotLoginRoute(this.router.url);

  constructor(injector: Injector) {
    super(injector);
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd)
    ).subscribe(event => {
      this.showTabs = this.isNotLoginRoute(event.urlAfterRedirects);
    });
  }

  private isNotLoginRoute(url: string): boolean {
    return url.split(/[?#]/, 1)[0] !== '/login';
  }

}
