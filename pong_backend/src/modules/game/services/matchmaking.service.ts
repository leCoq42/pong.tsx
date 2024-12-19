import { Injectable, Logger } from '@nestjs/common';
// import { GameRoom } from '../../../../../shared/types';
import { RoomService } from './room.service';
import { GameService } from './gameLogic.service';
import { GameRoom } from '../../../../../shared/types';

@Injectable()
export class MatchmakingService {
  private readonly logger = new Logger(MatchmakingService.name);
  private matchmakingQueue: string[] = [];
  private matchedPlayers = new Map<
    string,
    { gameId: string; timestamp: number }
  >();
  private queueCheckInterval: NodeJS.Timeout;

  constructor(
    private readonly roomService: RoomService,
    private readonly gameService: GameService,
  ) {
    this.queueCheckInterval = setInterval(() => this.processQueue(), 1000);
  }

  async joinQueue(playerId: string): Promise<number> {
    if (!this.canJoinQueue(playerId)) {
      throw new Error('Player is already in queue');
    }
    this.matchmakingQueue.push(playerId);

    if (this.matchmakingQueue.length >= 2) {
      const player1 = this.matchmakingQueue.shift()!;
      const player2 = this.matchmakingQueue.shift()!;
      const gameId = await this.createGame('remote-mp', [player1, player2]);
    }

    return this.getQueuePosition(playerId);
  }

  async leaveQueue(playerId: string): Promise<void> {
    this.matchmakingQueue = this.matchmakingQueue.filter(
      (id) => id !== playerId,
    );
  }

  async createGame(
    mode: 'singleplayer' | 'local-mp' | 'remote-mp',
    playerIds: string[],
  ): Promise<string> {
    try {
      const gameId = this.gameService.createGame(playerIds, mode);
      this.logger.log(`Created game ${gameId} with mode ${mode}`);
      return gameId;
    } catch (error) {
      this.logger.error(`Failed to create game: ${error}`);
      throw error;
    }
  }

  async getGameState(gameId: string): Promise<GameRoom | undefined> {
    return this.roomService.getRoom(gameId);
  }

  async createRematch(gameId: string): Promise<string> {
    const existingGame = this.roomService.getRoom(gameId);
    if (!existingGame) {
      throw new Error('Game not found');
    }

    return this.createGame(
      existingGame.mode,
      existingGame.clients.map((c) => c.id),
    );
  }

  private canJoinQueue(playerId: string): boolean {
    const inQueue = this.matchmakingQueue.includes(playerId);
    const inGame = this.roomService.isPlayerInRoom(playerId);
    return !inQueue && !inGame;
  }

  private getQueuePosition(playerId: string): number {
    return this.matchmakingQueue.indexOf(playerId) + 1;
  }

  async checkPlayerMatch(playerId: string): Promise<{ gameId: string } | null> {
    const match = this.matchedPlayers.get(playerId);
    if (match) {
      this.matchedPlayers.delete(playerId);
      return match;
    }
    return null;
  }

  private async processQueue(): Promise<void> {
    while (this.matchmakingQueue.length >= 2) {
      const player1 = this.matchmakingQueue.shift()!;
      const player2 = this.matchmakingQueue.shift()!;

      try {
        const gameId = await this.createGame('remote-mp', [player1, player2]);

        const matchInfo = { gameId, timestamp: Date.now() };
        this.matchedPlayers.set(player1, matchInfo);
        this.matchedPlayers.set(player2, matchInfo);

        this.logger.log(`Matched players ${player1} and ${player2}`);
      } catch (error) {
        this.matchmakingQueue.unshift(player2);
        this.matchmakingQueue.unshift(player1);
        this.logger.error(`Failed to create match: ${error}`);
      }
    }
  }

  onModuleDestroy() {
    if (this.queueCheckInterval) {
      clearInterval(this.queueCheckInterval);
    }
  }
}
