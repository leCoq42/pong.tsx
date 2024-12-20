import { RoomService } from './room.service';
import { GameLogicService } from './gameLogic.service';
import { GameRoom } from '../../../../../shared/types';
import { GameGateway } from '../gateways/game.gateway';
import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';

@Injectable()
export class MatchmakingService {
  private readonly logger = new Logger(MatchmakingService.name);

  private matchmakingQueue: string[] = [];
  private queuedPlayers: Set<string> = new Set();
  private matchedPlayers = new Map<
    string,
    { gameId: string; timestamp: number }
  >();
  private queueCheckInterval: NodeJS.Timeout;

  constructor(
    private readonly roomService: RoomService,
    private readonly gameService: GameLogicService,
    @Inject(forwardRef(() => GameGateway))
    private readonly gameGateway: GameGateway,
  ) {
    this.queueCheckInterval = setInterval(() => this.processQueue(), 1000);
  }

  async joinQueue(playerId: string): Promise<number> {
    this.logger.log(`Attempting to join queue: ${playerId}`);

    if (this.queuedPlayers.has(playerId)) {
      throw new Error(`Player ${playerId} is already in queue`);
    }

    this.queuedPlayers.add(playerId);
    this.matchmakingQueue.push(playerId);

    if (this.matchmakingQueue.length >= 2) {
      await this.processQueue();
    }

    return this.matchmakingQueue.indexOf(playerId);
  }

  async leaveQueue(playerId: string): Promise<void> {
    this.queuedPlayers.delete(playerId);
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

  async checkPlayerMatch(playerId: string): Promise<{ gameId: string } | null> {
    const match = this.matchedPlayers.get(playerId);
    if (match) {
      this.matchedPlayers.delete(playerId);
      return match;
    }
    return null;
  }

  private async processQueue(): Promise<void> {
    if (this.matchmakingQueue.length < 2) return;

    const player1Id = this.matchmakingQueue.shift()!;
    const player2Id = this.matchmakingQueue.shift()!;

    try {
      const gameId = await this.createGame('remote-mp', [player1Id, player2Id]);
      const game = this.roomService.getRoom(gameId);

      if (game) {
        const matchInfo = { gameId, timestamp: Date.now() };
        this.matchedPlayers.set(player1Id, matchInfo);
        this.matchedPlayers.set(player2Id, matchInfo);

        this.queuedPlayers.delete(player1Id);
        this.queuedPlayers.delete(player2Id);

        this.gameGateway.server.to(player1Id).emit('matchFound', {
          gameId,
          opponent: player2Id,
          timeToAccept: 30,
        });

        this.gameGateway.server.to(player2Id).emit('matchFound', {
          gameId,
          opponent: player1Id,
          timeToAccept: 30,
        });

        this.logger.log(`Matched players ${player1Id} and ${player2Id}`);
      }
    } catch (error) {
      this.logger.error(`Failed to create match: ${error}`);
      this.matchmakingQueue.unshift(player2Id);
      this.matchmakingQueue.unshift(player1Id);
    }
  }

  onModuleDestroy() {
    if (this.queueCheckInterval) {
      clearInterval(this.queueCheckInterval);
    }
  }
}
