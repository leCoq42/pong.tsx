import { Injectable } from '@nestjs/common';
import { CreateGameFields, RejoinGameFields, JoinGameFields } from './types';
import { createGameID, createUserID } from 'src/ids';

@Injectable()
export class GameService {
  async createGame(fields: CreateGameFields) {
    const gameID = createGameID();
    const userID = createUserID();

    return {
      ...fields,
      userId: userID,
      gameId: gameID,
    };
  }

  async joinGame(fields: JoinGameFields) {
    const userId = createUserID();

    return {
      ...fields,
      userId,
    };
  }

  async rejoinGame(fields: RejoinGameFields) {
    return fields;
  }
}
