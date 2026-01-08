import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { Coupon, CouponDocument, CouponStatus, DiscountType } from './schemas/coupon.schema';
import { CouponUsage, CouponUsageDocument } from './schemas/coupon-usage.schema';
import { CreateCouponDto, UpdateCouponDto, ApplyCouponDto, CartItemDto } from './dto';

export interface CouponValidationResult {
  valid: boolean;
  coupon?: CouponDocument;
  discount: number;
  message: string;
  applicableItems?: string[];
}

export interface AppliedCouponResult {
  code: string;
  discountType: DiscountType;
  discountValue: number;
  discountAmount: number;
  applicableItems: string[];
}

@Injectable()
export class CouponsService {
  constructor(
    @InjectModel(Coupon.name)
    private couponModel: Model<CouponDocument>,
    @InjectModel(CouponUsage.name)
    private couponUsageModel: Model<CouponUsageDocument>,
  ) {}

  async create(createCouponDto: CreateCouponDto): Promise<CouponDocument> {
    const existingCoupon = await this.couponModel.findOne({
      code: createCouponDto.code.toUpperCase(),
    });

    if (existingCoupon) {
      throw new ConflictException(`Ya existe un cupón con el código ${createCouponDto.code}`);
    }

    if (createCouponDto.discountType === DiscountType.PERCENTAGE && createCouponDto.discountValue > 100) {
      throw new BadRequestException('El descuento porcentual no puede ser mayor a 100%');
    }

    if (new Date(createCouponDto.endDate) <= new Date(createCouponDto.startDate)) {
      throw new BadRequestException('La fecha de fin debe ser posterior a la fecha de inicio');
    }

    const coupon = new this.couponModel({
      ...createCouponDto,
      code: createCouponDto.code.toUpperCase(),
      applicableProducts: createCouponDto.applicableProducts?.map(id => new Types.ObjectId(id)) || [],
      applicableBrands: createCouponDto.applicableBrands?.map(id => new Types.ObjectId(id)) || [],
    });

    return coupon.save();
  }

  async findAll(): Promise<CouponDocument[]> {
    return this.couponModel.find({ activo: true }).sort({ createdAt: -1 }).exec();
  }

  async findOne(id: string): Promise<CouponDocument> {
    const coupon = await this.couponModel.findById(id).exec();
    if (!coupon) {
      throw new NotFoundException(`Cupón con ID ${id} no encontrado`);
    }
    return coupon;
  }

  async findByCode(code: string): Promise<CouponDocument> {
    const coupon = await this.couponModel.findOne({
      code: code.toUpperCase(),
      activo: true,
    }).exec();

    if (!coupon) {
      throw new NotFoundException(`Cupón ${code} no encontrado`);
    }
    return coupon;
  }

  async update(id: string, updateCouponDto: UpdateCouponDto): Promise<CouponDocument> {
    if (updateCouponDto.code) {
      const existingCoupon = await this.couponModel.findOne({
        code: updateCouponDto.code.toUpperCase(),
        _id: { $ne: id },
      });

      if (existingCoupon) {
        throw new ConflictException(`Ya existe un cupón con el código ${updateCouponDto.code}`);
      }
    }

    const updated = await this.couponModel
      .findByIdAndUpdate(
        id,
        {
          ...updateCouponDto,
          code: updateCouponDto.code?.toUpperCase(),
        },
        { new: true },
      )
      .exec();

    if (!updated) {
      throw new NotFoundException(`Cupón con ID ${id} no encontrado`);
    }

    return updated;
  }

  async remove(id: string): Promise<void> {
    const result = await this.couponModel.findByIdAndUpdate(id, { activo: false }).exec();
    if (!result) {
      throw new NotFoundException(`Cupón con ID ${id} no encontrado`);
    }
  }

  async validateCoupon(
    code: string,
    userId: string,
    items: CartItemDto[],
    subtotal: number,
  ): Promise<CouponValidationResult> {
    const coupon = await this.couponModel.findOne({
      code: code.toUpperCase(),
      activo: true,
    }).exec();

    if (!coupon) {
      return { valid: false, discount: 0, message: 'Cupón no encontrado' };
    }

    // Verificar estado
    if (coupon.status !== CouponStatus.ACTIVE) {
      return { valid: false, discount: 0, message: 'Este cupón no está activo' };
    }

    // Verificar fechas
    const now = new Date();
    if (now < coupon.startDate) {
      return { valid: false, discount: 0, message: 'Este cupón aún no está vigente' };
    }
    if (now > coupon.endDate) {
      return { valid: false, discount: 0, message: 'Este cupón ha expirado' };
    }

    // Verificar límite de uso global
    if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
      return { valid: false, discount: 0, message: 'Este cupón ha alcanzado su límite de usos' };
    }

    // Verificar límite de uso por usuario
    if (coupon.usageLimitPerUser) {
      const userUsageCount = await this.couponUsageModel.countDocuments({
        couponId: coupon._id,
        userId: new Types.ObjectId(userId),
      });

      if (userUsageCount >= coupon.usageLimitPerUser) {
        return { valid: false, discount: 0, message: 'Ya has usado este cupón el máximo de veces permitidas' };
      }
    }

    // Verificar usuario excluido
    if (coupon.excludedUsers.some(id => id.toString() === userId)) {
      return { valid: false, discount: 0, message: 'No puedes usar este cupón' };
    }

    // Verificar primera compra
    if (coupon.firstPurchaseOnly) {
      const previousPurchases = await this.couponUsageModel.countDocuments({
        userId: new Types.ObjectId(userId),
      });
      if (previousPurchases > 0) {
        return { valid: false, discount: 0, message: 'Este cupón es solo para primera compra' };
      }
    }

    // Verificar monto mínimo
    if (coupon.minPurchaseAmount && subtotal < coupon.minPurchaseAmount) {
      return {
        valid: false,
        discount: 0,
        message: `El monto mínimo de compra es $${coupon.minPurchaseAmount.toLocaleString()}`,
      };
    }

    // Calcular productos aplicables
    const applicableItems = this.getApplicableItems(coupon, items);

    if (applicableItems.length === 0 && (
      coupon.applicableProducts.length > 0 ||
      coupon.applicableCategories.length > 0 ||
      coupon.applicableBrands.length > 0
    )) {
      return {
        valid: false,
        discount: 0,
        message: 'Este cupón no aplica a los productos en tu carrito',
      };
    }

    // Calcular descuento
    const applicableSubtotal = this.calculateApplicableSubtotal(items, applicableItems);
    const discount = this.calculateDiscount(coupon, applicableSubtotal);

    return {
      valid: true,
      coupon,
      discount,
      message: 'Cupón válido',
      applicableItems,
    };
  }

  async applyCoupon(
    applyDto: ApplyCouponDto,
    userId: string,
  ): Promise<AppliedCouponResult> {
    const validation = await this.validateCoupon(
      applyDto.code,
      userId,
      applyDto.items,
      applyDto.subtotal,
    );

    if (!validation.valid) {
      throw new BadRequestException(validation.message);
    }

    const coupon = validation.coupon!;

    return {
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      discountAmount: validation.discount,
      applicableItems: validation.applicableItems || [],
    };
  }

  async recordUsage(
    couponId: string,
    userId: string,
    orderId: string,
    discountApplied: number,
    orderTotal: number,
  ): Promise<void> {
    // Registrar uso
    await this.couponUsageModel.create({
      couponId: new Types.ObjectId(couponId),
      userId: new Types.ObjectId(userId),
      orderId: new Types.ObjectId(orderId),
      discountApplied,
      orderTotal,
    });

    // Incrementar contador de uso
    await this.couponModel.findByIdAndUpdate(couponId, {
      $inc: { usageCount: 1 },
    });
  }

  async getUsageStats(couponId: string): Promise<{
    totalUses: number;
    totalDiscount: number;
    uniqueUsers: number;
  }> {
    const stats = await this.couponUsageModel.aggregate([
      { $match: { couponId: new Types.ObjectId(couponId) } },
      {
        $group: {
          _id: null,
          totalUses: { $sum: 1 },
          totalDiscount: { $sum: '$discountApplied' },
          uniqueUsers: { $addToSet: '$userId' },
        },
      },
      {
        $project: {
          totalUses: 1,
          totalDiscount: 1,
          uniqueUsers: { $size: '$uniqueUsers' },
        },
      },
    ]);

    return stats[0] || { totalUses: 0, totalDiscount: 0, uniqueUsers: 0 };
  }

  async updateExpiredCoupons(): Promise<number> {
    const result = await this.couponModel.updateMany(
      {
        status: CouponStatus.ACTIVE,
        endDate: { $lt: new Date() },
      },
      {
        status: CouponStatus.EXPIRED,
      },
    );

    return result.modifiedCount;
  }

  private getApplicableItems(coupon: CouponDocument, items: CartItemDto[]): string[] {
    // Si no hay restricciones, todos los items aplican
    if (
      coupon.applicableProducts.length === 0 &&
      coupon.applicableCategories.length === 0 &&
      coupon.applicableBrands.length === 0
    ) {
      return items.map(item => item.productoId);
    }

    return items
      .filter(item => {
        // Verificar si el producto está en la lista
        if (coupon.applicableProducts.length > 0) {
          if (coupon.applicableProducts.some(id => id.toString() === item.productoId)) {
            return true;
          }
        }

        // Verificar si la categoría está en la lista
        if (coupon.applicableCategories.length > 0 && item.categoria) {
          if (coupon.applicableCategories.includes(item.categoria)) {
            return true;
          }
        }

        // Verificar si la marca está en la lista
        if (coupon.applicableBrands.length > 0 && item.marcaId) {
          if (coupon.applicableBrands.some(id => id.toString() === item.marcaId)) {
            return true;
          }
        }

        return false;
      })
      .map(item => item.productoId);
  }

  private calculateApplicableSubtotal(items: CartItemDto[], applicableItems: string[]): number {
    return items
      .filter(item => applicableItems.includes(item.productoId))
      .reduce((sum, item) => sum + item.precioUnitario * item.cantidad, 0);
  }

  private calculateDiscount(coupon: CouponDocument, applicableSubtotal: number): number {
    let discount = 0;

    if (coupon.discountType === DiscountType.PERCENTAGE) {
      discount = (applicableSubtotal * coupon.discountValue) / 100;
    } else {
      discount = coupon.discountValue;
    }

    // Aplicar límite máximo de descuento si existe
    if (coupon.maxDiscountAmount && discount > coupon.maxDiscountAmount) {
      discount = coupon.maxDiscountAmount;
    }

    // El descuento no puede ser mayor que el subtotal aplicable
    if (discount > applicableSubtotal) {
      discount = applicableSubtotal;
    }

    return Math.round(discount);
  }
}
