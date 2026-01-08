import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type DepartamentoDocument = Departamento & Document;

@Schema({ timestamps: true })
export class Departamento {
  _id?: Types.ObjectId;

  @Prop({ required: true, unique: true })
  nombre: string;

  @Prop({ required: true, unique: true })
  codigo: string; // Código DANE del departamento

  @Prop({ default: true })
  activo: boolean;
}

export const DepartamentoSchema = SchemaFactory.createForClass(Departamento);