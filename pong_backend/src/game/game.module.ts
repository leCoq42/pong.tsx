import { Module } from '@nestjs/common';
import { GameGateway } from './game.gateway';
import { GameService } from './game.service';
import { RoomModule } from './room.module';
import { EventEmitterModule } from '@nestjs/event-emitter';

@Module({
  imports: [RoomModule, EventEmitterModule.forRoot()],
  providers: [GameGateway, GameService],
})
export class GameModule {}
