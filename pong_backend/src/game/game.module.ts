import { Module } from '@nestjs/common';
import { GameGateway } from './game.gateway';

@Module({
  providers: [GameGateway],
  imports: [],
})
export class GameModule {}
