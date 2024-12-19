import { Module } from '@nestjs/common';
import { GameGateway } from './gateways/game.gateway';
import { GameService } from './services/gameLogic.service';
import { RoomService } from './services/room.service';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { RoomController } from './controllers/room.controller';
import { MatchmakingService } from './services/matchmaking.service';

@Module({
  imports: [EventEmitterModule.forRoot()],
  controllers: [RoomController],
  providers: [GameGateway, GameService, RoomService, MatchmakingService],
})
export class GameModule {}
