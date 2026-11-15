import { Injectable, NgZone } from '@angular/core';
import * as SockJS from 'sockjs-client';
import { CompatClient, Stomp, StompSubscription } from '@stomp/stompjs';
import { environment } from 'src/environments/environment';
import { Observable, Observer, of } from 'rxjs';
import { KEY_TOKEN, StorageService } from './storage.service';

const TOPIC_SESSION = '/topic/session/*';
const RECONNECT_DELAY = 5000;

@Injectable({
  providedIn: 'root'
})
export class WebsocketService {

  public stompClient: CompatClient;
  public simpSessionId?: string;

  private connectionStarted = false;
  private connectionObservers: Observer<string>[] = [];
  private sessionSubscription: StompSubscription | null = null;
  private comandaHandlers = new Map<string, (body: string) => void>();
  private comandaSubscriptions = new Map<string, StompSubscription>();
  private topicHandlers = new Map<string, Set<(body: string) => void>>();
  private topicSubscriptions = new Map<string, StompSubscription>();

  constructor(private zone: NgZone, private storageService: StorageService) {}

  static formatResponse(body: string) {
    return JSON.parse(body);
  }

  /**
   * Cria uma conexão ao WebSocket (covil-ws):
   *
   * @returns Retorna um Observable<string>, onde essa string é um simpSessionId, utilizada caso necessária.
   */
  createWebSocketConnection(): Observable<string> {
    if (this.stompClient?.connected && this.simpSessionId) {
      return of(this.simpSessionId);
    }

    return new Observable<string>((observer) => {
      this.connectionObservers.push(observer);
      if (!this.connectionStarted) {
        this.connectionStarted = true;
        this.stompClient = Stomp.over(() => new SockJS(`${environment.url}/covil-ws`));
        this.stompClient.reconnectDelay = RECONNECT_DELAY;
        this.stompClient.connectionTimeout = 10000;
        // Lido a cada (re)conexão: o token do visitante só existe depois que a solicitação é aceita.
        this.stompClient.beforeConnect = () => {
          this.stompClient.connectHeaders = this.authHeaders();
        };
        this.stompClient.onWebSocketClose = () => {
          this.simpSessionId = undefined;
          this.sessionSubscription = null;
          this.comandaSubscriptions.clear();
          this.topicSubscriptions.clear();
        };
        this.stompClient.connect({}, () => {
          this.sessionSubscription = this.stompClient.subscribe(TOPIC_SESSION, message => {
            this.zone.run(() => this.setSessionId(message.body));
          });
          this.subscribeToComandaTopics();
          this.topicHandlers.forEach((_, topic) => this.subscribeToStompTopic(topic));
        }, error => {
          console.error('Erro STOMP ao conectar ao servidor:', error.headers.message, error.body);
        });
      }

      return () => {
        this.connectionObservers = this.connectionObservers.filter(item => item !== observer);
      };
    });
  }

  subscribeToComanda(requestId: string, handler: (body: string) => void): void {
    this.comandaHandlers.set(requestId, handler);
    this.subscribeToComandaTopic(requestId, handler);
  }

  unsubscribeFromComanda(requestId: string): void {
    this.comandaSubscriptions.get(requestId)?.unsubscribe();
    this.comandaSubscriptions.delete(requestId);
    this.comandaHandlers.delete(requestId);
  }

  /**
   * Escuta um tópico do websocket. A inscrição é refeita automaticamente após reconexões
   * e pode ser registrada antes da conexão estar ativa.
   *
   * @returns função que cancela a escuta deste handler.
   */
  subscribeToTopic(topic: string, handler: (body: string) => void): () => void {
    if (!this.topicHandlers.has(topic)) {
      this.topicHandlers.set(topic, new Set());
    }
    this.topicHandlers.get(topic).add(handler);
    this.subscribeToStompTopic(topic);

    return () => {
      const handlers = this.topicHandlers.get(topic);
      handlers?.delete(handler);
      if (!handlers?.size) {
        this.topicHandlers.delete(topic);
        this.topicSubscriptions.get(topic)?.unsubscribe();
        this.topicSubscriptions.delete(topic);
      }
    };
  }

  /**
   * Obtém o stompClient da última conexão, necessária para se realizar o subscribe() nos topics.
   *
   * @returns CompatClient, use com subscribe para escutar retornos da api do websocket.
   */
  getClient(): CompatClient {
    return this.stompClient;
  }

  /**
   * Envia dados para o MessageMapping da API.
   *
   * @param path path da API.
   * @param content conteudo do body.
   */
  send(path: string, content: any) {
    if (!this.stompClient?.connected) {
      throw new Error('A conexão com o servidor não está ativa.');
    }
    this.stompClient.send(path, {}, JSON.stringify(content));
  }

  private setSessionId(sessionId: string): void {
    this.simpSessionId = sessionId;
    const observers = [...this.connectionObservers];
    this.connectionObservers = [];
    observers.forEach(observer => {
      observer.next(sessionId);
      observer.complete();
    });
  }

  private subscribeToComandaTopics(): void {
    this.comandaHandlers.forEach((handler, requestId) => {
      this.subscribeToComandaTopic(requestId, handler);
    });
  }

  private subscribeToComandaTopic(requestId: string, handler: (body: string) => void): void {
    if (!this.stompClient?.connected || this.comandaSubscriptions.has(requestId)) {
      return;
    }

    const subscription = this.stompClient.subscribe(`/topic/comanda/${requestId}`, message => {
      this.zone.run(() => handler(message.body));
    });
    this.comandaSubscriptions.set(requestId, subscription);
  }

  private subscribeToStompTopic(topic: string): void {
    if (!this.stompClient?.connected || this.topicSubscriptions.has(topic)) {
      return;
    }

    // A API autoriza a inscrição nos tópicos da comanda pelo token do visitante enviado no próprio SUBSCRIBE.
    const subscription = this.stompClient.subscribe(topic, message => {
      this.zone.run(() => this.topicHandlers.get(topic)?.forEach(handler => handler(message.body)));
    }, this.authHeaders());
    this.topicSubscriptions.set(topic, subscription);
  }

  private authHeaders(): { [key: string]: string } {
    const token = this.storageService.get<string>(KEY_TOKEN);
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

}
