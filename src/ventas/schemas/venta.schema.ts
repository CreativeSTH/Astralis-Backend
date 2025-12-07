import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type VentaDocument = Venta & Document;

export enum EstadoVenta {
  ACTIVA = 'ACTIVA',
  COMPLETADA = 'COMPLETADA',
  VENCIDA = 'VENCIDA',
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
}

@Schema()
export class Cuota {
  @Prop({ required: true })
  numeroCuota: number;

  @Prop({ required: true })
  fechaVencimiento: Date;

  @Prop({ required: true })
  monto: number;

  @Prop({ default: false })
  pagada: boolean;

  @Prop()
  fechaPago?: Date;

  @Prop({ default: false })
  pagoTardio: boolean;
}

const ProductoVentaSchema = SchemaFactory.createForClass(ProductoVenta);
const CuotaSchema = SchemaFactory.createForClass(Cuota);

@Schema({ timestamps: true })
export class Venta {
  _id?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Cliente', required: true })
  clienteId: Types.ObjectId;

  @Prop({ required: true })
  nombreCliente: string;

  @Prop({ type: [ProductoVentaSchema], required: true })
  productos: ProductoVenta[];

  @Prop({ required: true })
  totalVenta: number;

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
}

export const VentaSchema = SchemaFactory.createForClass(Venta);