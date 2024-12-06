import {
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { GameService } from './game.service';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: 'game',
})
export class GameGateway {
  @WebSocketServer() server: Server;
  private matchmakingQueue: Socket[] = [];
  private gameLoops: Map<string, NodeJS.Timeout> = new Map();

  constructor(private gameService: GameService) {}

  afterInit() {
    console.log('Game Gateway Initialized');
  }

  handleConnection(client: Socket) {
    console.log('Client connected: ' + client.id);
  }

  handleDisconnect(client: Socket) {
    console.log('Client disconnected: ' + client.id);
    this.removeFromQueue(client);

    const gameId = this.gameService.getGameIdByPlayerId(client.id);
    if (gameId) {
      const gameLoop = this.gameLoops.get(gameId);
      if (gameLoop) {
        clearInterval(gameLoop);
        this.gameLoops.delete(gameId);
      }
      this.gameService.removeGame(gameId);
    }
  }

  @SubscribeMessage('joinQueue')
  handleJoinQueue(client: Socket) {
    this.matchmakingQueue.push(client);
    if (this.matchmakingQueue.length >= 2) {
      const player1 = this.matchmakingQueue.shift();
      const player2 = this.matchmakingQueue.shift();
      this.startGame(player1, player2);
    }
  }

  @SubscribeMessage('startSinglePlayer')
  handleSinglePlayerGame(client: Socket) {
    const gameId = this.gameService.createGame([client.id], 'singleplayer');
    client.emit('gameStarted', { gameId, mode: 'singleplayer' });
  }

  @SubscribeMessage('updatePosition')
  handleUpdatePosition(client: Socket, position: number) {
    const gameId = this.gameService.getGameIdByPlayerId(client.id);
    if (!gameId) return;

    if ()
    if (game) {
      const player = game.players.find((p) => p.id === client.id);
      if (player) player.position = position;
    }
  }

  private startGame(player1: Socket, player2: Socket) {
    const gameId = this.gameService.createGame(
      [player1.id, player2.id],
      'multiplayer',
    );

    player1.join(gameId);
    player2.join(gameId);

    player1.emit('gameStarted', { gameId, mode: 'multiplayer' });
    player2.emit('gameStarted', { gameId, mode: 'multiplayer' });

    const gameLoop = setInterval(() => {
      const gameState = this.gameService.getGameState(gameId);
      if (gameState) {
        this.gameService.updateGameState(gameId);
        this.server.to(gameId).emit('gameState', gameState);
      }
    }, 1000 / 60);

    this.gameLoops.set(gameId, gameLoop);
  }

  private removeFromQueue(client: Socket) {
    this.matchmakingQueue = this.matchmakingQueue.filter(
      (c) => c.id !== client.id,
    );
  }
}
