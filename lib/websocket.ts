type MessageHandler = (data: any) => void;

export type WSConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';

interface QueuedMessage {
  data: any;
  timestamp: number;
  retries: number;
}

const MAX_RECONNECT_DELAY = 30000;
const INITIAL_RECONNECT_DELAY = 1000;
const PING_INTERVAL = 25000;
const PONG_TIMEOUT = 10000;
const MAX_QUEUE_SIZE = 100;
const MAX_MESSAGE_RETRIES = 3;
const MAX_RECONNECT_ATTEMPTS = 20;

class EtholWebSocket {
  private ws: WebSocket | null = null;
  private url: string;
  private token: string | null = null;
  private handlers: Map<string, Set<MessageHandler>> = new Map();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private shouldReconnect = false;
  private pingInterval: ReturnType<typeof setInterval> | null = null;
  private pongTimeoutTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempts = 0;
  private _connectionState: WSConnectionState = 'disconnected';
  private messageQueue: QueuedMessage[] = [];
  private lastPongTime = Date.now();
  private processedMessageIds: Set<string> = new Set();
  private visibilityHandler: (() => void) | null = null;

  private stateListeners: Set<(state: WSConnectionState) => void> = new Set();

  constructor(url = 'wss://chat.ethol.pens.ac.id/socket') {
    this.url = url;
  }

  get connectionState(): WSConnectionState {
    return this._connectionState;
  }

  private setConnectionState(state: WSConnectionState) {
    this._connectionState = state;
    this.stateListeners.forEach((fn) => fn(state));
  }

  onConnectionStateChange(fn: (state: WSConnectionState) => void): () => void {
    this.stateListeners.add(fn);
    return () => this.stateListeners.delete(fn);
  }

  connect(token?: string) {
    if (this.ws?.readyState === WebSocket.OPEN) return;
    this.shouldReconnect = true;
    if (token) this.token = token;
    this.setConnectionState('connecting');

    try {
      const wsUrl = this.token ? `${this.url}?token=${this.token}` : this.url;
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('[WS] Connected to ETHOL WebSocket');
        this.reconnectAttempts = 0;
        this.setConnectionState('connected');
        this.startPing();
        this.flushMessageQueue();
        this.emit('_connected', {});
      };

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);

          if (msg.type === 'PONG') {
            this.lastPongTime = Date.now();
            this.clearPongTimeout();
            return;
          }

          const msgId = msg.id || msg.idNotifikasi || `${msg.type}_${Date.now()}_${Math.random()}`;
          if (this.processedMessageIds.has(msgId)) return;
          if (this.processedMessageIds.size > 500) {
            const entries = Array.from(this.processedMessageIds);
            this.processedMessageIds = new Set(entries.slice(entries.length - 300));
          }
          this.processedMessageIds.add(msgId);

          const type = msg.type || msg.tipe || 'MESSAGE';
          this.emit(type, msg);
          this.emit('*', msg);
        } catch {
          this.emit('*', { raw: event.data });
        }
      };

      this.ws.onclose = (event) => {
        console.log('[WS] Disconnected (code:', event.code, ')');
        this.stopPing();
        this.ws = null;
        if (this.shouldReconnect) {
          this.scheduleReconnect();
        } else {
          this.setConnectionState('disconnected');
        }
      };

      this.ws.onerror = () => {
        console.warn('[WS] Connection error, reconnecting...');
        this.ws?.close();
      };

      this.setupVisibilityHandler();
    } catch (err) {
      console.warn('[WS] Connection error:', err);
      if (this.shouldReconnect) {
        this.scheduleReconnect();
      } else {
        this.setConnectionState('disconnected');
      }
    }
  }

  private setupVisibilityHandler() {
    if (this.visibilityHandler) return;
    this.visibilityHandler = () => {
      if (document.hidden && this.ws?.readyState === WebSocket.OPEN) {
        this.ws.close(1000, 'Tab hidden');
      } else if (!document.hidden && this.shouldReconnect && !this.ws) {
        this.connect(this.token ?? undefined);
      }
    };
    document.addEventListener('visibilitychange', this.visibilityHandler);
  }

  private scheduleReconnect() {
    this.reconnectAttempts++;

    if (this.reconnectAttempts > MAX_RECONNECT_ATTEMPTS) {
      console.warn('[WS] Max reconnection attempts reached, giving up');
      this.shouldReconnect = false;
      this.setConnectionState('disconnected');
      return;
    }

    const delay = Math.min(
      INITIAL_RECONNECT_DELAY * Math.pow(2, this.reconnectAttempts - 1),
      MAX_RECONNECT_DELAY
    ) + Math.random() * 1000;

    this.setConnectionState('reconnecting');

    console.log(`[WS] Reconnecting in ${Math.round(delay)}ms (attempt ${this.reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`);
    this.reconnectTimer = setTimeout(() => this.connect(this.token ?? undefined), delay);
  }

  disconnect() {
    this.shouldReconnect = false;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.stopPing();
    this.clearPongTimeout();
    if (this.visibilityHandler) {
      document.removeEventListener('visibilitychange', this.visibilityHandler);
      this.visibilityHandler = null;
    }
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
    this.setConnectionState('disconnected');
    this.reconnectAttempts = 0;
  }

  updateToken(token: string) {
    this.token = token;
    if (this.shouldReconnect && this._connectionState !== 'connected') {
      if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
      this.connect(token);
    }
  }

  on(event: string, handler: MessageHandler) {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)!.add(handler);
    return () => this.off(event, handler);
  }

  off(event: string, handler: MessageHandler) {
    const handlers = this.handlers.get(event);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) this.handlers.delete(event);
    }
  }

  private emit(event: string, data: any) {
    const handlers = this.handlers.get(event);
    if (handlers) {
      handlers.forEach((h) => {
        try { h(data); } catch (e) { console.error('[WS] Handler error:', e); }
      });
    }
  }

  private startPing() {
    this.lastPongTime = Date.now();
    this.pingInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        if (Date.now() - this.lastPongTime > PONG_TIMEOUT + PING_INTERVAL) {
          console.warn('[WS] Pong timeout, reconnecting...');
          this.ws.close(4001, 'Pong timeout');
          return;
        }
        this.ws.send(JSON.stringify({ type: 'PING' }));
        this.pongTimeoutTimer = setTimeout(() => {
          if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.close(4001, 'Pong timeout');
          }
        }, PONG_TIMEOUT);
      }
    }, PING_INTERVAL);
  }

  private stopPing() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    this.clearPongTimeout();
  }

  private clearPongTimeout() {
    if (this.pongTimeoutTimer) {
      clearTimeout(this.pongTimeoutTimer);
      this.pongTimeoutTimer = null;
    }
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  send(data: any) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
      return true;
    }
    this.enqueueMessage(data);
    return false;
  }

  private enqueueMessage(data: any) {
    if (this.messageQueue.length >= MAX_QUEUE_SIZE) {
      this.messageQueue.shift();
    }
    this.messageQueue.push({
      data,
      timestamp: Date.now(),
      retries: 0,
    });
  }

  private flushMessageQueue() {
    const now = Date.now();
    this.messageQueue = this.messageQueue.filter((m) => {
      if (m.retries >= MAX_MESSAGE_RETRIES) return false;
      if (now - m.timestamp > 60000) return false;
      m.retries++;
      this.ws?.send(JSON.stringify(m.data));
      return false;
    });
  }

  sendPresence(courseId: number, status: string) {
    return this.send({ type: 'PRESENSI', kuliah: courseId, status });
  }

  sendChatMessage(roomId: string, message: string) {
    return this.send({ type: 'CHAT', ruang: roomId, pesan: message });
  }
}

export const etholWs = new EtholWebSocket();
export default EtholWebSocket;
