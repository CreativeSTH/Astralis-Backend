import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type CobroDocument = Cobro & Document;

@Schema({ timestamps: true })
export class Cobro {
  @Prop({ type: Types.ObjectId, ref: 'Venta', required: true })
  ventaId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Cliente', required: true })
  clienteId: Types.ObjectId;

  @Prop({ required: true })
  nombreCliente: string;

  @Prop({ required: true })
  numeroCuota: number;

  @Prop({ required: true })
  monto: number;

  @Prop({ required: true })
  fechaVencimiento: Date;

  @Prop()
  fechaPago: Date;

  @Prop({ default: false })
  pagado: boolean;

  @Prop({ default: false })
  pagoTardio: boolean;

  @Prop()
  notas: string;
}

export const CobroSchema = SchemaFactory.createForClass(Cobro);