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
  handleJoinQueue(
    client: Socket,
    mode: 'local-mp' | 'remote-mp' | 'singleplayer',
  ) {
    try {
      this.logger.log(`Player ${client.id} joined queue for mode: ${mode}`);

      if (mode === 'singleplayer') {
        this.handleSingleplayer(client);
      } else if (mode === 'local-mp') {
        this.handleLocalMultiplayer(client);
      } else {
        this.matchmakingQueue.push(client);
        if (this.matchmakingQueue.length >= 2) {
          const player1 = this.matchmakingQueue.shift();
          const player2 = this.matchmakingQueue.shift();
          this.handleRemoteMultiplayer(player1, player2, mode);
        }
      }
    } catch (error) {
      this.logger.error(`Error joining queue: ${error}`);
    }
  }

  @SubscribeMessage('rematch')
  handleRematch(
    client: Socket,
    mode: 'local-mp' | 'remote-mp' | 'singleplayer',
  ) {
    this.handleJoinQueue(client, mode);
  }

  @SubscribeMessage('updatePosition')
  handleUpdatePosition(
    client: Socket,
    payload: { dir: number; player?: number },
  ) {
    const gameId = this.gameService.getGameIdByPlayerId(client.id);
    if (!gameId) return;

    const game = this.gameService.getGameRoom(gameId);
    if (!game) return;

    let playerIdx: number;

    if (game.mode === 'local-mp') {
      playerIdx = payload.player === 2 ? 1 : 0;
    } else {
      playerIdx = game.clients.findIndex((p) => p.id === client.id);
    }

    if (playerIdx === -1) return;

    const currentPosition = game.gameState.players[playerIdx].position;
    const newPosition =
      currentPosition + game.gameConstants.PADDLE_SPEED * payload.dir;
    const maxPosition =
      game.gameConstants.CANVAS_HEIGHT - game.gameConstants.PADDLE_HEIGHT;
    const finalPosition = Math.max(0, Math.min(newPosition, maxPosition));

    this.gameService.updatePlayerPosition(gameId, playerIdx, finalPosition);
  }

  private handleRemoteMultiplayer(
    player1: Socket,
    player2: Socket,
    mode: 'local-mp' | 'remote-mp',
  ) {
    const gameId = this.gameService.createGame([player1.id, player2.id], mode);

    player1.join(gameId);
    player2.join(gameId);

    const game = this.gameService.getGameRoom(gameId);

    player1.emit('gameStarted', { gameId, game });
    player2.emit('gameStarted', { gameId, game });

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

  private handleLocalMultiplayer(client: Socket) {
    try {
      const gameId = this.gameService.createGame(
        [client.id, 'player2'],
        'local-mp',
      );

      client.join(gameId);
      const game = this.gameService.getGameRoom(gameId);

      client.emit('gameStarted', { gameId, game });

      const gameInterval = setInterval(() => {
        const currentGame = this.gameService.getGameRoom(gameId);
        if (!currentGame || !currentGame.isActive) {
          clearInterval(gameInterval);
          return;
        }
        this.gameService.updateGameState(gameId);
        this.server.to(gameId).emit('gameState', currentGame);
      }, SERVER_TICK_RATE);
      this.gameLoops.set(gameId, gameInterval);
    } catch (error) {
      this.logger.error(`Error in handleLocalMultiplayer game: ${error}`);
    }
  }

  private handleSingleplayer(client: Socket) {
    try {
      const gameId = this.gameService.createGame([client.id], 'singleplayer');
      client.join(gameId);

      const game = this.gameService.getGameRoom(gameId);
      client.emit('gameStarted', { gameId, game });

      const gameInterval = setInterval(() => {
        const currentGame = this.gameService.getGameRoom(gameId);
        if (!currentGame || !currentGame.isActive) {
          clearInterval(gameInterval);
          return;
        }

        this.gameService.updateGameState(gameId);
        this.server.to(gameId).emit('gameState', currentGame);
      }, SERVER_TICK_RATE);
    } catch (error) {
      this.logger.error(`Error in handleSingleplayer: ${error}`);
    }
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
