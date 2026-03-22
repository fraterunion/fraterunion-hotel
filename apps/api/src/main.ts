import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix(process.env.API_PREFIX || 'api');
  app.enableCors({ origin: [process.env.WEB_APP_URL || 'http://localhost:3000', process.env.ADMIN_APP_URL || 'http://localhost:3001'], credentials: true });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  const port = Number(process.env.API_PORT || 4000);
  await app.listen(port);
  console.log(`API running on http://localhost:${port}/${process.env.API_PREFIX || 'api'}`);
}
bootstrap();
