import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type MetodoEnvioDocument = MetodoEnvio & Document;

// Enums
export enum TipoCosto {
  FIJO = 'FIJO', // Precio fijo
  POR_PESO = 'POR_PESO', // Calculado por peso
  POR_VOLUMEN = 'POR_VOLUMEN', // Calculado por volumen
  ESCALONADO = 'ESCALONADO', // Por rangos de peso/valor
}

export enum TipoAplicacion {
  EXCLUSIVA = 'EXCLUSIVA', // Solo aplica la de mayor prioridad
  COMBINABLE = 'COMBINABLE', // Se puede combinar con otras reglas
}

// Sub-schemas
@Schema()
export class CondicionesEnvio {
  // Envío gratis si el monto total supera este valor
  @Prop({ min: 0 })
  montoMinimoGratis: number;

  // Envío gratis si la cantidad de productos supera este valor
  @Prop({ min: 0 })
  cantidadMinimaGratis: number;

  // Peso máximo permitido para este método (kg)
  @Prop({ min: 0 })
  pesoMaximo: number;

  // Valor máximo del pedido para este método
  @Prop({ min: 0 })
  valorMaximo: number;
}

const CondicionesEnvioSchema = SchemaFactory.createForClass(CondicionesEnvio);

@Schema()
export class CostoEscalonado {
  @Prop({ required: true, min: 0 })
  hastaKg: number;

  @Prop({ required: true, min: 0 })
  costo: number;
}

const CostoEscalonadoSchema = SchemaFactory.createForClass(CostoEscalonado);

@Schema()
export class ConfiguracionCosto {
  // Costo base fijo
  @Prop({ default: 0, min: 0 })
  costoBase: number;

  // Costo por kg adicional (para tipo POR_PESO)
  @Prop({ min: 0 })
  costoPorKg: number;

  // Costo por m3 (para tipo POR_VOLUMEN)
  @Prop({ min: 0 })
  costoPorM3: number;

  // Costos escalonados (para tipo ESCALONADO)
  @Prop({ type: [CostoEscalonadoSchema], default: [] })
  escalonado: CostoEscalonado[];

  // Costo por kg adicional después del último escalón
  @Prop({ min: 0 })
  costoKgAdicional: number;
}

const ConfiguracionCostoSchema =
  SchemaFactory.createForClass(ConfiguracionCosto);

@Schema()
export class VigenciaTemporal {
  @Prop()
  fechaInicio: Date;

  @Prop()
  fechaFin: Date;

  // Días de la semana en que aplica (0=Domingo, 1=Lunes, ..., 6=Sábado)
  @Prop({ type: [Number], default: [0, 1, 2, 3, 4, 5, 6] })
  diasSemana: number[];
}

const VigenciaTemporalSchema = SchemaFactory.createForClass(VigenciaTemporal);

@Schema()
export class Restricciones {
  // IDs de productos que NO pueden usar este método
  @Prop({ type: [Types.ObjectId], ref: 'Producto', default: [] })
  productosExcluidos: Types.ObjectId[];

  // Categorías de productos excluidos
  @Prop({ type: [String], default: [] })
  categoriasExcluidas: string[];

  // Requiere seguro si el valor supera este monto
  @Prop({ min: 0 })
  valorRequiereSeguro: number;

  // Costo del seguro como porcentaje del valor
  @Prop({ min: 0, max: 100 })
  porcentajeSeguro: number;
}

const RestriccionesSchema = SchemaFactory.createForClass(Restricciones);

@Schema()
export class CoberturaMetodo {
  // Si es true, aplica a todo el país
  @Prop({ default: false })
  nacional: boolean;

  // Zonas de envío donde aplica este método
  @Prop({ type: [Types.ObjectId], ref: 'ZonaEnvio', default: [] })
  zonasEnvioIds: Types.ObjectId[];
}

const CoberturaMetodoSchema = SchemaFactory.createForClass(CoberturaMetodo);

@Schema({ timestamps: true })
export class MetodoEnvio {
  _id?: Types.ObjectId;

  @Prop({ required: true })
  nombre: string; // "Envío Estándar", "Envío Express", "Envío Gratis Área Metro"

  @Prop()
  descripcion: string;

  @Prop({ required: true, unique: true })
  codigo: string; // "ENVIO_ESTANDAR", "ENVIO_EXPRESS"

  // Tipo de cálculo de costo
  @Prop({
    type: String,
    enum: TipoCosto,
    default: TipoCosto.FIJO,
  })
  tipoCosto: TipoCosto;

  // Tipo de aplicación de reglas
  @Prop({
    type: String,
    enum: TipoAplicacion,
    default: TipoAplicacion.EXCLUSIVA,
  })
  tipoAplicacion: TipoAplicacion;

  // Configuración de costos
  @Prop({ type: ConfiguracionCostoSchema, default: {} })
  configuracionCosto: ConfiguracionCosto;

  // Condiciones para envío gratis
  @Prop({ type: CondicionesEnvioSchema, default: {} })
  condiciones: CondicionesEnvio;

  // Cobertura geográfica
  @Prop({ type: CoberturaMetodoSchema, default: {} })
  cobertura: CoberturaMetodo;

  // Transportadora asociada
  @Prop({ type: Types.ObjectId, ref: 'Transportadora' })
  transportadoraId: Types.ObjectId;

  @Prop()
  transportadoraNombre: string;

  // Tiempo estimado de entrega para este método específico
  @Prop({ min: 0 })
  tiempoEstimadoMinDias: number;

  @Prop({ min: 0 })
  tiempoEstimadoMaxDias: number;

  // Vigencia temporal (promociones)
  @Prop({ type: VigenciaTemporalSchema })
  vigencia: VigenciaTemporal;

  // Restricciones
  @Prop({ type: RestriccionesSchema, default: {} })
  restricciones: Restricciones;

  // Prioridad para ordenamiento (mayor = más prioritario)
  @Prop({ default: 0 })
  prioridad: number;

  @Prop({ default: true })
  activo: boolean;
}

export const MetodoEnvioSchema = SchemaFactory.createForClass(MetodoEnvio);

// Indexes
MetodoEnvioSchema.index({ 'cobertura.zonasEnvioIds': 1 });
MetodoEnvioSchema.index({ transportadoraId: 1 });
MetodoEnvioSchema.index({ prioridad: -1 });
MetodoEnvioSchema.index({ activo: 1, prioridad: -1 });