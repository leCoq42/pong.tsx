import { SubscribeMessage, WebSocketGateway } from '@nestjs/websockets';
import { Socket } from 'socket.io';

@WebSocketGateway()
export class SinglePlayerGateway {
  @SubscribeMessage(ClientEvents.Ping)
  onPing(client: Socket): void {
    client.emit(ServerEvents.Pong, {
      message: 'Pong',
    });
  }
}

export enum ClientEvents {
  Ping = 'client.ping',
}

export enum ServerEvents {
  Pong = 'server.pong',
}
