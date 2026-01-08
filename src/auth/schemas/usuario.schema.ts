import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type UsuarioDocument = Usuario & Document;

export enum RolUsuario {
  ADMIN = 'ADMIN',
  USUARIO = 'USUARIO',
}

@Schema({ timestamps: true })
export class Usuario {
  _id?: Types.ObjectId;

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email: string;

  @Prop({ trim: true })
  nombre: string;

  @Prop({ trim: true })
  telefono: string;

  @Prop({ type: String, enum: RolUsuario, default: RolUsuario.USUARIO })
  rol: RolUsuario;

  @Prop({ default: false })
  verificado: boolean;

  @Prop({ default: true })
  activo: boolean;

  @Prop()
  ultimoAcceso: Date;
}

export const UsuarioSchema = SchemaFactory.createForClass(Usuario);
