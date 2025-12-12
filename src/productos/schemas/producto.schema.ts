import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ProductoDocument = Producto & Document;

export enum TipoProducto {
  ORIGINAL = 'ORIGINAL',
  REPLICA = 'REPLICA'
}

@Schema()
export class AcordeProducto {
  @Prop({ type: Types.ObjectId, ref: 'Acorde', required: true })
  acordeId: Types.ObjectId;

  @Prop({ required: true })
  nombreAcorde: string;

  @Prop({ required: true, min: 0, max: 100 })
  porcentaje: number;
}

const AcordeProductoSchema = SchemaFactory.createForClass(AcordeProducto);

@Schema({ timestamps: true })
export class Producto {
  _id?: string;

  @Prop({ required: true })
  nombre: string;

  @Prop()
  descripcion: string;

  @Prop({ required: true })
  precioCompra: number;

  @Prop({ required: true })
  precioVenta: number;

  @Prop({ required: true, default: 0 })
  stock: number;

  @Prop({ 
    type: String, 
    enum: TipoProducto, 
    default: TipoProducto.ORIGINAL 
  })
  tipo: TipoProducto;

  @Prop({ type: Types.ObjectId, ref: 'Marca' })
  marcaId: Types.ObjectId;

  @Prop()
  nombreMarca: string;

  @Prop()
  imagen: string;

  @Prop({ type: [AcordeProductoSchema], default: [] })
  acordes: AcordeProducto[];

  @Prop({ default: 0 })
  totalVendido: number; // Para rastrear productos más vendidos

  @Prop({ default: 0 })
  inversionTotal: number; // Inversión acumulada en este producto

  @Prop({ default: true })
  activo: boolean;
}

export const ProductoSchema = SchemaFactory.createForClass(Producto);