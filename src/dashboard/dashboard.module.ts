import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';
import { Venta, VentaSchema } from '../ventas/schemas/venta.schema';
import { Cobro, CobroSchema } from '../cobros/schemas/cobro.schema';
import { Producto, ProductoSchema } from '../productos/schemas/producto.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Venta.name, schema: VentaSchema },
      { name: Cobro.name, schema: CobroSchema },
      { name: Producto.name, schema: ProductoSchema },
    ]),
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}