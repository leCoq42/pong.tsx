import {
  Controller,
  Get,
  Post,
  Req,
  Body,
  HttpException,
} from '@nestjs/common';
import { MatchmakingService } from '../services/matchmaking.service';
import { Request } from 'express';

@Controller('/api/game')
export class RoomController {
  constructor(private matchmakingService: MatchmakingService) {}

  @Post('/start')
  async startGame(
    @Body('mode') mode: 'singleplayer' | 'local-mp' | 'remote-mp',
    @Body('playerId') playerId: string,
  ) {
    try {
      const gameId = await this.matchmakingService.createGame(mode, [playerId]);
      const gameState = await this.matchmakingService.getGameState(gameId);
      return { gameId, gameState };
    } catch (error) {
      throw new HttpException(`Failed to create game: ${error}`, 500);
    }
  }

  @Post('/queue/join')
  async joinQueue(@Body('playerId') playerId: string) {
    try {
      const position = await this.matchmakingService.joinQueue(playerId);
      return { data: { position, success: true } };
    } catch (error) {
      throw new HttpException(`Failed to join queue: ${error}`, 500);
    }
  }

  @Post('/queue/leave')
  async leaveQueue(@Body('playerId') playerId: string) {
    try {
      await this.matchmakingService.leaveQueue(playerId);
      return { success: true };
    } catch (error) {
      throw new HttpException(`Failed to leave queue: ${error}`, 500);
    }
  }

  @Post('/rematch')
  async rematch(@Body('gameId') gameId: string) {
    try {
      const newGameId = await this.matchmakingService.createRematch(gameId);
      return { newGameId };
    } catch (error) {
      throw new HttpException(`Failed to create rematch: ${error}`, 500);
    }
  }

  @Get('/queue/status')
  async getQueueStatus(@Req() req: Request) {
    try {
      const playerId = req.query.playerId as string;
      const match = await this.matchmakingService.checkPlayerMatch(playerId);
      if (match) {
        return { matched: true, gameId: match.gameId };
      }
      return { matched: false };
    } catch (error) {
      throw new HttpException(`Failed to check queue status: ${error}`, 500);
    }
  }
}
