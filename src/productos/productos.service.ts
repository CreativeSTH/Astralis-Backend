import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Producto, ProductoDocument } from './schemas/producto.schema';
import { CreateProductoDto } from './dto/create-producto.dto';
import { UpdateProductoDto } from './dto/update-producto.dto';
import { AddStockDto } from './dto/add-stock.dto';
import { MarcasService } from '../marcas/marcas.service';
import { AcordesService } from '../acordes/acordes.service';

@Injectable()
export class ProductosService {
  constructor(
    @InjectModel(Producto.name)
    private productoModel: Model<ProductoDocument>,
    private marcasService: MarcasService,
    private acordesService: AcordesService,
  ) {}

  async create(createProductoDto: CreateProductoDto): Promise<ProductoDocument> {
    const productoData: any = { ...createProductoDto };

    // Agregar información de marca si existe
    if (createProductoDto.marcaId) {
      const marca = await this.marcasService.findOne(createProductoDto.marcaId);
      productoData.marcaId = new Types.ObjectId(createProductoDto.marcaId);
      productoData.nombreMarca = marca.nombre;
    }

    // Agregar información de acordes si existen
    if (createProductoDto.acordes && createProductoDto.acordes.length > 0) {
      productoData.acordes = await Promise.all(
        createProductoDto.acordes.map(async (acordeDto) => {
          const acorde = await this.acordesService.findOne(acordeDto.acordeId);
          return {
            acordeId: new Types.ObjectId(acordeDto.acordeId),
            nombreAcorde: acorde.nombre,
            porcentaje: acordeDto.porcentaje,
          };
        })
      );
    }

    // Calcular inversión inicial
    productoData.inversionTotal = createProductoDto.precioCompra * createProductoDto.stock;

    const nuevoProducto = new this.productoModel(productoData);
    return nuevoProducto.save();
  }

  async findAll(): Promise<ProductoDocument[]> {
    return this.productoModel
      .find({ activo: true })
      .populate('marcaId', 'nombre')
      .exec();
  }

  async findOne(id: string): Promise<ProductoDocument> {
    const producto = await this.productoModel
      .findById(id)
      .populate('marcaId')
      .exec();
    
    if (!producto) {
      throw new NotFoundException(`Producto con ID ${id} no encontrado`);
    }
    return producto;
  }

  async findConStock(): Promise<ProductoDocument[]> {
    return this.productoModel
      .find({ activo: true, stock: { $gt: 0 } })
      .populate('marcaId', 'nombre')
      .exec();
  }

  async findSinStock(): Promise<ProductoDocument[]> {
    return this.productoModel
      .find({ activo: true, stock: 0 })
      .populate('marcaId', 'nombre')
      .exec();
  }

  async findMasVendidos(limit: number = 5): Promise<ProductoDocument[]> {
    return this.productoModel
      .find({ activo: true })
      .sort({ totalVendido: -1 })
      .limit(limit)
      .populate('marcaId', 'nombre')
      .exec();
  }

  async update(id: string, updateProductoDto: UpdateProductoDto): Promise<ProductoDocument> {
    const updateData: any = { ...updateProductoDto };

    // Actualizar información de marca si cambió
    if (updateProductoDto.marcaId) {
      const marca = await this.marcasService.findOne(updateProductoDto.marcaId);
      updateData.marcaId = new Types.ObjectId(updateProductoDto.marcaId);
      updateData.nombreMarca = marca.nombre;
    }

    // Actualizar información de acordes si cambió
    if (updateProductoDto.acordes) {
      updateData.acordes = await Promise.all(
        updateProductoDto.acordes.map(async (acordeDto) => {
          const acorde = await this.acordesService.findOne(acordeDto.acordeId);
          return {
            acordeId: new Types.ObjectId(acordeDto.acordeId),
            nombreAcorde: acorde.nombre,
            porcentaje: acordeDto.porcentaje,
          };
        })
      );
    }

    const productoActualizado = await this.productoModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .exec();
    
    if (!productoActualizado) {
      throw new NotFoundException(`Producto con ID ${id} no encontrado`);
    }
    return productoActualizado;
  }

  async addStock(id: string, addStockDto: AddStockDto): Promise<ProductoDocument> {
    const producto = await this.findOne(id);

    // Calcular nuevo precio promedio ponderado
    const inversionAnterior = producto.precioCompra * producto.stock;
    const nuevaInversion = addStockDto.precioCompra * addStockDto.cantidad;
    const stockTotal = producto.stock + addStockDto.cantidad;
    
    const nuevoPrecioPromedio = (inversionAnterior + nuevaInversion) / stockTotal;

    // Actualizar producto
    const productoActualizado = await this.productoModel
      .findByIdAndUpdate(
        id,
        {
          stock: stockTotal,
          precioCompra: nuevoPrecioPromedio,
          inversionTotal: producto.inversionTotal + nuevaInversion,
        },
        { new: true }
      )
      .exec();

    if (!productoActualizado) {
      throw new NotFoundException(`Producto con ID ${id} no encontrado`);
    }

    return productoActualizado;
  }

  async remove(id: string): Promise<void> {
    const resultado = await this.productoModel
      .findByIdAndUpdate(id, { activo: false }, { new: true })
      .exec();
    
    if (!resultado) {
      throw new NotFoundException(`Producto con ID ${id} no encontrado`);
    }
  }

  async actualizarStock(id: string, cantidad: number): Promise<ProductoDocument> {
    const producto = await this.findOne(id);

    producto.stock -= cantidad;

    const productoActualizado = await this.productoModel.findByIdAndUpdate(
      id,
      { stock: producto.stock },
      { new: true },
    );

    if (!productoActualizado) {
      throw new NotFoundException('Producto no encontrado al actualizar stock');
    }

    return productoActualizado;
  }


  async incrementarVendido(id: string, cantidad: number): Promise<void> {
    await this.productoModel
      .findByIdAndUpdate(id, { $inc: { totalVendido: cantidad } })
      .exec();
  }

  async getEstadisticas(): Promise<any> {
    const total = await this.productoModel.countDocuments({ activo: true });
    const conStock = await this.productoModel.countDocuments({ activo: true, stock: { $gt: 0 } });
    const sinStock = await this.productoModel.countDocuments({ activo: true, stock: 0 });

    return {
      total,
      conStock,
      sinStock,
    };
  }
}