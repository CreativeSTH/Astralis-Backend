import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type VentaDocument = Venta & Document;

export enum EstadoVenta {
  ACTIVA = 'ACTIVA',
  PARCIALMENTE_PAGADA = 'PARCIALMENTE_PAGADA',
  COMPLETADA = 'COMPLETADA',
  VENCIDA = 'VENCIDA',
  EN_MORA = 'EN_MORA',
  CANCELADA = 'CANCELADA',
}

export enum TipoVenta {
  CREDITO = 'CREDITO',
  CONTADO = 'CONTADO',
}

export enum CanalVenta {
  TIENDA = 'TIENDA',
  ECOMMERCE = 'ECOMMERCE',
}

export enum MetodoPago {
  EFECTIVO = 'EFECTIVO',
  TRANSFERENCIA = 'TRANSFERENCIA',
  TARJETA = 'TARJETA',
  NEQUI = 'NEQUI',
  DAVIPLATA = 'DAVIPLATA',
  OTRO = 'OTRO',
}

@Schema()
export class ProductoVenta {
  @Prop({ type: Types.ObjectId, ref: 'Producto', required: true })
  productoId: Types.ObjectId;

  @Prop({ required: true })
  nombreProducto: string;

  @Prop({ required: true })
  cantidad: number;

  @Prop({ required: true })
  precioUnitario: number;

  @Prop({ required: true })
  subtotal: number;

  // Costo del producto al momento de la venta (para calcular margen)
  @Prop()
  costoUnitario?: number;
}

// Sub-schema para historial de pagos/abonos
@Schema()
export class RegistroPago {
  @Prop({ required: true })
  monto: number;

  @Prop({ required: true })
  fecha: Date;

  @Prop({ type: String, enum: MetodoPago, default: MetodoPago.EFECTIVO })
  metodoPago: MetodoPago;

  @Prop()
  referenciaPago?: string; // Número de transferencia, etc.

  @Prop({ type: Types.ObjectId, ref: 'Usuario' })
  registradoPor?: Types.ObjectId;

  @Prop()
  notas?: string;
}

const RegistroPagoSchema = SchemaFactory.createForClass(RegistroPago);

@Schema()
export class Cuota {
  @Prop({ required: true })
  numeroCuota: number;

  @Prop({ required: true })
  fechaVencimiento: Date;

  @Prop({ required: true })
  monto: number;

  @Prop({ default: 0 })
  montoPagado: number;

  @Prop({ default: 0 })
  saldoPendiente: number;

  @Prop({ default: false })
  pagada: boolean;

  @Prop()
  fechaPago?: Date;

  @Prop({ default: false })
  pagoTardio: boolean;

  // === INTERESES/MORA ===
  @Prop({ default: 0 })
  diasMora: number; // Días de atraso

  @Prop({ default: 0 })
  interesMora: number; // Porcentaje de interés por mora

  @Prop({ default: 0 })
  montoMora: number; // Monto calculado de interés

  @Prop({ default: 0 })
  montoTotalConMora: number; // monto + montoMora

  // === HISTORIAL DE PAGOS ===
  @Prop({ type: [RegistroPagoSchema], default: [] })
  historialPagos: RegistroPago[];

  @Prop({ type: [Date], default: [] })
  fechasPagosAbonos?: Date[]; // Legacy: mantener por compatibilidad
}

const ProductoVentaSchema = SchemaFactory.createForClass(ProductoVenta);
const CuotaSchema = SchemaFactory.createForClass(Cuota);

// Sub-schema para descuentos aplicados
@Schema()
export class DescuentoVenta {
  @Prop({ type: String, enum: ['PORCENTAJE', 'MONTO_FIJO'], required: true })
  tipo: 'PORCENTAJE' | 'MONTO_FIJO';

  @Prop({ required: true })
  valor: number;

  @Prop()
  motivo?: string;

  @Prop({ default: 0 })
  montoDescontado: number;
}

const DescuentoVentaSchema = SchemaFactory.createForClass(DescuentoVenta);

@Schema({ timestamps: true })
export class Venta {
  _id?: Types.ObjectId;

  // Campos para ventas de tienda física (opcional para e-commerce)
  @Prop({ type: Types.ObjectId, ref: 'Cliente' })
  clienteId?: Types.ObjectId | { _id: Types.ObjectId };

  // Campos para ventas de e-commerce
  @Prop({ type: Types.ObjectId, ref: 'Order' })
  orderId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Usuario' })
  usuarioId?: Types.ObjectId;

  @Prop()
  emailComprador?: string;

  @Prop()
  telefonoComprador?: string;

  @Prop({ required: true })
  nombreCliente: string;

  @Prop({
    type: String,
    enum: CanalVenta,
    default: CanalVenta.TIENDA,
  })
  canal: CanalVenta;

  @Prop({ type: [ProductoVentaSchema], required: true })
  productos: ProductoVenta[];

  // === TOTALES Y MÁRGENES ===
  @Prop({ required: true })
  totalVenta: number;

  @Prop({ default: 0 })
  costoTotal: number; // Suma de costos de productos

  @Prop({ default: 0 })
  margenBruto: number; // totalVenta - costoTotal

  // === DESCUENTOS ===
  @Prop({ type: DescuentoVentaSchema })
  descuento?: DescuentoVenta;

  @Prop({
    type: String,
    enum: TipoVenta,
    default: TipoVenta.CREDITO
  })
  tipoVenta: TipoVenta;

  @Prop({ required: true })
  numeroCuotas: number;

  @Prop({ required: true })
  montoCuota: number;

  @Prop({ required: true })
  fechaPrimerPago: Date;

  @Prop({ type: [CuotaSchema], required: true })
  cuotas: Cuota[];

  @Prop({
    type: String,
    enum: EstadoVenta,
    default: EstadoVenta.ACTIVA
  })
  estado: EstadoVenta;

  @Prop({ default: 0 })
  cuotasPagadas: number;

  @Prop({ default: 0 })
  totalPagado: number;

  @Prop({ default: 0 })
  totalPendiente: number;

  // === INTERESES/MORA ===
  @Prop({ default: 0 })
  tasaInteresMora: number; // % de interés diario por mora (ej: 0.1 = 0.1% diario)

  @Prop({ default: 0 })
  totalMora: number; // Total acumulado de intereses por mora

  // === CANCELACIÓN ===
  @Prop({ type: Types.ObjectId, ref: 'Usuario' })
  canceladaPor?: Types.ObjectId;

  @Prop()
  motivoCancelacion?: string;

  @Prop()
  fechaCancelacion?: Date;

  // === AUDITORÍA ===
  @Prop({ type: Types.ObjectId, ref: 'Usuario' })
  creadaPor?: Types.ObjectId;
}

export const VentaSchema = SchemaFactory.createForClass(Venta);

// Índices
VentaSchema.index({ clienteId: 1 });
VentaSchema.index({ orderId: 1 });
VentaSchema.index({ usuarioId: 1 });
VentaSchema.index({ canal: 1 });
VentaSchema.index({ estado: 1 });
VentaSchema.index({ createdAt: -1 });
VentaSchema.index({ tipoVenta: 1 });
VentaSchema.index({ 'cuotas.fechaVencimiento': 1, 'cuotas.pagada': 1 });