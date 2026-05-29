import './instrument'; // Sentry init — DEVE vir antes de qualquer outro import
import 'reflect-metadata';

import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpAdapterHost, NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { SentryGlobalFilter } from '@sentry/nestjs/setup';

import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const config = app.get(ConfigService);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Sentry filter global — captura todas as exceptions não-tratadas.
  // No-op se SENTRY_DSN não setado (instrument.ts skip Sentry.init).
  const { httpAdapter } = app.get(HttpAdapterHost);
  app.useGlobalFilters(new SentryGlobalFilter(httpAdapter));

  const corsOrigins = config.get<string[]>('CORS_ORIGINS') ?? [];
  const nodeEnv = config.get<string>('NODE_ENV') ?? 'development';
  // Production: sempre lista explícita (env validation garante não-vazio).
  // Dev/test: lista opcional — sem origens, libera tudo pra facilitar Expo Go etc.
  const corsOrigin =
    nodeEnv === 'production'
      ? corsOrigins
      : corsOrigins.length > 0
        ? corsOrigins
        : true;
  app.enableCors({
    origin: corsOrigin,
    credentials: true,
  });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Barbearia API')
    .setDescription('Backend do SaaS de gestão de barbearias')
    .setVersion('0.0.0')
    .addBearerAuth({
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
      description: 'Supabase Auth JWT',
    })
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: { persistAuthorization: true },
  });

  const port = config.get<number>('PORT') ?? 3333;
  await app.listen(port, '0.0.0.0');

   
  console.log(`API on http://localhost:${port} (docs: /docs)`);
}

bootstrap().catch((err) => {
   
  console.error('Failed to bootstrap API', err);
  process.exit(1);
});
