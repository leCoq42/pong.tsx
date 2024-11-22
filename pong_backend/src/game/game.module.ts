import { Module } from '@nestjs/common';
// import { GameService } from './game.service';
// import { GameController } from './game.controller';
import { PongModule } from './pong/pong.module';
import { RoomModule } from './room/room.module';

@Module({
  controllers: [],
  providers: [],
  // controllers: [GameController],
  //  providers: [GameService],
  imports: [PongModule, RoomModule],
})
export class GameModule {}
