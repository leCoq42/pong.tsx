import { Injectable } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { GameRoom, GameState, Player, Ball } from '../../../shared/types';

@Injectable()
export class GameService {
  private rooms: Map<string, GameRoom> = new Map();
  private playerGameMap: Map<string, string> = new Map();
  private gameLoops: Map<string, NodeJS.Timeout> = new Map();

  private readonly DEFAULT_GAME_CONSTANTS = {
    FRAME_RATE: 60,
    PADDLE_HEIGHT: 100,
    PADDLE_WIDTH: 10,
    BALL_SIZE: 10,
    BALL_SPEED: 2,
    BALL_ACCELERATION: 1.1,
    PADDLE_SPEED: 10,
    CANVAS_WIDTH: 800,
    CANVAS_HEIGHT: 600,
    WIN_SCORE: 3,
  };

  createGame(
    playerIds: string[],
    mode: 'singleplayer' | 'multiplayer',
  ): string {
    const gameId = uuid();
    const initialGameState = this.createInitialGameState();

    const players: Player[] = playerIds.map((id) => ({
      id,
      position: this.DEFAULT_GAME_CONSTANTS.CANVAS_HEIGHT / 2,
      score: 0,
    }));

    const gameRoom: GameRoom = {
      gameId,
      players,
      mode,
      isActive: true,
      isFinished: false,
      gameState: initialGameState,
      gameConstants: { ...this.DEFAULT_GAME_CONSTANTS },
    };

    this.rooms.set(gameId, gameRoom);
    playerIds.forEach((playerId) => {
      this.playerGameMap.set(playerId, gameId);
    });
    return gameId;
  }

  private createInitialGameState(): GameState {
    const ball: Ball = {
      x: this.DEFAULT_GAME_CONSTANTS.CANVAS_WIDTH / 2,
      y: this.DEFAULT_GAME_CONSTANTS.CANVAS_HEIGHT / 2,
      dirX: Math.random() > 0.5 ? 1 : -1,
      dirY: Math.random() > 0.5 ? 1 : -1,
      speed: this.DEFAULT_GAME_CONSTANTS.BALL_SPEED,
    };

    return {
      ball,
      score1: 0,
      score2: 0,
      paddle1Y: this.DEFAULT_GAME_CONSTANTS.CANVAS_HEIGHT / 2,
      paddle2Y: this.DEFAULT_GAME_CONSTANTS.CANVAS_HEIGHT / 2,
    };
  }

  updateGameState(gameId: string): void {
    const game = this.rooms.get(gameId);
    if (!game || !game.isActive) return;

    // Update ball position
    game.gameState.ball.x +=
      game.gameState.ball.speed * game.gameState.ball.dirX;
    game.gameState.ball.y +=
      game.gameState.ball.speed * game.gameState.ball.dirY;

    this.handleCollisions(game);
    this.checkScore(game);
    this.checkWinCondition(game);
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

    // Wall collisions
    if (
      game.gameState.ball.y <= 0 ||
      game.gameState.ball.y >= CANVAS_HEIGHT - BALL_SIZE
    ) {
      game.gameState.ball.dirY *= -1;
      game.gameState.ball.speed *= BALL_ACCELERATION;
    }

    // paddle collision
    game.players.forEach((player, index) => {
      const paddleX =
        index === 0 ? PADDLE_WIDTH : CANVAS_WIDTH - PADDLE_WIDTH - BALL_SIZE;
      const paddleY = player.position;

      if (
        ball.x <= paddleX + PADDLE_WIDTH &&
        ball.x >= paddleX - BALL_SIZE &&
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
    const { CANVAS_WIDTH } = game.gameConstants;
    if (ball.x >= CANVAS_WIDTH) {
      game.gameState.score1++;
      game.players[0].score++;
      this.resetBall(game);
    } else if (ball.x <= 0) {
      game.gameState.score2++;
      game.players[1].score++;
      this.resetBall(game);
    }
  }

  private checkWinCondition(game: GameRoom): void {
    const { WIN_SCORE } = game.gameConstants;

    const winner = game.players.find((player) => player.score >= WIN_SCORE);
    if (winner) {
      game.isActive = false;
      game.isFinished = true;
      game.winner = winner.id;
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
    playerId: string,
    newPosition: number,
  ): void {
    const game = this.rooms.get(gameId);
    if (!game) return;

    const player = game.players.find((p) => p.id === playerId);
    if (player) {
      const maxPosition =
        game.gameConstants.CANVAS_HEIGHT - game.gameConstants.PADDLE_HEIGHT;
      player.position = Math.max(0, Math.min(newPosition, maxPosition));
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

  removePlayer(playerId: string) {
    const gameId = this.playerGameMap.get(playerId);
    if (gameId) {
      this.stopGame(gameId);
      this.playerGameMap.delete(playerId);
    }
  }

  removeGame(gameId: string): void {
    const game = this.rooms.get(gameId);
    if (game) {
      game.players.forEach((player) => {
        this.playerGameMap.delete(player.id);
      });
      this.rooms.delete(gameId);
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
    }, 1000 / this.DEFAULT_GAME_CONSTANTS.FRAME_RATE);
    this.gameLoops.set(gameId, interval);
  }

  stopGame(gameId: string) {
    this.stopGameLoop(gameId);
    this.rooms.delete(gameId);
  }

  private stopGameLoop(gameId: string) {
    const interval = this.gameLoops.get(gameId);
    if (interval) {
      clearInterval(interval);
      this.gameLoops.delete(gameId);
    }
  }
}
