import { Injectable } from '@nestjs/common';
import { CreatePongDto } from './dto/create-pong.dto';
import { UpdatePongDto } from './dto/update-pong.dto';

@Injectable()
export class PongService {
  create(createPongDto: CreatePongDto) {
    return 'This action adds a new pong';
  }

  findAll() {
    return `This action returns all pong`;
  }

  findOne(id: number) {
    return `This action returns a #${id} pong`;
  }

  update(id: number, updatePongDto: UpdatePongDto) {
    return `This action updates a #${id} pong`;
  }

  remove(id: number) {
    return `This action removes a #${id} pong`;
  }
}
