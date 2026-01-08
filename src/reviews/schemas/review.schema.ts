import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ReviewDocument = Review & Document;

export enum ReviewStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

@Schema({ timestamps: true })
export class Review {
  _id?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Producto', required: true })
  productoId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Usuario', required: true })
  userId: Types.ObjectId;

  @Prop({ required: true })
  userName: string;

  @Prop({ type: Types.ObjectId, ref: 'Order' })
  orderId?: Types.ObjectId;

  @Prop({ required: true, min: 1, max: 5 })
  rating: number;

  @Prop({ maxlength: 500 })
  title?: string;

  @Prop({ maxlength: 2000 })
  comment?: string;

  @Prop({ type: [String], default: [] })
  images: string[];

  @Prop({ default: false })
  verifiedPurchase: boolean;

  @Prop({ type: String, enum: ReviewStatus, default: ReviewStatus.APPROVED })
  status: ReviewStatus;

  @Prop({ default: 0 })
  helpfulCount: number;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Usuario' }], default: [] })
  helpfulVotes: Types.ObjectId[];

  @Prop()
  adminResponse?: string;

  @Prop({ type: Date })
  adminResponseAt?: Date;

  @Prop({ default: true })
  activo: boolean;
}

export const ReviewSchema = SchemaFactory.createForClass(Review);

// Index para búsqueda por producto
ReviewSchema.index({ productoId: 1, status: 1 });
// Index para búsqueda por usuario
ReviewSchema.index({ userId: 1 });
// Index único para evitar múltiples reviews del mismo usuario en el mismo producto
ReviewSchema.index({ productoId: 1, userId: 1 }, { unique: true });
