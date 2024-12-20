import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { GameLogicService as GameLogicService } from '../services/gameLogic.service';
import { RoomService } from '../services/room.service';
import { GameRoom } from '../../../../../shared/types';
import { Logger } from '@nestjs/common';

const SERVER_TICK_RATE = 1000 / 60;

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
  namespace: 'game',
})
export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(GameGateway.name);
  private gameLoops: Map<string, NodeJS.Timeout> = new Map();

  constructor(
    private gameService: GameLogicService,
    private roomService: RoomService,
  ) {
    this.gameService.onGameEnd((data) => {
      this.handleGameEnd(data);
    });
  }

  afterInit() {
    this.logger.log('Game Gateway Initialized');
  }

  handleConnection(client: Socket) {
    this.logger.log('Client connected: ' + client.id);
  }

  handleDisconnect(client: Socket) {
    try {
      this.logger.log(`Opponent disconnected: ${client.id}`);
      const gameId = this.roomService.getRoomByPlayerId(client.id);
      if (gameId) {
        const updatedGame = this.roomService.handlePlayerDisconnect(
          gameId,
          client.id,
        );

        if (updatedGame) {
          this.server.to(gameId).emit('opponentDisconnected', {
            playerId: client.id,
            gameState: updatedGame,
          });

          if (this.gameLoops.has(gameId)) {
            clearInterval(this.gameLoops.get(gameId));
            this.gameLoops.delete(gameId);
          }
        }
      }
    } catch (e) {
      this.logger.error(`Error on disconnect: ${e}`);
    }
  }

  @SubscribeMessage('joinGame')
  async handleJoinGame(
    client: Socket,
    data: { gameId: string; playerId: string },
  ) {
    try {
      const game = this.roomService.getRoom(data.gameId);
      if (!game) return;

      await client.join(data.gameId);
      this.roomService.playerGameMap.set(client.id, data.gameId);

      const room = await this.server.in(data.gameId).fetchSockets();
      const roomSize = room.length;

      this.logger.log(
        `Player ${client.id} joined game ${data.gameId}. Room size: ${roomSize}`,
      );

      if (game.matchAccepted && roomSize === 2) {
        this.server.to(data.gameId).emit('gameStarted', {
          gameId: data.gameId,
          game: game,
          mode: game.mode,
        });
        this.startGameLoop(data.gameId);
      }
    } catch (error) {
      this.logger.error(`Error joining game: ${error}`);
      client.emit('error', { message: 'Failed to join game' });
    }
  }

  public startGameLoop(gameId: string) {
    const gameInterval = setInterval(() => {
      const currentGame = this.roomService.getRoom(gameId);
      if (!currentGame || !currentGame.isActive) {
        clearInterval(gameInterval);
        return;
      }
      this.gameService.updateGameState(gameId);
      this.server.to(gameId).emit('gameState', currentGame);
    }, SERVER_TICK_RATE);
    this.gameLoops.set(gameId, gameInterval);
  }

  @SubscribeMessage('startGame')
  handleStartGame(
    client: Socket,
    mode: 'local-mp' | 'remote-mp' | 'singleplayer',
  ) {
    try {
      this.logger.log(`Player ${client.id} ready to start game: ${mode}`);

      const gameId = this.gameService.createGame([client.id], mode);
      client.join(gameId);

      this.roomService.playerGameMap.set(client.id, gameId);

      const game = this.roomService.getRoom(gameId);
      if (game) {
        game.isActive = true;
        this.roomService.setRoom(gameId, game);
        client.emit('gameStarted', { gameId, mode, game });
        this.startGameLoop(gameId);
      }

      this.startGameLoop(gameId);
    } catch (error) {
      this.logger.error(`Error joining queue: ${error}`);
    }
  }

  @SubscribeMessage('updatePosition')
  handleUpdatePosition(
    client: Socket,
    payload: { dir: number; player?: number },
  ) {
    try {
      const gameId = this.roomService.getRoomByPlayerId(client.id);
      if (!gameId) {
        this.logger.error(`Game not found for player ${client.id}`);
        return;
      }

      const game = this.roomService.getRoom(gameId);
      if (!game) return;

      let playerIdx: number;
      if (game.mode === 'local-mp') {
        playerIdx = payload.player === 1 ? 1 : 0;
      } else if (game.mode === 'singleplayer') {
        playerIdx = 1;
      } else {
        playerIdx = game.clients.findIndex((p) => p.id === client.id);
      }
      if (playerIdx === -1) {
        this.logger.error(`Player ${client.id} not found in game ${gameId}`);
        return;
      }

      const currentPosition = game.gameState.players[playerIdx].position;
      const maxPosition =
        game.gameConstants.CANVAS_HEIGHT - game.gameConstants.PADDLE_HEIGHT;
      const newPosition =
        currentPosition + game.gameConstants.PADDLE_SPEED * payload.dir;
      const finalPosition = Math.max(0, Math.min(newPosition, maxPosition));

      game.gameState.players[playerIdx].position = finalPosition;
      this.roomService.setRoom(gameId, game);

      this.server.to(gameId).emit('gameState', game);
    } catch (error) {
      this.logger.error(`Error updating position: ${error}`);
    }
  }

  private handleRemoteMultiplayer(
    player1: Socket,
    player2: Socket,
    mode: 'local-mp' | 'remote-mp',
  ) {
    const gameId = this.gameService.createGame([player1.id, player2.id], mode);

    player1.join(gameId);
    player2.join(gameId);

    const game = this.roomService.getRoom(gameId);

    player1.emit('gameStarted', { gameId, game });
    player2.emit('gameStarted', { gameId, game });

    const gameInterval = setInterval(() => {
      const currentGame = this.roomService.getRoom(gameId);
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
      const game = this.roomService.getRoom(gameId);

      client.emit('gameStarted', { gameId, game });

      const gameInterval = setInterval(() => {
        const currentGame = this.roomService.getRoom(gameId);
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

      const game = this.roomService.getRoom(gameId);
      client.emit('gameStarted', { gameId, game });

      const gameInterval = setInterval(() => {
        const currentGame = this.roomService.getRoom(gameId);
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

  private handleGameEnd(data: {
    gameId: string;
    winner: string;
    reason: string;
    score: number;
  }) {
    this.server.to(data.gameId).emit('gameOver', {
      winner: data.winner,
      reason: data.reason,
      score: data.score,
    });
  }

  private handleGameOver(gameId: string, game: GameRoom) {
    if (!game.winner) return;

    const winnerIdx = game.clients.findIndex((p) => p.id === game.winner);
    let reason = 'win';

    if (game.isPaused) {
      reason = 'timeout';
    } else if (!game.isFinished) {
      reason = 'disconnection';
    }

    this.server.to(gameId).emit('gameOver', {
      winner: (winnerIdx + 1).toString(),
      reason: reason,
      score: {
        player1: game.gameState.players[0].score,
        player2: game.gameState.players[1].score,
      },
    });

    this.logger.log(`Emitted gameOver event to room ${gameId}`);
  }
}
