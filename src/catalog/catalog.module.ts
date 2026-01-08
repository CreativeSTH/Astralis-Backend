import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { CatalogController } from './catalog.controller';
import { CatalogService } from './catalog.service';
import { Producto, ProductoSchema } from '../productos/schemas/producto.schema';
import { Marca, MarcaSchema } from '../marcas/schemas/marca.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Producto.name, schema: ProductoSchema },
      { name: Marca.name, schema: MarcaSchema },
    ]),
  ],
  controllers: [CatalogController],
  providers: [CatalogService],
  exports: [CatalogService],
})
export class CatalogModule {}
