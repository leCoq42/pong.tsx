import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  WebSocketServer,
  WsResponse,
} from '@nestjs/websockets';
// import { CreatePongDto } from './dto/create-pong.dto';
// import { UpdatePongDto } from './dto/update-pong.dto';
import { of, Observable } from 'rxjs';
import { Server } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: '*',
    namespace: 'game',
  },
})
export class RoomGateway {
  @WebSocketServer()
  server: Server;

  onModuleInit() {
    this.server.on('connection', (socket) => {
      console.log(socket.id);
      console.log(socket.connected);
    });
  }

  @SubscribeMessage('message')
  handleMessage(
    @MessageBody()
    data: any,
  ): Observable<WsResponse<any>> {
    console.log('Message receieved from the client');
    console.log(data);
    return of({
      event: 'message',
      data: `Message returned from server: pong`,
    });
  }

  @SubscribeMessage('joinGame')
  joinGame(client: Socket) {
    console.log('Joining game');
  }
}
