import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  // Winston Logger
  app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER));

  // Seguridad con Helmet
  app.use(helmet());

  // Habilitar CORS
  app.enableCors({
    origin: process.env.CORS_ORIGINS?.split(',') || [
      'http://localhost:4200',
      'http://localhost:4201',
    ],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // Prefijo global para todas las rutas
  app.setGlobalPrefix('api');

  // Filtro global de excepciones
  app.useGlobalFilters(new HttpExceptionFilter());

  // Validación global
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Swagger Documentation
  const config = new DocumentBuilder()
    .setTitle('Astralis API')
    .setDescription('API de e-commerce para tienda de perfumes con soporte para ventas a crédito, pagos online y sistema de envíos')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Ingresa tu token JWT',
        in: 'header',
      },
      'JWT-auth',
    )
    .addTag('Auth', 'Autenticación con OTP')
    .addTag('Catalog', 'Catálogo público de productos')
    .addTag('Cart', 'Carrito de compras')
    .addTag('Orders', 'Gestión de órdenes')
    .addTag('Payments', 'Procesamiento de pagos')
    .addTag('Shipping', 'Cálculo de envíos')
    .addTag('Geography', 'Departamentos, ciudades y zonas')
    .addTag('Addresses', 'Direcciones de envío')
    .addTag('Health', 'Health checks')
    .addTag('Admin - Productos', 'CRUD de productos (Admin)')
    .addTag('Admin - Clientes', 'CRUD de clientes (Admin)')
    .addTag('Admin - Ventas', 'Gestión de ventas (Admin)')
    .addTag('Admin - Cobros', 'Gestión de cobros (Admin)')
    .addTag('Admin - Marcas', 'CRUD de marcas (Admin)')
    .addTag('Admin - Acordes', 'CRUD de acordes (Admin)')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  const port = process.env.PORT || 3000;
  await app.listen(port);

  console.log(`🚀 Servidor corriendo en http://localhost:${port}`);
  console.log(`📚 API disponible en http://localhost:${port}/api`);
  console.log(`📖 Swagger docs en http://localhost:${port}/docs`);
  console.log(`❤️ Health check en http://localhost:${port}/api/health`);
}
bootstrap();
