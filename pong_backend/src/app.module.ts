import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GameModule } from './game/game.module';

@Module({
  imports: [ConfigModule.forRoot(), GameModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
