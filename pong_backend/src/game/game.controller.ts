import { Body, Controller, Get, Post, Logger } from '@nestjs/common';
import { GameService } from './game.service';
import { CreateGameFields, JoinGameFields } from './types';

@Controller('/game')
export class GameController {
  constructor(private gameService: GameService) {}

  @Get()
  async getRooms() {
    const result = await this.gameService.getCurrentMatches();
    return result;
  }

  @Post()
  async createGame(@Body() createInfo: CreateGameFields) {
    Logger.log('In create');
    const result = await this.gameService.createGame(createInfo);
    return result;
  }

  @Post('/join')
  async joinGame(@Body() joinInfo: JoinGameFields) {
    Logger.log('In join');
    const result = await this.gameService.joinGame(joinInfo);
    return result;
  }

  @Post('/rejoin')
  async rejoinGame() {
    Logger.log('In rejoin');
    const result = await this.gameService.rejoinGame({
      gameID: 'from token',
    });
    return result;
  }
}
