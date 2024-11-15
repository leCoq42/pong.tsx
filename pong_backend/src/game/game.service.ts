import { Injectable } from '@nestjs/common';
import { CreateGameFields, RejoinGameFields, JoinGameFields } from './types';
import { createGameID } from 'src/ids';

@Injectable()
export class GameService {
  private gameMap: Map<string, any> = new Map();

  async createGame(fields: CreateGameFields) {
    const gameID = createGameID();

    return {
      ...fields,
      gameId: gameID,
    };
  }

  async joinGame(fields: JoinGameFields) {
    return {
      ...fields,
    };
  }

  async rejoinGame(fields: RejoinGameFields) {
    return { ...fields };
  }

  async getCurrentMatches() {
    return this.gameMap;
  }
}
