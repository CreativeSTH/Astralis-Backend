import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ZonaEnvioDocument = ZonaEnvio & Document;

@Schema()
export class CoberturaCiudad {
  @Prop({ type: Types.ObjectId, ref: 'Ciudad', required: true })
  ciudadId: Types.ObjectId;

  @Prop({ required: true })
  ciudadNombre: string;

  @Prop({ required: true })
  departamentoNombre: string;
}

const CoberturaCiudadSchema = SchemaFactory.createForClass(CoberturaCiudad);

@Schema({ timestamps: true })
export class ZonaEnvio {
  _id?: Types.ObjectId;

  @Prop({ required: true, unique: true })
  nombre: string; // "Área Metropolitana Medellín", "Costa Caribe", etc.

  @Prop()
  descripcion: string;

  @Prop({ required: true, unique: true })
  codigo: string; // "ZONA_METRO_MDE", "ZONA_COSTA", etc.

  // Cobertura por departamentos completos
  @Prop({ type: [{ type: Types.ObjectId, ref: 'Departamento' }], default: [] })
  departamentosIds: Types.ObjectId[];

  // Cobertura por ciudades específicas (más granular)
  @Prop({ type: [CoberturaCiudadSchema], default: [] })
  ciudades: CoberturaCiudad[];

  // Si es true, cubre todo el país
  @Prop({ default: false })
  coberturaNacional: boolean;

  @Prop({ default: true })
  activo: boolean;
}

export const ZonaEnvioSchema = SchemaFactory.createForClass(ZonaEnvio);

// Indexes para búsquedas eficientes
ZonaEnvioSchema.index({ 'ciudades.ciudadId': 1 });
ZonaEnvioSchema.index({ departamentosIds: 1 });