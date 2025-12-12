import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MarcasService } from './marcas.service';
import { MarcasController } from './marcas.controller';
import { Marca, MarcaSchema } from './schemas/marca.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Marca.name, schema: MarcaSchema },
    ]),
  ],
  controllers: [MarcasController],
  providers: [MarcasService],
  exports: [MarcasService, MongooseModule],
})
export class MarcasModule {}