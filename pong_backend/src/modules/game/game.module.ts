import { Module } from '@nestjs/common';
import { GameGateway } from './gateways/game.gateway';
import { GameService } from './services/game.service';
import { RoomService } from './services/room.service';
import { EventEmitterModule } from '@nestjs/event-emitter';

@Module({
  imports: [EventEmitterModule.forRoot()],
  providers: [GameGateway, GameService, RoomService],
})
export class GameModule {}
