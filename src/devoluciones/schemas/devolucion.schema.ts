import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type DevolucionDocument = Devolucion & Document;

// === ENUMS ===

export enum EstadoDevolucion {
  PENDIENTE = 'PENDIENTE',       // Esperando aprobación
  APROBADA = 'APROBADA',         // Aprobada, pendiente de procesar
  RECHAZADA = 'RECHAZADA',       // Rechazada
  PROCESADA = 'PROCESADA',       // Completada (stock devuelto, ajustes hechos)
  CANCELADA = 'CANCELADA',       // Cancelada por el solicitante
}

export enum MotivoDevolucion {
  PRODUCTO_DEFECTUOSO = 'PRODUCTO_DEFECTUOSO',
  PRODUCTO_INCORRECTO = 'PRODUCTO_INCORRECTO',
  NO_SATISFECHO = 'NO_SATISFECHO',
  CAMBIO_OPINION = 'CAMBIO_OPINION',
  ERROR_PEDIDO = 'ERROR_PEDIDO',
  DUPLICADO = 'DUPLICADO',
  OTRO = 'OTRO',
}

export enum TipoReembolso {
  CREDITO_TIENDA = 'CREDITO_TIENDA',     // Se acredita al límite de crédito
  EFECTIVO = 'EFECTIVO',                   // Devolución en efectivo
  DESCUENTO_DEUDA = 'DESCUENTO_DEUDA',   // Se descuenta de deuda pendiente
  SIN_REEMBOLSO = 'SIN_REEMBOLSO',       // Solo devolución de producto
}

// === SUB-SCHEMAS ===

@Schema()
export class ProductoDevolucion {
  @Prop({ type: Types.ObjectId, ref: 'Producto', required: true })
  productoId: Types.ObjectId;

  @Prop({ required: true })
  nombreProducto: string;

  @Prop({ required: true, min: 1 })
  cantidad: number;

  @Prop({ required: true, min: 0 })
  precioUnitario: number;

  @Prop({ required: true, min: 0 })
  subtotal: number;

  @Prop()
  motivo?: string; // Motivo específico para este producto
}

const ProductoDevolucionSchema = SchemaFactory.createForClass(ProductoDevolucion);

@Schema()
export class HistorialDevolucion {
  @Prop({ required: true, enum: EstadoDevolucion })
  estado: EstadoDevolucion;

  @Prop({ required: true })
  fecha: Date;

  @Prop()
  usuarioId?: string;

  @Prop()
  comentario?: string;
}

const HistorialDevolucionSchema = SchemaFactory.createForClass(HistorialDevolucion);

// === SCHEMA PRINCIPAL ===

@Schema({ timestamps: true })
export class Devolucion {
  _id?: Types.ObjectId;

  // === REFERENCIAS ===
  @Prop({ type: Types.ObjectId, ref: 'Venta', required: true })
  ventaId: Types.ObjectId;

  @Prop({ required: true })
  numeroVenta: string; // Para referencia rápida

  @Prop({ type: Types.ObjectId, ref: 'Cliente', required: true })
  clienteId: Types.ObjectId;

  @Prop({ required: true })
  nombreCliente: string;

  // === PRODUCTOS DEVUELTOS ===
  @Prop({ type: [ProductoDevolucionSchema], required: true })
  productos: ProductoDevolucion[];

  // === MOTIVO Y ESTADO ===
  @Prop({ type: String, enum: MotivoDevolucion, required: true })
  motivo: MotivoDevolucion;

  @Prop()
  descripcionMotivo?: string; // Descripción detallada

  @Prop({ type: String, enum: EstadoDevolucion, default: EstadoDevolucion.PENDIENTE })
  estado: EstadoDevolucion;

  // === MONTOS ===
  @Prop({ required: true, min: 0 })
  montoTotal: number; // Suma de subtotales de productos

  @Prop({ default: 0 })
  montoReembolsado: number; // Monto efectivamente reembolsado

  // === TIPO DE REEMBOLSO ===
  @Prop({ type: String, enum: TipoReembolso })
  tipoReembolso?: TipoReembolso;

  // === OPCIONES ===
  @Prop({ default: true })
  devolverStock: boolean; // Si se debe devolver el stock

  @Prop({ default: false })
  stockDevuelto: boolean; // Si ya se devolvió el stock

  @Prop({ default: false })
  afectaDeuda: boolean; // Si debe afectar la deuda del cliente

  @Prop({ default: false })
  deudaAjustada: boolean; // Si ya se ajustó la deuda

  // === AUDITORÍA ===
  @Prop()
  solicitadaPor?: string; // Usuario que solicitó

  @Prop()
  fechaSolicitud: Date;

  @Prop()
  aprobadaPor?: string;

  @Prop()
  fechaAprobacion?: Date;

  @Prop()
  rechazadaPor?: string;

  @Prop()
  fechaRechazo?: Date;

  @Prop()
  motivoRechazo?: string;

  @Prop()
  procesadaPor?: string;

  @Prop()
  fechaProcesamiento?: Date;

  // === HISTORIAL ===
  @Prop({ type: [HistorialDevolucionSchema], default: [] })
  historial: HistorialDevolucion[];

  // === NOTAS ===
  @Prop()
  notas?: string;

  // === SOFT DELETE ===
  @Prop({ default: true })
  activo: boolean;
}

export const DevolucionSchema = SchemaFactory.createForClass(Devolucion);

// === ÍNDICES ===
DevolucionSchema.index({ ventaId: 1 });
DevolucionSchema.index({ clienteId: 1 });
DevolucionSchema.index({ estado: 1 });
DevolucionSchema.index({ createdAt: -1 });
DevolucionSchema.index({ 'productos.productoId': 1 });
