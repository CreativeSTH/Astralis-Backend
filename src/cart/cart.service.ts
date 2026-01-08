import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';

import { Model, Types } from 'mongoose';

import { Cart, CartDocument, CartItem } from './schemas/cart.schema';
import { Producto, ProductoDocument } from '../productos/schemas/producto.schema';
import { AddItemDto } from './dto/add-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';
import { MergeCartDto } from './dto/merge-cart.dto';

@Injectable()
export class CartService {
  constructor(
    @InjectModel(Cart.name)
    private cartModel: Model<CartDocument>,
    @InjectModel(Producto.name)
    private productoModel: Model<ProductoDocument>,
  ) {}

  async getCart(userId: string): Promise<CartDocument> {
    let cart = await this.cartModel.findOne({ userId: new Types.ObjectId(userId) }).exec();

    if (!cart) {
      cart = new this.cartModel({
        userId: new Types.ObjectId(userId),
        items: [],
        total: 0,
        itemCount: 0,
      });
      await cart.save();
    }

    return cart;
  }

  async addItem(userId: string, addItemDto: AddItemDto): Promise<CartDocument> {
    const { productId, quantity } = addItemDto;

    const product = await this.productoModel
      .findOne({ _id: productId, activo: true, visibleInStore: true })
      .exec();

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (product.stock < quantity) {
      throw new BadRequestException(
        `Insufficient stock. Available: ${product.stock}`,
      );
    }

    let cart = await this.cartModel.findOne({ userId: new Types.ObjectId(userId) }).exec();

    if (!cart) {
      cart = new this.cartModel({
        userId: new Types.ObjectId(userId),
        items: [],
        total: 0,
        itemCount: 0,
      });
    }

    const existingItemIndex = cart.items.findIndex(
      (item) => item.productId.toString() === productId,
    );

    if (existingItemIndex > -1) {
      const newQuantity = cart.items[existingItemIndex].quantity + quantity;

      if (product.stock < newQuantity) {
        throw new BadRequestException(
          `Insufficient stock. Available: ${product.stock}, In cart: ${cart.items[existingItemIndex].quantity}`,
        );
      }

      cart.items[existingItemIndex].quantity = newQuantity;
      cart.items[existingItemIndex].subtotal = newQuantity * product.precioVenta;
    } else {
      const newItem: CartItem = {
        productId: new Types.ObjectId(productId),
        productName: product.nombre,
        quantity,
        unitPrice: product.precioVenta,
        subtotal: quantity * product.precioVenta,
        image: product.imagen || '',
      };
      cart.items.push(newItem);
    }

    this.recalculateTotals(cart);
    await cart.save();

    return cart;
  }

  async updateItem(
    userId: string,
    productId: string,
    updateItemDto: UpdateItemDto,
  ): Promise<CartDocument> {
    const { quantity } = updateItemDto;

    const product = await this.productoModel
      .findOne({ _id: productId, activo: true })
      .exec();

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (product.stock < quantity) {
      throw new BadRequestException(
        `Insufficient stock. Available: ${product.stock}`,
      );
    }

    const cart = await this.cartModel.findOne({ userId: new Types.ObjectId(userId) }).exec();

    if (!cart) {
      throw new NotFoundException('Cart not found');
    }

    const itemIndex = cart.items.findIndex(
      (item) => item.productId.toString() === productId,
    );

    if (itemIndex === -1) {
      throw new NotFoundException('Item not found in cart');
    }

    cart.items[itemIndex].quantity = quantity;
    cart.items[itemIndex].unitPrice = product.precioVenta;
    cart.items[itemIndex].subtotal = quantity * product.precioVenta;

    this.recalculateTotals(cart);
    await cart.save();

    return cart;
  }

  async removeItem(userId: string, productId: string): Promise<CartDocument> {
    const cart = await this.cartModel.findOne({ userId: new Types.ObjectId(userId) }).exec();

    if (!cart) {
      throw new NotFoundException('Cart not found');
    }

    const itemIndex = cart.items.findIndex(
      (item) => item.productId.toString() === productId,
    );

    if (itemIndex === -1) {
      throw new NotFoundException('Item not found in cart');
    }

    cart.items.splice(itemIndex, 1);

    this.recalculateTotals(cart);
    await cart.save();

    return cart;
  }

  async clearCart(userId: string): Promise<CartDocument> {
    const cart = await this.cartModel.findOne({ userId: new Types.ObjectId(userId) }).exec();

    if (!cart) {
      throw new NotFoundException('Cart not found');
    }

    cart.items = [];
    cart.total = 0;
    cart.itemCount = 0;

    await cart.save();

    return cart;
  }

  async mergeCart(userId: string, mergeCartDto: MergeCartDto): Promise<CartDocument> {
    const { items } = mergeCartDto;

    let cart = await this.cartModel.findOne({ userId: new Types.ObjectId(userId) }).exec();

    if (!cart) {
      cart = new this.cartModel({
        userId: new Types.ObjectId(userId),
        items: [],
        total: 0,
        itemCount: 0,
      });
    }

    for (const item of items) {
      const product = await this.productoModel
        .findOne({ _id: item.productId, activo: true, visibleInStore: true })
        .exec();

      if (!product) continue;

      const existingItemIndex = cart.items.findIndex(
        (cartItem) => cartItem.productId.toString() === item.productId,
      );

      const quantityToAdd = Math.min(item.quantity, product.stock);

      if (quantityToAdd <= 0) continue;

      if (existingItemIndex > -1) {
        const newQuantity = Math.min(
          cart.items[existingItemIndex].quantity + quantityToAdd,
          product.stock,
        );
        cart.items[existingItemIndex].quantity = newQuantity;
        cart.items[existingItemIndex].unitPrice = product.precioVenta;
        cart.items[existingItemIndex].subtotal = newQuantity * product.precioVenta;
      } else {
        cart.items.push({
          productId: new Types.ObjectId(item.productId),
          productName: product.nombre,
          quantity: quantityToAdd,
          unitPrice: product.precioVenta,
          subtotal: quantityToAdd * product.precioVenta,
          image: product.imagen || '',
        });
      }
    }

    this.recalculateTotals(cart);
    await cart.save();

    return cart;
  }

  async validateCartStock(userId: string): Promise<{
    valid: boolean;
    invalidItems: Array<{ productId: string; productName: string; requested: number; available: number }>;
  }> {
    const cart = await this.cartModel.findOne({ userId: new Types.ObjectId(userId) }).exec();

    if (!cart || cart.items.length === 0) {
      return { valid: true, invalidItems: [] };
    }

    const invalidItems: Array<{
      productId: string;
      productName: string;
      requested: number;
      available: number;
    }> = [];

    for (const item of cart.items) {
      const product = await this.productoModel
        .findOne({ _id: item.productId, activo: true })
        .exec();

      if (!product || product.stock < item.quantity) {
        invalidItems.push({
          productId: item.productId.toString(),
          productName: item.productName,
          requested: item.quantity,
          available: product?.stock || 0,
        });
      }
    }

    return {
      valid: invalidItems.length === 0,
      invalidItems,
    };
  }

  private recalculateTotals(cart: CartDocument): void {
    cart.total = cart.items.reduce((sum, item) => sum + item.subtotal, 0);
    cart.itemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);
  }
}
