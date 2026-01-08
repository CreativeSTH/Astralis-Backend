import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type CouponDocument = Coupon & Document;

export enum DiscountType {
  PERCENTAGE = 'PERCENTAGE',
  FIXED_AMOUNT = 'FIXED_AMOUNT',
}

export enum CouponStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  EXPIRED = 'EXPIRED',
}

@Schema({ timestamps: true })
export class Coupon {
  _id?: Types.ObjectId;

  @Prop({ required: true, unique: true, uppercase: true, trim: true })
  code: string;

  @Prop({ required: true })
  description: string;

  @Prop({ type: String, enum: DiscountType, required: true })
  discountType: DiscountType;

  @Prop({ required: true, min: 0 })
  discountValue: number;

  @Prop({ default: 0 })
  minPurchaseAmount: number;

  @Prop({ default: null })
  maxDiscountAmount: number;

  @Prop({ type: Date, required: true })
  startDate: Date;

  @Prop({ type: Date, required: true })
  endDate: Date;

  @Prop({ default: null })
  usageLimit: number;

  @Prop({ default: 0 })
  usageCount: number;

  @Prop({ default: null })
  usageLimitPerUser: number;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Producto' }], default: [] })
  applicableProducts: Types.ObjectId[];

  @Prop({ type: [String], default: [] })
  applicableCategories: string[];

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Marca' }], default: [] })
  applicableBrands: Types.ObjectId[];

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Usuario' }], default: [] })
  excludedUsers: Types.ObjectId[];

  @Prop({ default: true })
  firstPurchaseOnly: boolean;

  @Prop({ type: String, enum: CouponStatus, default: CouponStatus.ACTIVE })
  status: CouponStatus;

  @Prop({ default: true })
  activo: boolean;
}

export const CouponSchema = SchemaFactory.createForClass(Coupon);

// Index para búsqueda por código
CouponSchema.index({ code: 1 });
// Index para cupones activos y vigentes
CouponSchema.index({ status: 1, startDate: 1, endDate: 1 });
