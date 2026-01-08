import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ClienteDocument = Cliente & Document;

// Enum para tipos de nota
export enum TipoNotaCliente {
  LLAMADA = 'LLAMADA',
  VISITA = 'VISITA',
  ACUERDO = 'ACUERDO',
  COBRANZA = 'COBRANZA',
  OTRO = 'OTRO',
}

// Sub-schema para notas/historial del cliente
@Schema()
export class NotaCliente {
  @Prop({ required: true })
  texto: string;

  @Prop({ type: Types.ObjectId, ref: 'Usuario' })
  creadoPor?: Types.ObjectId;

  @Prop({ default: () => new Date() })
  creadoAt: Date;

  @Prop({ type: String, enum: TipoNotaCliente, default: TipoNotaCliente.OTRO })
  tipo: TipoNotaCliente;
}

const NotaClienteSchema = SchemaFactory.createForClass(NotaCliente);

@Schema({ timestamps: true })
export class Cliente {
  _id?: Types.ObjectId;

  @Prop({ required: true })
  nombreCompleto: string;

  @Prop({ required: true, unique: true })
  telefono: string;

  @Prop({ sparse: true })
  correo: string;

  @Prop()
  direccion: string;

  @Prop({ default: 0, min: 0, max: 100 })
  score: number;

  // === LÍMITES DE CRÉDITO ===
  @Prop({ default: 500000 }) // Límite por defecto: $500,000
  limiteCredito: number;

  @Prop({ default: 0 })
  deudaActual: number; // Total que debe actualmente

  @Prop({ default: false })
  bloqueadoPorMora: boolean; // Auto-bloqueo si tiene cuotas muy vencidas

  @Prop()
  fechaBloqueo?: Date;

  @Prop()
  motivoBloqueo?: string;

  // === CONTADORES ===
  @Prop({ default: 0 })
  totalCreditosActivos: number;

  @Prop({ default: 0 })
  totalCreditosCompletados: number;

  // === HISTORIAL/NOTAS ===
  @Prop({ type: [NotaClienteSchema], default: [] })
  notas: NotaCliente[];

  @Prop({ default: true })
  activo: boolean;
}

export const ClienteSchema = SchemaFactory.createForClass(Cliente);

// Índices para búsquedas
ClienteSchema.index({ nombreCompleto: 'text' });
ClienteSchema.index({ score: 1 });
ClienteSchema.index({ bloqueadoPorMora: 1 });
ClienteSchema.index({ deudaActual: 1 });

// Virtual: crédito disponible
ClienteSchema.virtual('creditoDisponible').get(function () {
  return Math.max(0, this.limiteCredito - this.deudaActual);
});