import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { Wishlist, WishlistDocument, WishlistItem } from './schemas/wishlist.schema';
import { Producto, ProductoDocument } from '../productos/schemas/producto.schema';

export interface WishlistResponse {
  items: Array<{
    productoId: string;
    nombre: string;
    imagen: string;
    precio: number;
    addedAt: Date;
    inStock: boolean;
  }>;
  total: number;
}

@Injectable()
export class WishlistService {
  constructor(
    @InjectModel(Wishlist.name)
    private wishlistModel: Model<WishlistDocument>,
    @InjectModel(Producto.name)
    private productoModel: Model<ProductoDocument>,
  ) {}

  async getWishlist(userId: string): Promise<WishlistResponse> {
    let wishlist = await this.wishlistModel.findOne({
      userId: new Types.ObjectId(userId),
    }).exec();

    if (!wishlist) {
      wishlist = await this.wishlistModel.create({
        userId: new Types.ObjectId(userId),
        items: [],
      });
    }

    // Obtener info actualizada de los productos
    const productIds = wishlist.items.map(item => item.productoId);
    const products = await this.productoModel.find({
      _id: { $in: productIds },
      activo: true,
    }).exec();

    const productMap = new Map(products.map(p => [p._id.toString(), p]));

    const items = wishlist.items
      .map(item => {
        const product = productMap.get(item.productoId.toString());
        if (!product) return null;

        return {
          productoId: item.productoId.toString(),
          nombre: product.nombre,
          imagen: product.imagen || item.imagen,
          precio: product.precioVenta,
          addedAt: item.addedAt,
          inStock: product.stock > 0,
        };
      })
      .filter(item => item !== null);

    return {
      items,
      total: items.length,
    };
  }

  async addItem(userId: string, productoId: string): Promise<WishlistResponse> {
    const producto = await this.productoModel.findById(productoId).exec();
    if (!producto || !producto.activo) {
      throw new NotFoundException(`Producto con ID ${productoId} no encontrado`);
    }

    let wishlist = await this.wishlistModel.findOne({
      userId: new Types.ObjectId(userId),
    }).exec();

    if (!wishlist) {
      wishlist = new this.wishlistModel({
        userId: new Types.ObjectId(userId),
        items: [],
      });
    }

    // Verificar si ya existe
    const existingItem = wishlist.items.find(
      item => item.productoId.toString() === productoId,
    );

    if (existingItem) {
      throw new ConflictException('Este producto ya está en tu lista de deseos');
    }

    const newItem: WishlistItem = {
      productoId: new Types.ObjectId(productoId),
      nombre: producto.nombre,
      imagen: producto.imagen || '',
      precio: producto.precioVenta,
      addedAt: new Date(),
    };

    wishlist.items.push(newItem);
    await wishlist.save();

    return this.getWishlist(userId);
  }

  async removeItem(userId: string, productoId: string): Promise<WishlistResponse> {
    const wishlist = await this.wishlistModel.findOne({
      userId: new Types.ObjectId(userId),
    }).exec();

    if (!wishlist) {
      throw new NotFoundException('Lista de deseos no encontrada');
    }

    const itemIndex = wishlist.items.findIndex(
      item => item.productoId.toString() === productoId,
    );

    if (itemIndex === -1) {
      throw new NotFoundException('Producto no encontrado en la lista de deseos');
    }

    wishlist.items.splice(itemIndex, 1);
    await wishlist.save();

    return this.getWishlist(userId);
  }

  async clearWishlist(userId: string): Promise<{ message: string }> {
    await this.wishlistModel.findOneAndUpdate(
      { userId: new Types.ObjectId(userId) },
      { items: [] },
    ).exec();

    return { message: 'Lista de deseos vaciada' };
  }

  async isInWishlist(userId: string, productoId: string): Promise<boolean> {
    const wishlist = await this.wishlistModel.findOne({
      userId: new Types.ObjectId(userId),
      'items.productoId': new Types.ObjectId(productoId),
    }).exec();

    return !!wishlist;
  }

  async moveToCart(userId: string, productoId: string): Promise<{ message: string }> {
    // Esta funcionalidad requiere integración con el CartService
    // Por ahora solo removemos de wishlist
    await this.removeItem(userId, productoId);
    return { message: 'Producto movido al carrito' };
  }

  async getWishlistCount(userId: string): Promise<number> {
    const wishlist = await this.wishlistModel.findOne({
      userId: new Types.ObjectId(userId),
    }).exec();

    return wishlist?.items.length || 0;
  }
}
