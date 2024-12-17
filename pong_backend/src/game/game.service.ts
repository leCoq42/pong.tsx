import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { GameRoom, GameState, Ball } from '../../../shared/types';
import { Logger } from '@nestjs/common';
import { RoomService } from './room.service';

const SERVER_TICK_RATE = 1000 / 120;

@Injectable()
export class GameService {
  private gameLoops: Map<string, NodeJS.Timeout> = new Map();
  private readonly logger = new Logger(GameService.name);

  private readonly DEFAULT_GAME_CONSTANTS = {
    PADDLE_HEIGHT: 100,
    PADDLE_WIDTH: 10,
    BALL_SIZE: 20,
    BALL_SPEED: 2,
    BALL_ACCELERATION: 1.1,
    PADDLE_SPEED: 5,
    CANVAS_WIDTH: 800,
    CANVAS_HEIGHT: 600,
    WIN_SCORE: 1,
  };

  

  constructor(private readonly roomService: RoomService,
    private gameEndEmitter: EventEmitter2
  ) {}

  onGameEnd(callback: (data: any) => void) {
    this.gameEndEmitter.on('gameEnd', callback);
  }

  createGame(
    playerIds: string[],
    mode: 'singleplayer' | 'local-mp' | 'remote-mp',
  ): string {
    const initialGameState = this.createInitialGameState();
    const gameId = this.roomService.initializeRoom(
      playerIds,
      mode,
      initialGameState,
      this.DEFAULT_GAME_CONSTANTS,
    );
    this.startGameLoop(gameId);
    return gameId;
  }

  private createInitialGameState(): GameState {
    const ball: Ball = {
      x:
        this.DEFAULT_GAME_CONSTANTS.CANVAS_WIDTH / 2 -
        this.DEFAULT_GAME_CONSTANTS.BALL_SIZE / 2,
      y:
        this.DEFAULT_GAME_CONSTANTS.CANVAS_HEIGHT / 2 +
        this.DEFAULT_GAME_CONSTANTS.BALL_SIZE / 2,
      dirX: Math.random() > 0.5 ? 1 : -1,
      dirY: Math.random() > 0.5 ? 1 : -1,
      speed: this.DEFAULT_GAME_CONSTANTS.BALL_SPEED,
    };

    return {
      ball,
      players: [
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
      ],
    };
  }

  updateGameState(gameId: string): void {
    try {
      const game = this.roomService.getRoom(gameId);
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
      this.checkWinCondition(game);
    } else if (ball.x <= 0) {
      game.gameState.players[1].score++;
      this.resetBall(game);
      this.checkWinCondition(game);
    }
  }

  private checkWinCondition(game: GameRoom): void {
    const { WIN_SCORE } = game.gameConstants;

    const winnerIdx = game.gameState.players.findIndex(
      (player) => player.score >= WIN_SCORE,
    );

    if (winnerIdx !== -1) {
      game.isActive = false;
      game.isFinished = true;
      game.winner = game.clients[winnerIdx].id;

      this.gameEndEmitter.emit('gameEnd', {
        gameId: game.gameId,
        winner: game.winner,
        reason: 'score',
        score: game.gameState.players[winnerIdx].score,
      });
      this.roomService.setRoom(game.gameId, game);
    }
  }

  private resetBall(game: GameRoom): void {
    const { CANVAS_WIDTH, CANVAS_HEIGHT, BALL_SPEED, BALL_SIZE } =
      game.gameConstants;

    game.gameState.ball = {
      x: CANVAS_WIDTH / 2 - BALL_SIZE / 2,
      y: CANVAS_HEIGHT / 2 - BALL_SIZE / 2,
      dirX: Math.random() > 0.5 ? 1 : -1,
      dirY: Math.random() > 0.5 ? 1 : -1,
      speed: BALL_SPEED,
    };
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

  private cleanUpGame(gameId: string): void {
    this.stopGameLoop(gameId);
    this.roomService.removeRoom(gameId);
  }

  private startGameLoop(gameId: string) {
    const interval = setInterval(() => {
      const gameState = this.roomService.getRoom(gameId);
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

  onModuleDestroy() {
    for (const [gameId] of this.roomService.getAllRooms()) {
      this.cleanUpGame(gameId);
    }
    this.roomService.clearAllRooms();
    this.gameLoops.clear();
  }
}
