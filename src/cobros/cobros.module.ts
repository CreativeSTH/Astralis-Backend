import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CobrosService } from './cobros.service';
import { CobrosController } from './cobros.controller';
import { Cobro, CobroSchema } from './schemas/cobro.schema';
import { VentasModule } from '../ventas/ventas.module';

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