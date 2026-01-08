import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { Departamento, DepartamentoSchema } from './schemas/departamento.schema';
import { Ciudad, CiudadSchema } from './schemas/ciudad.schema';
import { ZonaEnvio, ZonaEnvioSchema } from './schemas/zona-envio.schema';
import {
  Transportadora,
  TransportadoraSchema,
} from '../shipping/schemas/transportadora.schema';

import { GeographyController } from './geography.controller';
import { GeographyService } from './geography.service';
import { GeographySeederService } from './geography-seeder.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Departamento.name, schema: DepartamentoSchema },
      { name: Ciudad.name, schema: CiudadSchema },
      { name: ZonaEnvio.name, schema: ZonaEnvioSchema },
      { name: Transportadora.name, schema: TransportadoraSchema },
    ]),
  ],
  controllers: [GeographyController],
  providers: [GeographyService, GeographySeederService],
  exports: [GeographyService, GeographySeederService],
})
export class GeographyModule {}