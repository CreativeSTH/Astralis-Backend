import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type TransactionDocument = Transaction & Document;

export enum PaymentStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  APPROVED = 'APPROVED',
  DECLINED = 'DECLINED',
  VOIDED = 'VOIDED',
  REFUNDED = 'REFUNDED',
  ERROR = 'ERROR',
  EXPIRED = 'EXPIRED',
}

export enum PaymentProvider {
  WOMPI = 'WOMPI',
  EPAYCO = 'EPAYCO',
  CASH_ON_DELIVERY = 'CASH_ON_DELIVERY',
  ADDI = 'ADDI',
  SISTECREDITO = 'SISTECREDITO',
  BANK_TRANSFER = 'BANK_TRANSFER',
}

export enum PaymentMethod {
  CREDIT_CARD = 'CREDIT_CARD',
  DEBIT_CARD = 'DEBIT_CARD',
  PSE = 'PSE',
  NEQUI = 'NEQUI',
  BANCOLOMBIA_TRANSFER = 'BANCOLOMBIA_TRANSFER',
  CASH_ON_DELIVERY = 'CASH_ON_DELIVERY',
  FINANCING = 'FINANCING',
}

@Schema()
export class CustomerInfo {
  @Prop({ required: true })
  email: string;

  @Prop({ required: true })
  fullName: string;

  @Prop()
  phone?: string;

  @Prop()
  document?: string;

  @Prop()
  documentType?: string;
}

const CustomerInfoSchema = SchemaFactory.createForClass(CustomerInfo);

@Schema()
export class PaymentDetails {
  @Prop()
  cardBrand?: string;

  @Prop()
  cardLastFour?: string;

  @Prop()
  bankName?: string;

  @Prop()
  installments?: number;

  @Prop()
  paymentMethodType?: string;
}

const PaymentDetailsSchema = SchemaFactory.createForClass(PaymentDetails);

@Schema()
export class StatusHistory {
  @Prop({ required: true, type: String, enum: PaymentStatus })
  status: PaymentStatus;

  @Prop({ required: true })
  timestamp: Date;

  @Prop()
  reason?: string;

  @Prop({ type: Object })
  metadata?: Record<string, any>;
}

const StatusHistorySchema = SchemaFactory.createForClass(StatusHistory);

@Schema({ timestamps: true })
export class Transaction {
  _id?: Types.ObjectId;

  @Prop({ required: true, unique: true })
  reference: string;

  @Prop({ type: Types.ObjectId, ref: 'Order', required: true })
  orderId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  userId?: Types.ObjectId;

  @Prop({ required: true, type: String, enum: PaymentProvider })
  provider: PaymentProvider;

  @Prop({ type: String, enum: PaymentMethod })
  paymentMethod?: PaymentMethod;

  @Prop()
  providerTransactionId?: string;

  @Prop({ required: true, type: String, enum: PaymentStatus, default: PaymentStatus.PENDING })
  status: PaymentStatus;

  @Prop({ required: true })
  amount: number;

  @Prop({ default: 'COP' })
  currency: string;

  @Prop()
  description?: string;

  @Prop({ type: CustomerInfoSchema, required: true })
  customer: CustomerInfo;

  @Prop({ type: PaymentDetailsSchema })
  paymentDetails?: PaymentDetails;

  @Prop()
  redirectUrl?: string;

  @Prop()
  paymentUrl?: string;

  @Prop({ type: [StatusHistorySchema], default: [] })
  statusHistory: StatusHistory[];

  @Prop({ type: Object })
  metadata?: Record<string, any>;

  @Prop({ type: Object })
  providerResponse?: Record<string, any>;

  @Prop()
  errorMessage?: string;

  @Prop()
  refundedAmount?: number;

  @Prop()
  refundReason?: string;

  @Prop()
  processedAt?: Date;

  @Prop()
  expiresAt?: Date;

  @Prop({ default: true })
  activo: boolean;
}

export const TransactionSchema = SchemaFactory.createForClass(Transaction);

// Índices
TransactionSchema.index({ reference: 1 }, { unique: true });
TransactionSchema.index({ orderId: 1 });
TransactionSchema.index({ userId: 1 });
TransactionSchema.index({ provider: 1, status: 1 });
TransactionSchema.index({ providerTransactionId: 1 });
TransactionSchema.index({ createdAt: -1 });
