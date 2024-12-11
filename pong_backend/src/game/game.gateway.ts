import {
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { GameService } from './game.service';
import { GameRoom } from '../../../shared/types';
import { Logger } from '@nestjs/common';

const SERVER_TICK_RATE = 1000 / 60;

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: 'game',
})
export class GameGateway implements OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private matchmakingQueue: Socket[] = [];
  private gameLoops: Map<string, NodeJS.Timeout> = new Map();
  private readonly logger = new Logger(GameGateway.name);

  constructor(private gameService: GameService) {}

  afterInit() {
    this.logger.log('Game Gateway Initialized');
  }

  handleConnection(client: Socket) {
    this.logger.log('Client connected: ' + client.id);
  }

  handleDisconnect(client: Socket) {
    try {
      this.logger.log(`Client disconnected: ${client.id}`);
      this.removeFromQueue(client);
      const gameId = this.gameService.getGameIdByPlayerId(client.id);
      if (gameId) {
        const updatedGame = this.gameService.handlePlayerDisconnect(
          gameId,
          client.id,
        );

        if (updatedGame) {
          this.server.to(gameId).emit('playerDisconnected', {
            playerId: client.id,
            gameState: updatedGame,
          });

          if (!updatedGame.isActive) {
            this.handleGameOver(gameId, updatedGame);
          }
        }
      }
    } catch (e) {
      this.logger.log(`Error on disconnect: ${e}`);
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
  handleUpdatePosition(client: Socket, payload: { dir: number }) {
    const gameId = this.gameService.getGameIdByPlayerId(client.id);
    if (!gameId) return;

    const game = this.gameService.getGameRoom(gameId);
    if (!game) return;

    const playerIndex = game.clients.findIndex((p) => p.id === client.id);
    if (playerIndex === -1) return;

    const currentPosition = game.gameState.players[playerIndex].position;
    const newPosition =
      currentPosition + game.gameConstants.PADDLE_SPEED * payload.dir;
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

    player1.emit('gameStarted', { gameId, mode: 'multiplayer', game });
    player2.emit('gameStarted', { gameId, mode: 'multiplayer', game });

    const gameInterval = setInterval(() => {
      const currentGame = this.gameService.getGameRoom(gameId);
      if (!currentGame) {
        clearInterval(gameInterval);
        return;
      }

      if (!currentGame.isActive) {
        clearInterval(gameInterval);
        if (currentGame.isFinished) {
          this.handleGameOver(gameId, currentGame);
        }
        return;
      }
      this.gameService.updateGameState(gameId);
      this.server.to(gameId).emit('gameState', currentGame);
    }, SERVER_TICK_RATE);
  }

  private handleGameOver(gameId: string, game: GameRoom) {
    if (!game.winner) return;

    const winnerIdx = game.clients.findIndex((p) => p.id === game.winner);
    this.server.to(gameId).emit('gameOver', {
      winner: (winnerIdx + 1).toString(),
      reason: game.isFinished ? 'win' : 'disconnection',
    });
  }

  private removeFromQueue(client: Socket) {
    this.matchmakingQueue = this.matchmakingQueue.filter(
      (c) => c.id !== client.id,
    );
  }
}
