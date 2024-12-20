import { Socket } from 'socket.io-client';
import { createSocket } from '../config/socket';
import { GameRoom, MatchFoundPayload } from '../../../shared/types';

class GameWebSocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private readonly MAX_RECONNECT_ATTEMPTS = 5;
  private eventHandlers: Map<string, ((...args: any[]) => void)[]> = new Map();

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.socket = createSocket();

        this.socket.on('connect', () => {
          this.reconnectAttempts = 0;
          resolve();
        });

        this.socket.on('connect_error', (error) => {
          console.error('Connection error:', error);
          this.handleReconnect();
        });

        this.setupDefaultListeners();
      } catch (error) {
        reject(error);
      }
    });
  }

  private setupDefaultListeners(): void {
    this.on('gameState', (gameState: GameRoom) => {
      this.emit('gameStateUpdate', gameState);
    });

    this.on('matchFound', (data: MatchFoundPayload) => {
      this.emit('matchFoundUpdate', data);
    });
  }

  removeListener(event: string, callback: (...args: any[]) => void): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      const index = handlers.indexOf(callback);
      if (index !== -1) {
        handlers.splice(index, 1);
        this.socket?.off(event, callback);
      }
    }
  }

  disconnect(): void {
    if (this.socket) {
      this.eventHandlers.forEach((handlers, event) => {
        handlers.forEach((handler) => {
          this.socket?.off(event, handler);
        });
      });
      this.eventHandlers.clear();
      this.socket.disconnect();
      this.socket = null;
    }
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  getId(): string | null {
    return this.socket?.id ?? null;
  }
}

export const gameWebSocketService = new GameWebSocketService();
