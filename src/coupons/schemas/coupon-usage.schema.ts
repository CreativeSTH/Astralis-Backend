import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type CouponUsageDocument = CouponUsage & Document;

@Schema({ timestamps: true })
export class CouponUsage {
  _id?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Coupon', required: true })
  couponId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Usuario', required: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Order', required: true })
  orderId: Types.ObjectId;

  @Prop({ required: true })
  discountApplied: number;

  @Prop({ required: true })
  orderTotal: number;
}

export const CouponUsageSchema = SchemaFactory.createForClass(CouponUsage);

// Index para buscar usos por cupón y usuario
CouponUsageSchema.index({ couponId: 1, userId: 1 });
