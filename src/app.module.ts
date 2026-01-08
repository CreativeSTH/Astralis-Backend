import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import {
  WinstonModule,
  utilities as nestWinstonModuleUtilities,
} from 'nest-winston';
import * as winston from 'winston';

import { ProductosModule } from './productos/productos.module';
import { ClientesModule } from './clientes/clientes.module';
import { VentasModule } from './ventas/ventas.module';
import { CobrosModule } from './cobros/cobros.module';
import { MarcasModule } from './marcas/marcas.module';
import { AcordesModule } from './acordes/acordes.module';
import { AuthModule } from './auth/auth.module';
import { EmailModule } from './email/email.module';
import { CatalogModule } from './catalog/catalog.module';
import { CartModule } from './cart/cart.module';
import { GeographyModule } from './geography/geography.module';
import { ShippingModule } from './shipping/shipping.module';
import { PaymentsModule } from './payments/payments.module';
import { OrdersModule } from './orders/orders.module';
import { AddressesModule } from './addresses/addresses.module';
import { HealthModule } from './health/health.module';
import { CouponsModule } from './coupons/coupons.module';
import { WishlistModule } from './wishlist/wishlist.module';
import { ReviewsModule } from './reviews/reviews.module';
import { DevolucionesModule } from './devoluciones/devoluciones.module';

@Module({
  imports: [
    // Configuración global
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    // Rate Limiting
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000, // 1 segundo
        limit: 10, // 10 requests por segundo
      },
      {
        name: 'medium',
        ttl: 10000, // 10 segundos
        limit: 50, // 50 requests cada 10 segundos
      },
      {
        name: 'long',
        ttl: 60000, // 1 minuto
        limit: 200, // 200 requests por minuto
      },
    ]),

    // Winston Logging
    WinstonModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        transports: [
          new winston.transports.Console({
            format: winston.format.combine(
              winston.format.timestamp(),
              winston.format.ms(),
              nestWinstonModuleUtilities.format.nestLike('Astralis', {
                colors: true,
                prettyPrint: true,
              }),
            ),
          }),
          // Log de errores a archivo
          new winston.transports.File({
            filename: 'logs/error.log',
            level: 'error',
            format: winston.format.combine(
              winston.format.timestamp(),
              winston.format.json(),
            ),
          }),
          // Log general a archivo
          new winston.transports.File({
            filename: 'logs/combined.log',
            format: winston.format.combine(
              winston.format.timestamp(),
              winston.format.json(),
            ),
          }),
        ],
      }),
    }),

    // MongoDB
    MongooseModule.forRoot(process.env.MONGODB_URI!),

    // Health Check
    HealthModule,

    // Auth & Email
    AuthModule,
    EmailModule,

    // Store (Public)
    CatalogModule,
    CartModule,

    // Geography & Shipping
    GeographyModule,
    ShippingModule,

    // Addresses
    AddressesModule,

    // Payments & Orders
    PaymentsModule,
    OrdersModule,

    // Coupons, Wishlist & Reviews
    CouponsModule,
    WishlistModule,
    ReviewsModule,

    // Admin
    ProductosModule,
    ClientesModule,
    VentasModule,
    CobrosModule,
    MarcasModule,
    AcordesModule,
    DevolucionesModule,
  ],
  providers: [
    // Rate Limiting global
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}