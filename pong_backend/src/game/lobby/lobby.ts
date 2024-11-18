import { Server, Socket } from 'socket.io';
import { AuthenticatedSocket } from '../types';
import { createLobbyID } from 'src/ids';
import { Cron } from '@nestjs/schedule';
import { Instance } from '../instance/instance';

export class Lobby {
  public readonly id: string = createLobbyID();
  public readonly clients: Map<Socket['id'], AuthenticatedSocket> = new Map<
    Socket['id'],
    AuthenticatedSocket
  >();
  public readonly instance: Instance = new Instance(this);
}

export class LobbyManager {
  public server: Server;

  private readonly lobbies: Map<Lobby['id'], Lobby> = new Map<
    Lobby['id'],
    Lobby
  >();

  public initializeSocket(client: AuthenticatedSocket): void {}

  public terminateSocket(client: AuthenticatedSocket): void {}

  public createLobby(mode: LobbyMode, pointsToWin: number): Lobby {}

  public joinLobby(client: AuthenticatedSocket, lobbyID: string): void {}

  @Cron('*/5 * * * *')
  private lobbiesCleaner(): void {}
}
