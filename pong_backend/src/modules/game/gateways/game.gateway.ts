import {
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { GameService } from '../services/gameLogic.service';
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
export class GameGateway implements OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(GameGateway.name);
  private matchmakingQueue: Socket[] = [];
  private gameLoops: Map<string, NodeJS.Timeout> = new Map();

  constructor(
    private gameService: GameService,
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

    const rooms = [...client.rooms];
    this.logger.log(`Client ${client.id} is in rooms:`, rooms);
  }

  handleDisconnect(client: Socket) {
    try {
      this.logger.log(`Opponent disconnected: ${client.id}`);
      this.removeFromQueue(client);
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
  handleJoinGame(client: Socket, data: { gameId: string }) {
    try {
      const game = this.roomService.getRoom(data.gameId);
      if (!game) {
        throw new Error('Game not found');
      }

      client.join(data.gameId);

      if (game.mode === 'singleplayer' || game.mode === 'local-mp') {
        this.startGameLoop(data.gameId);
      } else if (game.mode === 'remote-mp') {
        const room = this.server.sockets.adapter.rooms.get(data.gameId);
        if (room?.size === 2) {
          this.startGameLoop(data.gameId);
        }
      }
    } catch (error) {
      this.logger.error(`Error joining game: ${error}`);
    }
  }

  private startGameLoop(gameId: string) {
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
    this.logger.log(`Player ${client.id} requested rematch for mode: ${mode}`);
    this.handleStartGame(client, mode);
  }

  @SubscribeMessage('updatePosition')
  handleUpdatePosition(
    client: Socket,
    payload: { dir: number; player?: number },
  ) {
    try {
      const gameId = this.roomService.getRoomByPlayerId(client.id);
      if (!gameId) {
        console.log('No game found for player:', client.id);
        return;
      }

      const game = this.roomService.getRoom(gameId);
      if (!game) {
        console.log('Game not found:', gameId);
        return;
      }

      let playerIdx: number;

      if (game.mode === 'local-mp') {
        playerIdx = payload.player === 2 ? 1 : 0;
      } else {
        playerIdx = game.clients.findIndex((p) => p.id === client.id);
      }

      if (playerIdx === -1) {
        console.log('Player index not found:', client.id);
        return;
      }

      const currentPosition = game.gameState.players[playerIdx].position;
      const newPosition =
        currentPosition + game.gameConstants.PADDLE_SPEED * payload.dir;
      const maxPosition =
        game.gameConstants.CANVAS_HEIGHT - game.gameConstants.PADDLE_HEIGHT;
      const finalPosition = Math.max(0, Math.min(newPosition, maxPosition));

      game.gameState.players[playerIdx].position = finalPosition;
      this.roomService.setRoom(gameId, game);

      console.log(
        `Player ${playerIdx} moved from ${currentPosition} to ${finalPosition}`,
      );
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

  @SubscribeMessage('joinMatchmaking')
  handleJoinMatchmaking(client: Socket) {
    try {
      this.matchmakingQueue.push(client);
      if (this.matchmakingQueue.length >= 2) {
        const player1 = this.matchmakingQueue.shift();
        const player2 = this.matchmakingQueue.shift();
        this.handleRemoteMultiplayer(player1, player2, 'remote-mp');

        this.updateMatchmakingQueue();
      }
    } catch (error) {
      this.logger.error(`Error with matchmaking: ${error}`);
      client.emit('matchmakingError', {
        message: 'Failed to join matchmaking',
      });
    }
  }

  private updateMatchmakingQueue() {
    this.matchmakingQueue.forEach((client, idx) => {
      client.emit('matchmakingUpdate', {
        position: idx + 1,
        length: this.matchmakingQueue.length,
        status: 'waiting',
      });
    });
  }

  @SubscribeMessage('leaveMatchmaking')
  handleLeaveMatchmaking(client: Socket) {
    this.removeFromQueue(client);
    client.emit('matchmakingStatus', { status: 'left' });
    this.updateMatchmakingQueue();
  }

  private removeFromQueue(client: Socket) {
    this.matchmakingQueue = this.matchmakingQueue.filter(
      (c) => c.id !== client.id,
    );
  }
}
