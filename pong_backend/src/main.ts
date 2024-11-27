import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const logger = new Logger('Main (main.ts)');
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const port = configService.get('PORT');
  const frontendPort = configService.get('FRONT_PORT');

  app.enableCors({
    origin: [
      `http://localhost:${frontendPort}`,
      // new RegExp(`/^http:\/\/192\.168\.1\.([1-9]|[1-9]\d):${frontendPort}$/`),
    ],
  });

  await app.listen(port);
  logger.log(`Server running on port ${await app.getUrl()}`);
}
bootstrap();
