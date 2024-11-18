import { Socket } from 'socket.io';
import { ServerEvents } from '../../../shared/game-types';
import { Lobby } from './lobby/lobby';

export type AuthenticatedSocket = Socket & {
  data: {
    lobby: null | Lobby;
  };

  emite: <T>(ev: ServerEvents, data: T) => boolean;
};
