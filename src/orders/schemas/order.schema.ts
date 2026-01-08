import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type OrderDocument = Order & Document;

export enum OrderStatus {
  PENDING = 'PENDING',
  PAYMENT_PENDING = 'PAYMENT_PENDING',
  PAYMENT_CONFIRMED = 'PAYMENT_CONFIRMED',
  PROCESSING = 'PROCESSING',
  SHIPPED = 'SHIPPED',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED',
}

export enum PaymentMethodType {
  WOMPI = 'WOMPI',
  EPAYCO = 'EPAYCO',
  CASH_ON_DELIVERY = 'CASH_ON_DELIVERY',
  ADDI = 'ADDI',
  SISTECREDITO = 'SISTECREDITO',
}

@Schema()
export class OrderItem {
  @Prop({ type: Types.ObjectId, ref: 'Producto', required: true })
  productoId: Types.ObjectId;

  @Prop({ required: true })
  nombre: string;

  @Prop()
  imagen?: string;

  @Prop({ required: true })
  cantidad: number;

  @Prop({ required: true })
  precioUnitario: number;

  @Prop({ required: true })
  subtotal: number;

  @Prop()
  peso?: number;
}

const OrderItemSchema = SchemaFactory.createForClass(OrderItem);

@Schema()
export class ShippingAddress {
  @Prop({ required: true })
  fullName: string;

  @Prop({ required: true })
  phone: string;

  @Prop({ required: true })
  address: string;

  @Prop()
  addressDetail?: string;

  @Prop({ type: Types.ObjectId, ref: 'Ciudad', required: true })
  ciudadId: Types.ObjectId;

  @Prop({ required: true })
  ciudadNombre: string;

  @Prop({ required: true })
  departamentoNombre: string;

  @Prop()
  postalCode?: string;

  @Prop()
  notes?: string;
}

const ShippingAddressSchema = SchemaFactory.createForClass(ShippingAddress);

@Schema()
export class ShippingInfo {
  @Prop({ required: true })
  metodoEnvioId: string;

  @Prop({ required: true })
  metodoNombre: string;

  @Prop()
  transportadora?: string;

  @Prop({ required: true })
  costo: number;

  @Prop()
  esGratis: boolean;

  @Prop()
  tiempoEstimadoMin?: number;

  @Prop()
  tiempoEstimadoMax?: number;

  @Prop()
  trackingNumber?: string;

  @Prop()
  trackingUrl?: string;

  @Prop()
  shippedAt?: Date;

  @Prop()
  deliveredAt?: Date;
}

const ShippingInfoSchema = SchemaFactory.createForClass(ShippingInfo);

@Schema()
export class PaymentInfo {
  @Prop({ type: String, enum: PaymentMethodType, required: true })
  method: PaymentMethodType;

  @Prop()
  transactionId?: string;

  @Prop()
  transactionReference?: string;

  @Prop()
  status?: string;

  @Prop()
  paidAt?: Date;

  @Prop()
  paymentUrl?: string;
}

const PaymentInfoSchema = SchemaFactory.createForClass(PaymentInfo);

@Schema()
export class StatusHistory {
  @Prop({ type: String, enum: OrderStatus, required: true })
  status: OrderStatus;

  @Prop({ required: true })
  timestamp: Date;

  @Prop()
  note?: string;

  @Prop()
  updatedBy?: string;
}

const StatusHistorySchema = SchemaFactory.createForClass(StatusHistory);

@Schema({ timestamps: true })
export class Order {
  _id?: Types.ObjectId;

  @Prop({ required: true, unique: true })
  orderNumber: string;

  @Prop({ type: Types.ObjectId, ref: 'Usuario', required: true })
  userId: Types.ObjectId;

  @Prop({ required: true })
  customerEmail: string;

  @Prop({ required: true })
  customerName: string;

  @Prop()
  customerPhone?: string;

  @Prop({ type: String, enum: OrderStatus, default: OrderStatus.PENDING })
  status: OrderStatus;

  @Prop({ type: [OrderItemSchema], required: true })
  items: OrderItem[];

  @Prop({ required: true })
  subtotal: number;

  @Prop({ default: 0 })
  discount: number;

  @Prop()
  discountCode?: string;

  @Prop({ required: true })
  shippingCost: number;

  @Prop({ required: true })
  total: number;

  @Prop({ type: Types.ObjectId, ref: 'Address' })
  addressId?: Types.ObjectId;

  @Prop({ type: ShippingAddressSchema, required: true })
  shippingAddress: ShippingAddress;

  @Prop({ type: ShippingInfoSchema, required: true })
  shippingInfo: ShippingInfo;

  @Prop({ type: PaymentInfoSchema, required: true })
  paymentInfo: PaymentInfo;

  @Prop({ type: [StatusHistorySchema], default: [] })
  statusHistory: StatusHistory[];

  @Prop({ type: Object })
  metadata?: Record<string, any>;

  @Prop()
  notes?: string;

  @Prop()
  cancelReason?: string;

  @Prop()
  cancelledAt?: Date;

  @Prop({ default: true })
  activo: boolean;
}

export const OrderSchema = SchemaFactory.createForClass(Order);

// Índices
OrderSchema.index({ orderNumber: 1 }, { unique: true });
OrderSchema.index({ userId: 1 });
OrderSchema.index({ customerEmail: 1 });
OrderSchema.index({ status: 1 });
OrderSchema.index({ createdAt: -1 });
OrderSchema.index({ 'paymentInfo.transactionReference': 1 });
