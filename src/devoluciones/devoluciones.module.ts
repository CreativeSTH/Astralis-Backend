import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { Devolucion, DevolucionSchema } from './schemas/devolucion.schema';
import { DevolucionesService } from './devoluciones.service';
import { DevolucionesController } from './devoluciones.controller';
import { VentasModule } from '../ventas/ventas.module';
import { ProductosModule } from '../productos/productos.module';
import { ClientesModule } from '../clientes/clientes.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Devolucion.name, schema: DevolucionSchema },
    ]),
    VentasModule,
    ProductosModule,
    ClientesModule,
  ],
  controllers: [DevolucionesController],
  providers: [DevolucionesService],
  exports: [DevolucionesService],
})
export class DevolucionesModule {}
