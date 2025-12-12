import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AcordesService } from './acordes.service';
import { AcordesController } from './acordes.controller';
import { Acorde, AcordeSchema } from './schemas/acorde.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Acorde.name, schema: AcordeSchema },
    ]),
  ],
  controllers: [AcordesController],
  providers: [AcordesService],
  exports: [AcordesService, MongooseModule],
})
export class AcordesModule {}