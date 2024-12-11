import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(new ValidationPipe());

  const configService = app.get(ConfigService);
  const port = configService.get('PORT');
  const frontendPort = configService.get('FRONT_PORT');

  if (!port || !frontendPort) {
    logger.error('PORT and FRONT_PORT must be defined');
    process.exit(1);
  }

  app.enableCors({
    origin: [`http://localhost:${frontendPort}`],
  });

  await app.listen(port);
  logger.log(`Server running on port ${await app.getUrl()}`);
}
bootstrap();
