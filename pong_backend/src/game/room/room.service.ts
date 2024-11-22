import { Injectable } from '@nestjs/common';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';

@Injectable()
export class RoomService {
  create(createRoomDto: CreateRoomDto) {
    return 'This action adds a new room';
  }

  findAll() {
    return `This action returns all room`;
  }

  findOne(id: string) {
    return `This action returns room, with id: ${id}`;
  }

  update(id: string, updateRoomDto: UpdateRoomDto) {
    return `This action updates room, with id: ${id}`;
  }

  remove(id: string) {
    return `This action removes room, with id: ${id}`;
  }
}
