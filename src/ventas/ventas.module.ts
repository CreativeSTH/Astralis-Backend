import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { VentasService } from './ventas.service';
import { VentasController } from './ventas.controller';
import { Venta, VentaSchema } from './schemas/venta.schema';
import { ProductosModule } from '../productos/productos.module';
import { ClientesModule } from '../clientes/clientes.module';
import { CobrosModule } from '../cobros/cobros.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Venta.name, schema: VentaSchema },
    ]),
    ProductosModule,
    ClientesModule,
    forwardRef(() => CobrosModule),
  ],
  controllers: [VentasController],
  providers: [VentasService],
  exports: [VentasService, MongooseModule],
})
export class VentasModule {}