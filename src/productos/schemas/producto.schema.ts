import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ProductoDocument = Producto & Document;

@Schema({ timestamps: true })
export class Producto {
  _id: Types.ObjectId;

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

  @Prop({ default: true })
  activo: boolean;
}

export const ProductoSchema = SchemaFactory.createForClass(Producto);