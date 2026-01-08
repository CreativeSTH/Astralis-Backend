import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type WishlistDocument = Wishlist & Document;

@Schema()
export class WishlistItem {
  @Prop({ type: Types.ObjectId, ref: 'Producto', required: true })
  productoId: Types.ObjectId;

  @Prop({ required: true })
  nombre: string;

  @Prop()
  imagen: string;

  @Prop({ required: true })
  precio: number;

  @Prop({ type: Date, default: Date.now })
  addedAt: Date;
}

const WishlistItemSchema = SchemaFactory.createForClass(WishlistItem);

@Schema({ timestamps: true })
export class Wishlist {
  _id?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Usuario', required: true, unique: true })
  userId: Types.ObjectId;

  @Prop({ type: [WishlistItemSchema], default: [] })
  items: WishlistItem[];
}

export const WishlistSchema = SchemaFactory.createForClass(Wishlist);

// Index para búsqueda por usuario
WishlistSchema.index({ userId: 1 });
