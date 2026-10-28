import { Injectable } from '@angular/core';
import { HTTP_INTERCEPTORS, HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Observable, from } from 'rxjs';
import { finalize, switchMap } from 'rxjs/operators';
import { LoadingController } from '@ionic/angular';

@Injectable()
export class HttpLoadingInterceptor implements HttpInterceptor {
  private loadingElement: HTMLIonLoadingElement | null = null;
  private loadingPromise: Promise<void> | null = null;
  private requestCount = 0;

  constructor(private loadingController: LoadingController) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const shouldShowLoading = ++this.requestCount === 1;

    return from(shouldShowLoading ? this.showLoading() : Promise.resolve()).pipe(
      switchMap(() => next.handle(req)),
      finalize(() => this.handleFinalize())
    );
  }

  private showLoading(): Promise<void> {
    if (!this.loadingPromise) {
      const loadingPromise = this.createAndPresentLoading();
      this.loadingPromise = loadingPromise;
      loadingPromise.catch(() => {
        if (this.loadingPromise === loadingPromise) {
          this.loadingPromise = null;
        }
      });
    }

    return this.loadingPromise;
  }

  private async createAndPresentLoading(): Promise<void> {
    const loading = await this.loadingController.create({
      message: 'Carregando...',
      spinner: 'crescent',
    });

    this.loadingElement = loading;
    await loading.present();
  }

  private async hideLoading(): Promise<void> {
    const pendingShow = this.loadingPromise;

    if (pendingShow) {
      try {
        await pendingShow;
      } catch (error) {
        console.error('Falha ao exibir o loading de requisições HTTP.', error);
      }
    }

    if (this.requestCount !== 0) {
      return;
    }

    const currentLoading = this.loadingElement;
    this.loadingElement = null;
    this.loadingPromise = null;

    if (currentLoading) {
      try {
        await currentLoading.dismiss();
      } catch (error) {
        console.error('Falha ao fechar o loading de requisições HTTP.', error);
      }
    }
  }

  private handleFinalize(): void {
    this.requestCount = Math.max(this.requestCount - 1, 0);

    if (this.requestCount === 0) {
      this.hideLoading();
    }
  }
}


export const HTTP_LOADER_INTERCEPTOR_PROVIDER = {
  provide: HTTP_INTERCEPTORS,
  useClass: HttpLoadingInterceptor,
  multi: true
};
