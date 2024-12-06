import { Module } from '@nestjs/common';
import { GameService } from './game.service';
// import { GameController } from './game.controller';
import { PongModule } from './pong/pong.module';
import { RoomModule } from './room/room.module';
import { GameGateway } from './game.gateway';

@Module({
  controllers: [],
  providers: [GameGateway, GameService],
  // controllers: [GameController],
  imports: [PongModule, RoomModule],
})
export class GameModule {}
