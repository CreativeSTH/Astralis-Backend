import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import {
  Transportadora,
  TransportadoraSchema,
} from './schemas/transportadora.schema';
import { MetodoEnvio, MetodoEnvioSchema } from './schemas/metodo-envio.schema';

import { ShippingController } from './shipping.controller';
import { ShippingService } from './shipping.service';
import { ShippingCalculatorService } from './shipping-calculator.service';

import { GeographyModule } from '../geography/geography.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Transportadora.name, schema: TransportadoraSchema },
      { name: MetodoEnvio.name, schema: MetodoEnvioSchema },
    ]),
    GeographyModule,
  ],
  controllers: [ShippingController],
  providers: [ShippingService, ShippingCalculatorService],
  exports: [ShippingService, ShippingCalculatorService],
})
export class ShippingModule {}