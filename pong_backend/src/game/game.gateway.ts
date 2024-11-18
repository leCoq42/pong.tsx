import {
  SubscribeMessage,
  WebSocketGateway,
  WsResponse,
} from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { ClientEvents, ServerEvents } from '../../../shared/game-types';
import { ServerPayloads } from '../../../shared/game-types';
import { AuthenticatedSocket } from './types';
import { LobbyCreateDto } from './dtos';
// import { UsePipes } from '@nestjs/common';

// @UsePipes(new WsValidationPipe())
@WebSocketGateway()
export class GameGateway {
  @SubscribeMessage(ClientEvents.Ping)
  onPing(client: Socket): void {
    client.emit(ServerEvents.Pong, {
      message: 'pong',
    });
  }

  @SubscribeMessage(ClientEvents.LobbyCreate)
  onLobbyCreate(
    client: AuthenticatedSocket,
    data: LobbyCreateDto,
  ): WsResponse<ServerPayloads[ServerEvents.GameMessage]> {
    const lobby = this.lobbyManager.createLobby(data.mode, data.pointsToWin);
    lobby.addPlayer(client);

    return {
      event: ServerEvents.GameMessage,
      data: {
        color: 'green',
        message: 'Lobby created',
      },
    };
  }
}
