import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type CiudadDocument = Ciudad & Document;

@Schema({ timestamps: true })
export class Ciudad {
  _id?: Types.ObjectId;

  @Prop({ required: true })
  nombre: string;

  @Prop({ required: true })
  codigo: string; // Código DANE de la ciudad

  @Prop({ type: Types.ObjectId, ref: 'Departamento', required: true })
  departamentoId: Types.ObjectId;

  @Prop({ required: true })
  departamentoNombre: string;

  @Prop({ default: true })
  activo: boolean;
}

export const CiudadSchema = SchemaFactory.createForClass(Ciudad);

// Index para búsquedas eficientes
CiudadSchema.index({ departamentoId: 1 });
CiudadSchema.index({ nombre: 'text' });