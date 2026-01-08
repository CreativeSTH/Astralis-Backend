import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';

import { Transaction, TransactionSchema } from './schemas/transaction.schema';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { WompiProvider } from './providers/wompi.provider';
import { CashOnDeliveryProvider } from './providers/cash-on-delivery.provider';

@Module({
  imports: [
    ConfigModule,
    MongooseModule.forFeature([
      { name: Transaction.name, schema: TransactionSchema },
    ]),
  ],
  controllers: [PaymentsController],
  providers: [
    PaymentsService,
    WompiProvider,
    CashOnDeliveryProvider,
  ],
  exports: [PaymentsService],
})
export class PaymentsModule {}
