import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GameModule } from './game/game.module';
import { GameModule } from './game/game.module';
import { GameModule } from './game/game.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { GameGatewayGateway } from './game-gateway/game-gateway.gateway';
import { GameModule } from './game/game.module';

@Module({
  imports: [ConfigModule.forRoot(), GameModule],
  controllers: [AppController],
  providers: [AppService, GameGatewayGateway],
})
export class AppModule {}
