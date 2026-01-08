import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';

import { Model, FilterQuery } from 'mongoose';

import { Producto, ProductoDocument } from '../productos/schemas/producto.schema';
import { Marca, MarcaDocument } from '../marcas/schemas/marca.schema';
import { CatalogQueryDto } from './dto/catalog-query.dto';

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export interface PublicProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  type: string;
  brandId: string | null;
  brandName: string;
  image: string;
  acordes: Array<{ name: string; percentage: number }>;
  featured: boolean;
  inStock: boolean;
}

@Injectable()
export class CatalogService {
  constructor(
    @InjectModel(Producto.name)
    private productoModel: Model<ProductoDocument>,
    @InjectModel(Marca.name)
    private marcaModel: Model<MarcaDocument>,
  ) {}

  async findAll(query: CatalogQueryDto): Promise<PaginatedResponse<PublicProduct>> {
    const {
      search,
      brandId,
      type,
      minPrice,
      maxPrice,
      page = 1,
      limit = 12,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const filter: FilterQuery<ProductoDocument> = {
      activo: true,
      visibleInStore: true,
    };

    if (search) {
      filter.$or = [
        { nombre: { $regex: search, $options: 'i' } },
        { descripcion: { $regex: search, $options: 'i' } },
        { nombreMarca: { $regex: search, $options: 'i' } },
      ];
    }

    if (brandId) {
      filter.marcaId = brandId;
    }

    if (type) {
      filter.tipo = type;
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      filter.precioVenta = {};
      if (minPrice !== undefined) filter.precioVenta.$gte = minPrice;
      if (maxPrice !== undefined) filter.precioVenta.$lte = maxPrice;
    }

    const sortField = this.mapSortField(sortBy);
    const sort: Record<string, 1 | -1> = { [sortField]: sortOrder === 'asc' ? 1 : -1 };

    const skip = (page - 1) * limit;

    const [products, total] = await Promise.all([
      this.productoModel
        .find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .exec(),
      this.productoModel.countDocuments(filter).exec(),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data: products.map(this.mapToPublicProduct),
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }

  async findOne(id: string): Promise<PublicProduct> {
    const product = await this.productoModel
      .findOne({ _id: id, activo: true, visibleInStore: true })
      .exec();

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return this.mapToPublicProduct(product);
  }

  async findFeatured(limit: number = 8): Promise<PublicProduct[]> {
    const products = await this.productoModel
      .find({ activo: true, visibleInStore: true, featured: true })
      .limit(limit)
      .exec();

    return products.map(this.mapToPublicProduct);
  }

  async findBestSellers(limit: number = 8): Promise<PublicProduct[]> {
    const products = await this.productoModel
      .find({ activo: true, visibleInStore: true, stock: { $gt: 0 } })
      .sort({ totalVendido: -1 })
      .limit(limit)
      .exec();

    return products.map(this.mapToPublicProduct);
  }

  async findBrands(): Promise<Array<{ id: string; name: string; logo: string }>> {
    // Get brands that have at least one visible product
    const brandsWithProducts = await this.productoModel.distinct('marcaId', {
      activo: true,
      visibleInStore: true,
      marcaId: { $ne: null },
    });

    const brands = await this.marcaModel
      .find({ _id: { $in: brandsWithProducts }, activo: true })
      .exec();

    return brands.map((brand) => ({
      id: brand._id.toString(),
      name: brand.nombre,
      logo: brand.logo || '',
    }));
  }

  async checkStock(productId: string, quantity: number): Promise<{ available: boolean; stock: number }> {
    const product = await this.productoModel
      .findOne({ _id: productId, activo: true, visibleInStore: true })
      .select('stock')
      .exec();

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return {
      available: product.stock >= quantity,
      stock: product.stock,
    };
  }

  private mapSortField(sortBy: string): string {
    const fieldMap: Record<string, string> = {
      price: 'precioVenta',
      name: 'nombre',
      createdAt: 'createdAt',
      totalVendido: 'totalVendido',
    };
    return fieldMap[sortBy] || 'createdAt';
  }

  private mapToPublicProduct(product: ProductoDocument): PublicProduct {
    return {
      id: product._id.toString(),
      name: product.nombre,
      description: product.descripcion || '',
      price: product.precioVenta,
      stock: product.stock,
      type: product.tipo,
      brandId: product.marcaId?.toString() || null,
      brandName: product.nombreMarca || '',
      image: product.imagen || '',
      acordes: product.acordes?.map((a) => ({
        name: a.nombreAcorde,
        percentage: a.porcentaje,
      })) || [],
      featured: product.featured || false,
      inStock: product.stock > 0,
    };
  }
}
