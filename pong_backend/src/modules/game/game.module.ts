import { Module } from '@nestjs/common';
import { GameGateway } from './gateways/game.gateway';
import { GameLogicService } from './services/gameLogic.service';
import { RoomService } from './services/room.service';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { RoomController } from './controllers/room.controller';
import { MatchmakingService } from './services/matchmaking.service';
import { MatchmakingGateway } from './gateways/matchmaking.gateway';

@Module({
  imports: [EventEmitterModule.forRoot()],
  controllers: [RoomController],
  providers: [
    GameGateway,
    MatchmakingGateway,
    GameLogicService,
    RoomService,
    MatchmakingService,
  ],
})
export class GameModule {}
