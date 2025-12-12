import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type AcordeDocument = Acorde & Document;

@Schema({ timestamps: true })
export class Acorde {
  _id?: string;

  @Prop({ required: true, unique: true })
  nombre: string;

  @Prop()
  descripcion: string;

  @Prop()
  color: string; // Color para visualización en el frontend

  @Prop({ default: true })
  activo: boolean;
}

export const AcordeSchema = SchemaFactory.createForClass(Acorde);