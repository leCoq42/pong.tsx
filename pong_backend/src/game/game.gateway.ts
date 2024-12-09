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
  handleUpdatePosition(client: Socket, delta: number) {
    const gameId = this.gameService.getGameIdByPlayerId(client.id);
    if (!gameId) return;

    const game = this.gameService.getGameRoom(gameId);
    if (!game) return;

    const player = game.players.find((p) => p.id === client.id);
    if (!player) return;

    const newPosition = player.position + delta;
    const maxPosition =
      game.gameConstants.CANVAS_HEIGHT - game.gameConstants.PADDLE_HEIGHT;
    const finalPosition = Math.max(0, Math.min(newPosition, maxPosition));

    this.gameService.updatePlayerPosition(gameId, client.id, finalPosition);
  }

  private startGame(player1: Socket, player2: Socket) {
    const gameId = this.gameService.createGame(
      [player1.id, player2.id],
      'multiplayer',
    );

    player1.join(gameId);
    player2.join(gameId);

    const game = this.gameService.getGameRoom(gameId);

    player1.emit('gameStarted', game);
    player2.emit('gameStarted', game);

    const gameInterval = setInterval(() => {
      const currentGame = this.gameService.getGameRoom(gameId);
      if (!currentGame) {
        clearInterval(gameInterval);
        return;
      }

      if (!currentGame.isActive) {
        clearInterval(gameInterval);
        if (currentGame.isFinished) {
          const winner = currentGame.winner === player1.id ? '1' : '2';
          this.server.to(gameId).emit('gameOver', { winner: winner });
        }
        return;
      }
      this.gameService.updateGameState(gameId);
      this.server.to(gameId).emit('gameState', currentGame);
    }, 1000 / 60);
  }

  private removeFromQueue(client: Socket) {
    this.matchmakingQueue = this.matchmakingQueue.filter(
      (c) => c.id !== client.id,
    );
  }
}
