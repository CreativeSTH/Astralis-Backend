import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ProductosModule } from './productos/productos.module';
import { ClientesModule } from './clientes/clientes.module';
import { VentasModule } from './ventas/ventas.module';
import { CobrosModule } from './cobros/cobros.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { MarcasModule } from './marcas/marcas.module';
import { AcordesModule } from './acordes/acordes.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    MongooseModule.forRoot(process.env.MONGODB_URI!),
    ProductosModule,
    ClientesModule,
    VentasModule,
    CobrosModule,
    DashboardModule,
    MarcasModule,
    AcordesModule,
  ],
})
export class AppModule {}