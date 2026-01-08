import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type TransportadoraDocument = Transportadora & Document;

@Schema()
export class TiempoEstimado {
  @Prop({ required: true, min: 0 })
  minDias: number;

  @Prop({ required: true, min: 0 })
  maxDias: number;
}

const TiempoEstimadoSchema = SchemaFactory.createForClass(TiempoEstimado);

@Schema({ timestamps: true })
export class Transportadora {
  _id?: Types.ObjectId;

  @Prop({ required: true, unique: true })
  nombre: string; // "Servientrega", "Coordinadora", "Inter Rapidísimo"

  @Prop({ required: true, unique: true })
  codigo: string; // "SERVIENTREGA", "COORDINADORA"

  @Prop()
  descripcion: string;

  @Prop()
  logo: string; // URL del logo

  @Prop({ type: TiempoEstimadoSchema })
  tiempoEstimado: TiempoEstimado;

  @Prop()
  urlTracking: string; // Template URL para tracking, ej: "https://servientrega.com/tracking?guia={guia}"

  @Prop()
  telefono: string;

  @Prop()
  email: string;

  @Prop()
  sitioWeb: string;

  @Prop({ default: true })
  activo: boolean;
}

export const TransportadoraSchema =
  SchemaFactory.createForClass(Transportadora);