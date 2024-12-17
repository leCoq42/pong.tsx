import { Injectable } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import {
  GameRoom,
  GameState,
  Client,
  Player,
  Ball,
} from '../../../shared/types';
import { Logger } from '@nestjs/common';

const SERVER_TICK_RATE = 1000 / 120;

@Injectable()
export class GameService {
  private rooms: Map<string, GameRoom> = new Map();
  private playerGameMap: Map<string, string> = new Map();
  private gameLoops: Map<string, NodeJS.Timeout> = new Map();
  private readonly logger = new Logger(GameService.name);
  readonly RECONNECT_TIMEOUT = 5000; // Make this public
  private disconnectedPlayers: Map<
    string,
    { gameId: string; timestamp: number }
  > = new Map();

  private readonly DEFAULT_GAME_CONSTANTS = {
    PADDLE_HEIGHT: 100,
    PADDLE_WIDTH: 10,
    BALL_SIZE: 20,
    BALL_SPEED: 1,
    BALL_ACCELERATION: 1.1,
    PADDLE_SPEED: 10,
    CANVAS_WIDTH: 800,
    CANVAS_HEIGHT: 600,
    WIN_SCORE: 3,
  };

  createGame(
    playerIds: string[],
    mode: 'singleplayer' | 'local-mp' | 'remote-mp',
  ): string {
    const gameId = uuid();
    const initialGameState = this.createInitialGameState();

    const clients: Client[] = [];
    if (mode === 'singleplayer') {
      clients.push({ id: playerIds[0] }, { id: 'bot' });
    } else if (mode === 'local-mp') {
      clients.push({ id: playerIds[0] }, { id: 'player2' });
    } else {
      clients.push({ id: playerIds[0] }, { id: playerIds[1] });
    }

    const players: Player[] = [
      {
        score: 0,
        position:
          this.DEFAULT_GAME_CONSTANTS.CANVAS_HEIGHT / 2 -
          this.DEFAULT_GAME_CONSTANTS.PADDLE_HEIGHT / 2,
      },
      {
        score: 0,
        position:
          this.DEFAULT_GAME_CONSTANTS.CANVAS_HEIGHT / 2 -
          this.DEFAULT_GAME_CONSTANTS.PADDLE_HEIGHT / 2,
      },
    ];

    const gameRoom: GameRoom = {
      gameId,
      clients,
      mode: mode,
      isActive: true,
      isFinished: false,
      gameState: { ball: initialGameState.ball, players },
      gameConstants: { ...this.DEFAULT_GAME_CONSTANTS },
    };

    this.rooms.set(gameId, gameRoom);
    playerIds.forEach((playerId) => {
      this.playerGameMap.set(playerId, gameId);
    });

    this.startGameLoop(gameId);
    return gameId;
  }

  private createInitialGameState(): GameState {
    const ball: Ball = {
      x:
        this.DEFAULT_GAME_CONSTANTS.CANVAS_WIDTH / 2 -
        this.DEFAULT_GAME_CONSTANTS.BALL_SIZE / 2,
      y:
        this.DEFAULT_GAME_CONSTANTS.CANVAS_HEIGHT / 2 -
        this.DEFAULT_GAME_CONSTANTS.BALL_SIZE / 2,
      dirX: Math.random() > 0.5 ? 1 : -1,
      dirY: Math.random() > 0.5 ? 1 : -1,
      speed: this.DEFAULT_GAME_CONSTANTS.BALL_SPEED,
    };

    return {
      ball,
      players: [],
    };
  }

  updateGameState(gameId: string): void {
    try {
      const game = this.rooms.get(gameId);
      if (!game || !game.isActive) return;

      game.gameState.ball.x +=
        game.gameState.ball.speed * game.gameState.ball.dirX;
      game.gameState.ball.y +=
        game.gameState.ball.speed * game.gameState.ball.dirY;

      if (game.mode === 'singleplayer') {
        this.updateAIPosition(game);
      }

      this.handleCollisions(game);
      this.checkScore(game);
      this.checkWinCondition(game);
    } catch (error) {
      this.logger.error(`Error updating game state: ${error}`);
    }
  }

  private handleCollisions(game: GameRoom): void {
    const { ball } = game.gameState;
    const {
      CANVAS_HEIGHT,
      CANVAS_WIDTH,
      PADDLE_HEIGHT,
      PADDLE_WIDTH,
      BALL_SIZE,
      BALL_ACCELERATION,
    } = game.gameConstants;

    if (
      game.gameState.ball.y <= 0 ||
      game.gameState.ball.y >= CANVAS_HEIGHT - BALL_SIZE
    ) {
      game.gameState.ball.dirY *= -1;
      game.gameState.ball.speed *= BALL_ACCELERATION;
    }

    game.gameState.players.forEach((player, index) => {
      const paddleX = index === 0 ? 0 : CANVAS_WIDTH - PADDLE_WIDTH;
      const paddleY = player.position;

      if (
        ball.x + BALL_SIZE >= paddleX &&
        ball.x <= paddleX + PADDLE_WIDTH &&
        ball.y + BALL_SIZE >= paddleY &&
        ball.y <= paddleY + PADDLE_HEIGHT
      ) {
        ball.dirX *= -1;
        ball.speed *= BALL_ACCELERATION;
      }
    });
  }

  private checkScore(game: GameRoom): void {
    const { ball } = game.gameState;
    const { CANVAS_WIDTH, BALL_SIZE } = game.gameConstants;
    if (ball.x >= CANVAS_WIDTH - BALL_SIZE) {
      game.gameState.players[0].score++;
      this.resetBall(game);
    } else if (ball.x <= 0) {
      game.gameState.players[1].score++;
      this.resetBall(game);
    }
  }

  private checkWinCondition(game: GameRoom): void {
    const { WIN_SCORE } = game.gameConstants;

    const winnerIdx = game.gameState.players.findIndex(
      (player) => player.score >= WIN_SCORE,
    );
    if (winnerIdx != -1) {
      game.isActive = false;
      game.isFinished = true;
      game.winner = game.clients[winnerIdx].id;
      this.rooms.set(game.gameId, game);
    }
  }

  private resetBall(game: GameRoom): void {
    const { CANVAS_WIDTH, CANVAS_HEIGHT, BALL_SPEED } = game.gameConstants;

    game.gameState.ball = {
      x: CANVAS_WIDTH / 2,
      y: CANVAS_HEIGHT / 2,
      dirX: Math.random() > 0.5 ? 1 : -1,
      dirY: Math.random() > 0.5 ? 1 : -1,
      speed: BALL_SPEED,
    };
  }

  updatePlayerPosition(
    gameId: string,
    playerIdx: number,
    newPosition: number,
  ): void {
    const game = this.rooms.get(gameId);
    if (!game) return;

    if (playerIdx >= 0 && playerIdx < game.gameState.players.length) {
      const maxPosition =
        game.gameConstants.CANVAS_HEIGHT - game.gameConstants.PADDLE_HEIGHT;
      game.gameState.players[playerIdx].position = Math.max(
        0,
        Math.min(newPosition, maxPosition),
      );
    }
  }

  private updateAIPosition(game: GameRoom): void {
    const aiPlayerIdx = 1;
    const ballY = game.gameState.ball.y;
    const paddleY = game.gameState.players[aiPlayerIdx].position;
    const paddleHeight = game.gameConstants.PADDLE_HEIGHT;
    const paddleCenter = paddleY + paddleHeight / 2;
    const ballCenter = ballY + game.gameConstants.BALL_SIZE / 2;

    if (Math.abs(paddleCenter - ballCenter) > game.gameConstants.PADDLE_SPEED) {
      if (paddleCenter < ballY) {
        game.gameState.players[aiPlayerIdx].position +=
          game.gameConstants.PADDLE_SPEED;
      } else {
        game.gameState.players[aiPlayerIdx].position -=
          game.gameConstants.PADDLE_SPEED;
      }

      const maxPosition =
        game.gameConstants.CANVAS_HEIGHT - game.gameConstants.PADDLE_HEIGHT;
      game.gameState.players[aiPlayerIdx].position = Math.max(
        0,
        Math.min(game.gameState.players[aiPlayerIdx].position, maxPosition),
      );
    }
  }

  getGameRoom(gameId: string): GameRoom | undefined {
    return this.rooms.get(gameId);
  }

  getGameIdByPlayerId(playerId: string): string | undefined {
    return this.playerGameMap.get(playerId);
  }

  getGameByPlayerId(playerId: string): string | undefined {
    return this.playerGameMap.get(playerId);
  }

  isPlayerInGame(playerId: string): boolean {
    return this.playerGameMap.has(playerId);
  }

  getOpponent(gameId: string, playerId: string): Player | undefined {
    const game = this.rooms.get(gameId);
    if (!game) return undefined;

    return game.gameState.players.find(
      (_, index) => game.clients[index].id !== playerId,
    );
  }

  removeGame(playerId: string) {
    const gameId = this.playerGameMap.get(playerId);
    if (gameId) {
      this.cleanUpGame(gameId);
      this.playerGameMap.delete(playerId);
    }
  }

  private cleanUpGame(gameId: string): void {
    this.stopGameLoop(gameId);
    const game = this.rooms.get(gameId);
    if (game) {
      game.clients.forEach((player) => {
        this.playerGameMap.delete(player.id);
      });
      this.rooms.delete(gameId);

      const gameLoop = this.gameLoops.get(gameId);
      if (gameLoop) {
        clearInterval(gameLoop);
        this.gameLoops.delete(gameId);
      }
    }
  }

  private startGameLoop(gameId: string) {
    const interval = setInterval(() => {
      const gameState = this.rooms.get(gameId);
      if (!gameState || !gameState.isActive) {
        this.stopGameLoop(gameId);
        return;
      }
      this.updateGameState(gameId);
    }, 1000 / SERVER_TICK_RATE);
    this.gameLoops.set(gameId, interval);
  }

  private stopGameLoop(gameId: string) {
    const interval = this.gameLoops.get(gameId);
    if (interval) {
      clearInterval(interval);
      this.gameLoops.delete(gameId);
    }
  }

  handlePlayerDisconnect(
    gameId: string,
    playerId: string,
  ): GameRoom | undefined {
    const game = this.rooms.get(gameId);
    if (!game) return undefined;

    const playerIdx = game.clients.findIndex((c) => c.id === playerId);
    const opponentIdx = game.clients.findIndex((c) => c.id !== playerId);

    if (playerIdx === -1 || opponentIdx === -1) return undefined;

    if (game.mode === 'local-mp' || game.mode === 'remote-mp') {
      if (!game.isFinished) {
        // Store disconnected player info with timestamp
        this.disconnectedPlayers.set(playerId, {
          gameId,
          timestamp: Date.now(),
        });

        // Set game to paused instead of finished
        game.isActive = false;
        game.isPaused = true;
        this.rooms.set(gameId, game);

        // Schedule cleanup if player doesn't reconnect
        setTimeout(() => {
          this.handleReconnectTimeout(gameId, playerId);
        }, this.RECONNECT_TIMEOUT);

        return game;
      } else {
        // Normal cleanup for finished games
        this.cleanUpGame(gameId);
      }
    } else if (game.mode === 'singleplayer') {
      this.cleanUpGame(gameId);
    }
    return undefined;
  }

  handleReconnectTimeout(gameId: string, playerId: string) {
    const disconnectedInfo = this.disconnectedPlayers.get(playerId);
    if (!disconnectedInfo || disconnectedInfo.gameId !== gameId) return;

    const game = this.rooms.get(gameId);
    if (!game) return;

    // Set the remaining player as winner
    this.disconnectedPlayers.delete(playerId);
    game.isActive = false;
    game.isFinished = true;
    game.isPaused = false;
    game.winner = game.clients.find((c) => c.id !== playerId)?.id;
    
    this.rooms.set(gameId, game);
    
    return game;
  }

  handleReconnect(playerId: string): GameRoom | undefined {
    const disconnectedInfo = this.disconnectedPlayers.get(playerId);
    if (!disconnectedInfo) return undefined;

    const game = this.rooms.get(disconnectedInfo.gameId);
    if (!game || game.isFinished) return undefined;

    // Remove from disconnected players list
    this.disconnectedPlayers.delete(playerId);

    // Resume the game
    game.isActive = true;
    game.isPaused = false;
    this.rooms.set(disconnectedInfo.gameId, game);

    return game;
  }

  getDisconnectedPlayerInfo(playerId: string) {
    const info = this.disconnectedPlayers.get(playerId);
    if (!info) return null;
    
    // Verify the game still exists and is in a reconnectable state
    const game = this.rooms.get(info.gameId);
    if (!game || game.isFinished) {
      this.disconnectedPlayers.delete(playerId);
      return null;
    }
    
    return info;
  }

  onModuleDestroy() {
    for (const [gameId] of this.rooms) {
      this.cleanUpGame(gameId);
    }
    this.rooms.clear();
    this.playerGameMap.clear();
    this.gameLoops.clear();
  }
}
