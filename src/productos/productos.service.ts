import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Producto, ProductoDocument } from './schemas/producto.schema';
import { CreateProductoDto } from './dto/create-producto.dto';
import { UpdateProductoDto } from './dto/update-producto.dto';

@Injectable()
export class ProductosService {
  constructor(
    @InjectModel(Producto.name)
    private productoModel: Model<ProductoDocument>,
  ) {}

  async create(createProductoDto: CreateProductoDto): Promise<Producto> {
    const nuevoProducto = new this.productoModel(createProductoDto);
    return nuevoProducto.save();
  }

  async findAll(): Promise<Producto[]> {
    return this.productoModel.find({ activo: true }).exec();
  }

  async findOne(id: string): Promise<Producto> {
    const producto = await this.productoModel.findById(id).exec();
    if (!producto) {
      throw new NotFoundException(`Producto con ID ${id} no encontrado`);
    }
    return producto;
  }

  async update(
    id: string,
    updateProductoDto: UpdateProductoDto,
  ): Promise<Producto> {
    const productoActualizado = await this.productoModel
      .findByIdAndUpdate(id, updateProductoDto, { new: true })
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

    async actualizarStock(id: string, cantidad: number): Promise<Producto> {
        const producto = await this.findOne(id); // aquí ya garantizas que existe

        producto.stock -= cantidad;

        const actualizado = await this.productoModel
            .findByIdAndUpdate<ProductoDocument>(id, { stock: producto.stock }, { new: true })
            .exec();

        // TS aún cree que puede ser null → validación necesaria
        if (!actualizado) {
            // esto nunca debería pasar, pero TS necesita verlo
            throw new NotFoundException(`Producto con ID ${id} no encontrado`);
        }

        return actualizado;
    }
}