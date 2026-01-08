import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type OtpCodeDocument = OtpCode & Document;

export enum TipoOtp {
  REGISTRO = 'REGISTRO',
  LOGIN = 'LOGIN',
}

@Schema({ timestamps: true })
export class OtpCode {
  _id?: Types.ObjectId;

  @Prop({ required: true, lowercase: true, trim: true })
  email: string;

  @Prop({ required: true })
  codigo: string;

  @Prop({ type: String, enum: TipoOtp, required: true })
  tipo: TipoOtp;

  @Prop({ default: 0 })
  intentos: number;

  @Prop({ default: false })
  usado: boolean;

  @Prop({ required: true })
  expiraEn: Date;
}

export const OtpCodeSchema = SchemaFactory.createForClass(OtpCode);
