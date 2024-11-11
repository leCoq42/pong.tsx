import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SinglePlayerGateway } from './pong/single-player/single-player.gateway';

@Module({
  imports: [],
  controllers: [AppController],
  providers: [AppService, SinglePlayerGateway],
})
export class AppModule {}
