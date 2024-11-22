import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
} from '@nestjs/websockets';
import { PongService } from './pong.service';
import { CreatePongDto } from './dto/create-pong.dto';
import { UpdatePongDto } from './dto/update-pong.dto';

@WebSocketGateway()
export class PongGateway {
  constructor(private readonly pongService: PongService) {}

  @SubscribeMessage('createPong')
  create(@MessageBody() createPongDto: CreatePongDto) {
    return this.pongService.create(createPongDto);
  }

  @SubscribeMessage('findAllPong')
  findAll() {
    return this.pongService.findAll();
  }

  @SubscribeMessage('findOnePong')
  findOne(@MessageBody() id: number) {
    return this.pongService.findOne(id);
  }

  @SubscribeMessage('updatePong')
  update(@MessageBody() updatePongDto: UpdatePongDto) {
    return this.pongService.update(updatePongDto.id, updatePongDto);
  }

  @SubscribeMessage('removePong')
  remove(@MessageBody() id: number) {
    return this.pongService.remove(id);
  }
}
