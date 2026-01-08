import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CobrosService } from './cobros.service';
import { CobrosController } from './cobros.controller';
import { VentasModule } from '../ventas/ventas.module';
import { CobroSchema, Cobro } from './schema/cobros.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Cobro.name, schema: CobroSchema },
    ]),
    forwardRef(() => VentasModule),
  ],
  controllers: [CobrosController],
  providers: [CobrosService],
  exports: [CobrosService],
})
export class CobrosModule {}