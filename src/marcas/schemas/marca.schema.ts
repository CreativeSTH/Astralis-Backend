import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type MarcaDocument = Marca & Document;

@Schema({ timestamps: true })
export class Marca {
  _id?: string;

  @Prop({ required: true, unique: true })
  nombre: string;

  @Prop()
  descripcion: string;

  @Prop()
  logo: string;

  @Prop({ default: true })
  activo: boolean;
}

export const MarcaSchema = SchemaFactory.createForClass(Marca);