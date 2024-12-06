import { Module } from '@nestjs/common';
import { RoomService } from './room.service';
import { RoomController } from './room.controller';
import { RoomGateway } from './room.gateway';

@Module({
  controllers: [RoomController],
  providers: [RoomService, RoomGateway],
})
export class RoomModule {}
