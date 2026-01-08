import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type AddressDocument = Address & Document;

@Schema({ timestamps: true })
export class Address {
  _id?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Usuario', required: true })
  userId: Types.ObjectId;

  @Prop({ required: true })
  label: string;

  @Prop({ required: true })
  fullName: string;

  @Prop({ required: true })
  phone: string;

  @Prop({ type: Types.ObjectId, ref: 'Departamento', required: true })
  departamentoId: Types.ObjectId;

  @Prop({ required: true })
  departamentoNombre: string;

  @Prop({ type: Types.ObjectId, ref: 'Ciudad', required: true })
  ciudadId: Types.ObjectId;

  @Prop({ required: true })
  ciudadNombre: string;

  @Prop({ required: true })
  address: string;

  @Prop()
  addressDetail?: string;

  @Prop()
  postalCode?: string;

  @Prop()
  notes?: string;

  @Prop({ default: false })
  isDefault: boolean;

  @Prop({ default: true })
  activo: boolean;
}

export const AddressSchema = SchemaFactory.createForClass(Address);

AddressSchema.index({ userId: 1 });
AddressSchema.index({ userId: 1, ciudadId: 1 });
AddressSchema.index({ userId: 1, isDefault: 1 });
