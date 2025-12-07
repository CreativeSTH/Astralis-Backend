import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ClienteDocument = Cliente & Document;

@Schema({ timestamps: true })
export class Cliente {
  _id?: Types.ObjectId;

  @Prop({ required: true })
  nombreCompleto: string;

  @Prop({ required: true })
  telefono: string;

  @Prop()
  correo: string;

  @Prop()
  direccion: string;

  @Prop({ default: 0, min: 0, max: 100 })
  score: number;

  @Prop({ default: 0 })
  totalCreditosActivos: number;

  @Prop({ default: 0 })
  totalCreditosCompletados: number;

  @Prop({ default: true })
  activo: boolean;
}

export const ClienteSchema = SchemaFactory.createForClass(Cliente);