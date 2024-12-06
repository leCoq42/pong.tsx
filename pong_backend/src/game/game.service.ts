import { Injectable } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { Player, GameState } from '../../../shared/types';

@Injectable()
export class GameService {
  private games: Map<string, GameState> = new Map();
  private gameLoops: Map<string, NodeJS.Timeout> = new Map();
  private playerGameMap: Map<string, string> = new Map();

  private readonly GAME_CONSTANTS = {
    FRAME_RATE: 60,
    PADDLE_HEIGHT: 100,
    PADDLE_WIDTH: 10,
    BALL_SIZE: 10,
    BALL_SPEED: 5,
    BALL_ACCELERATION: 1.1,
    PADDLE_SPEED: 10,
    CANVAS_WIDTH: 800,
    CANVAS_HEIGHT: 600,
    WIN_SCORE: 3,
  };

  createGame(players: string[]): string {
    const gameId = uuid();
    const gameState = this.createInitialGameState();

    this.games.set(gameId, {
      ...gameState,
      players: players.map((id) => ({
        id,
        position: this.GAME_CONSTANTS.CANVAS_HEIGHT / 2,
        score: 0,
      })),
      isActive: true,
    });

    return gameId;
  }

  private createInitialGameState(): GameState {
    return {
      ball: {
        x: this.GAME_CONSTANTS.CANVAS_WIDTH / 2,
        y: this.GAME_CONSTANTS.CANVAS_HEIGHT / 2,
        dirX: Math.random() > 0.5 ? 1 : -1,
        dirY: Math.random() > 0.5 ? 1 : -1,
        speed: this.GAME_CONSTANTS.BALL_SPEED,
      },
      players: [],
      score1: 0,
      score2: 0,
      isActive: false,
    };
  }

  updateGameState(gameId: string): void {
    const game = this.games.get(gameId);
    if (!game || !game.isActive) return;

    // Update ball position
    game.ball.x += game.ball.speed * game.ball.dirX;
    game.ball.y += game.ball.speed * game.ball.dirY;

    // Wall collisions
    if (
      game.ball.y <= 0 ||
      game.ball.y >=
        this.GAME_CONSTANTS.CANVAS_HEIGHT - this.GAME_CONSTANTS.BALL_SIZE
    ) {
      game.ball.dirY *= -1;
      game.ball.speed *= this.GAME_CONSTANTS.BALL_ACCELERATION;
    }

    // Paddle collisions
    const [player1, player2] = game.players;

    // Player 1 paddle collision
    if (
      game.ball.x <= this.GAME_CONSTANTS.PADDLE_WIDTH &&
      game.ball.y >= player1.position &&
      game.ball.y <= player1.position + this.GAME_CONSTANTS.PADDLE_HEIGHT
    ) {
      game.ball.dirX *= -1;
      game.ball.speed *= this.GAME_CONSTANTS.BALL_ACCELERATION;
    }

    // Player 2 paddle collision
    if (
      game.ball.x >=
        this.GAME_CONSTANTS.CANVAS_WIDTH -
          this.GAME_CONSTANTS.PADDLE_WIDTH -
          this.GAME_CONSTANTS.BALL_SIZE &&
      game.ball.y >= player2.position &&
      game.ball.y <= player2.position + this.GAME_CONSTANTS.PADDLE_HEIGHT
    ) {
      game.ball.dirX *= -1;
      game.ball.speed *= this.GAME_CONSTANTS.BALL_ACCELERATION;
    }

    // Score points
    if (game.ball.x >= this.GAME_CONSTANTS.CANVAS_WIDTH) {
      game.score1++;
      this.resetBall(game);
    }
    if (game.ball.x <= 0) {
      game.score2++;
      this.resetBall(game);
    }

    // Check win condition
    if (
      game.score1 >= this.GAME_CONSTANTS.WIN_SCORE ||
      game.score2 >= this.GAME_CONSTANTS.WIN_SCORE
    ) {
      game.isActive = false;
    }
  }

  private resetBall(game: GameState): void {
    game.ball = {
      x: this.GAME_CONSTANTS.CANVAS_WIDTH / 2,
      y: this.GAME_CONSTANTS.CANVAS_HEIGHT / 2,
      dirX: Math.random() > 0.5 ? 1 : -1,
      dirY: Math.random() > 0.5 ? 1 : -1,
      speed: this.GAME_CONSTANTS.BALL_SPEED,
    };
  }

  updatePlayerPosition(
    gameId: string,
    playerId: string,
    position: number,
  ): void {
    const game = this.games.get(gameId);
    if (!game) return;

    const player = game.players.find((p) => p.id === playerId);
    if (player) {
      player.position = Math.max(
        0,
        Math.min(
          position,
          this.GAME_CONSTANTS.CANVAS_HEIGHT - this.GAME_CONSTANTS.PADDLE_HEIGHT,
        ),
      );
    }
  }

  getGameState(gameId: string): GameState | undefined {
    return this.games.get(gameId);
  }

  getGameByPlayerId(playerId: string): GameState | undefined {
    const gameId = this.playerGameMap.get(playerId);
    return gameId ? this.games.get(gameId) : undefined;
  }

  removePlayer(playerId: string) {
    const gameId = this.playerGameMap.get(playerId);
    if (gameId) {
      this.stopGame(gameId);
      this.playerGameMap.delete(playerId);
    }
  }

  removeGame(gameId: string) {
    this.stopGameLoop(gameId);
    this.games.delete(gameId);
  }

  private startGameLoop(gameId: string) {
    const interval = setInterval(() => {
      const gameState = this.games.get(gameId);
      if (!gameState || !gameState.isActive) {
        this.stopGameLoop(gameId);
        return;
      }
      this.updateGameState(gameState);
    }, 1000 / this.GAME_CONSTANTS.FRAME_RATE);
    this.gameLoops.set(gameId, interval);
  }

  stopGame(gameId: string) {
    this.stopGameLoop(gameId);
    this.games.delete(gameId);
  }

  private stopGameLoop(gameId: string) {
    const interval = this.gameLoops.get(gameId);
    if (interval) {
      clearInterval(interval);
      this.gameLoops.delete(gameId);
    }
  }
}
